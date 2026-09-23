// audit-action — server-enforced Approve/Reject for admission payment terms,
// callable only with valid Audit Portal credentials (role='audit' in the CRM).
// On approve: assigns a Payment Receipt number (roll + serial) and generates the receipt.
// On reject: records the reason and flips status back to 'rejected' (BD can edit & resubmit).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const GCB_URL = Deno.env.get('SUPABASE_URL')!
const CRM_URL = 'https://lrcimdchhbsgbnvdmpwd.supabase.co'
const CRM_KEY = Deno.env.get('CRM_SERVICE_ROLE_KEY') ?? ''
const DOC_FN_URL = `${GCB_URL.replace('supabase.co', 'functions.supabase.co')}/generate-document`

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

async function crm(path: string, init: RequestInit = {}) {
  return fetch(`${CRM_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return j({ success: false, error: 'method' }, 405)
  if (!CRM_KEY) return j({ success: false, error: 'CRM key not configured' }, 500)

  try {
    const { action, admission_id, reject_reason, auth } = await req.json()
    if (!auth?.name || !auth?.password) return j({ success: false, error: 'auth required' }, 401)
    if (!admission_id || !['approve', 'reject'].includes(action)) return j({ success: false, error: 'bad request' }, 400)

    // 1. Verify the caller is an active Audit Portal user
    const authRes = await crm(
      `v2_bd_members?select=name,role&name=eq.${encodeURIComponent(auth.name)}` +
      `&login_password=eq.${encodeURIComponent(auth.password)}&role=eq.audit&is_active=eq.true`,
    )
    const authRows = await authRes.json()
    if (!Array.isArray(authRows) || authRows.length === 0) return j({ success: false, error: 'not authorised' }, 401)
    const reviewer = authRows[0].name

    // 2. Load the admission
    const admRes = await crm(`admissions?id=eq.${admission_id}&select=*`)
    const admRows = await admRes.json()
    if (!Array.isArray(admRows) || admRows.length === 0) return j({ success: false, error: 'admission not found' }, 404)
    const admission = admRows[0]

    const now = new Date().toISOString()

    if (action === 'reject') {
      await crm(`admissions?id=eq.${admission_id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ payment_status: 'rejected', reject_reason: reject_reason ?? null, payment_reviewed_by: reviewer, payment_reviewed_at: now }),
      })
      return j({ success: true, action: 'rejected' })
    }

    // action === 'approve'
    // 3. Assign a receipt number: roll number + zero-padded global serial
    let receiptNo = String(admission.roll_number ?? admission_id)
    try {
      const serRes = await crm('rpc/next_receipt_serial', { method: 'POST', body: '{}' })
      const serial = await serRes.json()
      if (typeof serial === 'number') receiptNo = `${admission.roll_number ?? admission_id}-${String(serial).padStart(4, '0')}`
    } catch (_e) { /* fall back to roll-only receipt number */ }

    // 4. Mark approved + store receipt number
    await crm(`admissions?id=eq.${admission_id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ payment_status: 'approved', receipt_no: receiptNo, payment_reviewed_by: reviewer, payment_reviewed_at: now }),
    })

    // 5. Generate the Payment Receipt
    admission.receipt_no = receiptNo
    admission.payment_status = 'approved'
    const docRes = await fetch(DOC_FN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admission, type: 'receipt' }),
    })
    const doc = await docRes.json()

    return j({ success: true, action: 'approved', receipt_no: receiptNo, document: doc })
  } catch (e) {
    return j({ success: false, error: String(e) }, 500)
  }
})
