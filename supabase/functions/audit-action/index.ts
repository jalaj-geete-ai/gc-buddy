// audit-action — server-enforced Approve/Reject, callable only with valid Audit
// Portal credentials (role='audit' in the CRM). Two targets:
//   • admission_id  → enrolment payment terms (initial Payment Receipt)
//   • receipt_id    → an additional payment-receipt request (payment_receipts row)
// On approve it assigns a per-student receipt number (roll + running serial) and
// generates the corresponding PDF; on reject it records the reason.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const GCB_URL = Deno.env.get('SUPABASE_URL')!
const GCB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // valid JWT for the generate-document call
const CRM_URL = 'https://lrcimdchhbsgbnvdmpwd.supabase.co'
const CRM_KEY = Deno.env.get('CRM_SERVICE_ROLE_KEY') ?? ''
const DOC_FN_URL = `${GCB_URL.replace('supabase.co', 'functions.supabase.co')}/generate-document`
const DOC_HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${GCB_KEY}` }

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

async function crm(path: string, init: RequestInit = {}) {
  return fetch(`${CRM_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

// Per-student receipt number = roll + running serial (roll-0001, -0002, ...).
async function nextReceiptNo(admissionId: number | string, fallbackRoll: string): Promise<string> {
  try {
    const res = await crm('rpc/next_receipt_no', { method: 'POST', body: JSON.stringify({ p_admission_id: admissionId }) })
    const rn = await res.json()
    if (typeof rn === 'string' && rn) return rn
  } catch (_e) { /* fall back */ }
  return fallbackRoll
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return j({ success: false, error: 'method' }, 405)
  if (!CRM_KEY) return j({ success: false, error: 'CRM key not configured' }, 500)

  try {
    const { action, admission_id, receipt_id, reject_reason, token } = await req.json()
    if (!token) return j({ success: false, error: 'auth required' }, 401)
    if (!['approve', 'reject'].includes(action)) return j({ success: false, error: 'bad request' }, 400)
    if (!admission_id && !receipt_id) return j({ success: false, error: 'admission_id or receipt_id required' }, 400)

    // Validate the caller's session token and require the audit role
    const vRes = await crm('rpc/validate_session', { method: 'POST', body: JSON.stringify({ p_token: token }) })
    const v = await vRes.json()
    if (!v || v.role !== 'audit') return j({ success: false, error: 'not authorised' }, 401)
    const reviewer = v.name
    const now = new Date().toISOString()

    // ---------- Additional payment-receipt request ----------
    if (receipt_id) {
      const prRes = await crm(`payment_receipts?id=eq.${receipt_id}&select=*`)
      const prRows = await prRes.json()
      if (!Array.isArray(prRows) || prRows.length === 0) return j({ success: false, error: 'receipt request not found' }, 404)
      const rec = prRows[0]

      if (action === 'reject') {
        await crm(`payment_receipts?id=eq.${receipt_id}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'rejected', reject_reason: reject_reason ?? null, reviewed_by: reviewer, reviewed_at: now }),
        })
        return j({ success: true, action: 'rejected', receipt_id })
      }

      // approve
      const admRes = await crm(`admissions?id=eq.${rec.admission_id}&select=*`)
      const admRows = await admRes.json()
      const admission = (Array.isArray(admRows) && admRows[0]) ? admRows[0] : null
      if (!admission) return j({ success: false, error: 'admission not found' }, 404)

      const receiptNo = await nextReceiptNo(rec.admission_id, String(rec.roll_number ?? admission.roll_number ?? rec.admission_id))

      // Running totals: enrolment down-payment + previously approved extras + this one.
      const pfee = Number(admission.program_fee ?? 0)
      const collected = Number(admission.collected_amount ?? 0)
      let approvedSum = 0
      try {
        const sRes = await crm(`payment_receipts?admission_id=eq.${rec.admission_id}&status=eq.approved&select=amount`)
        const sRows = await sRes.json()
        if (Array.isArray(sRows)) approvedSum = sRows.reduce((s: number, r: { amount?: number }) => s + Number(r.amount ?? 0), 0)
      } catch (_e) { /* ignore */ }
      const thisAmt = Number(rec.amount ?? 0)
      const totalPaid = collected + approvedSum + thisAmt
      const balance = pfee - totalPaid

      await crm(`payment_receipts?id=eq.${receipt_id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'approved', receipt_no: receiptNo, reviewed_by: reviewer, reviewed_at: now }),
      })

      const docRes = await fetch(DOC_FN_URL, {
        method: 'POST', headers: DOC_HEADERS,
        body: JSON.stringify({
          admission, type: 'payment',
          payment_receipt: { ...rec, receipt_no: receiptNo },
          totals: { program_fee: pfee, total_paid: totalPaid, balance },
        }),
      })
      const doc = await docRes.json()

      if (doc && doc.doc_url) {
        await crm(`payment_receipts?id=eq.${receipt_id}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ receipt_url: doc.doc_url, generated_at: now }),
        })
      }
      return j({ success: true, action: 'approved', receipt_no: receiptNo, document: doc })
    }

    // ---------- Enrolment admission (initial receipt) ----------
    const admRes = await crm(`admissions?id=eq.${admission_id}&select=*`)
    const admRows = await admRes.json()
    if (!Array.isArray(admRows) || admRows.length === 0) return j({ success: false, error: 'admission not found' }, 404)
    const admission = admRows[0]

    if (action === 'reject') {
      await crm(`admissions?id=eq.${admission_id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ payment_status: 'rejected', reject_reason: reject_reason ?? null, payment_reviewed_by: reviewer, payment_reviewed_at: now }),
      })
      return j({ success: true, action: 'rejected' })
    }

    // approve — per-student receipt number (roll-0001 for the enrolment receipt)
    const receiptNo = await nextReceiptNo(admission_id, String(admission.roll_number ?? admission_id))

    await crm(`admissions?id=eq.${admission_id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ payment_status: 'approved', receipt_no: receiptNo, payment_reviewed_by: reviewer, payment_reviewed_at: now }),
    })

    admission.receipt_no = receiptNo
    admission.payment_status = 'approved'
    const docRes = await fetch(DOC_FN_URL, {
      method: 'POST', headers: DOC_HEADERS,
      body: JSON.stringify({ admission, type: 'receipt' }),
    })
    const doc = await docRes.json()

    return j({ success: true, action: 'approved', receipt_no: receiptNo, document: doc })
  } catch (e) {
    return j({ success: false, error: String(e) }, 500)
  }
})
