// assign-roll-number — DB-webhook target fired when a new admission is inserted
// in the CRM. Assigns the next GCT26xxx roll number, creates the GC Buddy student
// records, writes the roll number back to the CRM, then triggers instant generation
// of the ADMISSION LETTER (the Payment Receipt is generated later, on Audit approval).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GCB_URL = Deno.env.get('SUPABASE_URL')!
const GCB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRM_URL = 'https://lrcimdchhbsgbnvdmpwd.supabase.co'
const CRM_KEY = Deno.env.get('CRM_SERVICE_ROLE_KEY') ?? ''
const DOC_FN_URL = `${GCB_URL.replace('supabase.co', 'functions.supabase.co')}/generate-document`

Deno.serve(async (req: Request) => {
  const payload = await req.json()
  const record = payload.record
  const { id: admissionId, candidate_name, candidate_phone } = record

  const gcb = createClient(GCB_URL, GCB_KEY)

  // 1. Assign next roll number
  const { data: maxData } = await gcb.from('approved_students').select('roll_number')
    .like('roll_number', 'GCT26%').order('roll_number', { ascending: false }).limit(1).single()
  let nextNum = 259
  if (maxData?.roll_number) {
    const num = parseInt(maxData.roll_number.replace(/^GCT26/, ''))
    if (!isNaN(num)) nextNum = num + 1
  }
  const rollNumber = `GCT26${nextNum}`

  // 2. Insert into approved_students and student_progress
  await gcb.from('approved_students').insert({ roll_number: rollNumber, name: candidate_name })
  await gcb.from('student_progress').insert({ roll_number: rollNumber, name: candidate_name, email: candidate_phone, level: 'A1' })

  // 3. Write roll number back to CRM
  let crmStatus: unknown = 'CRM_KEY_MISSING'
  if (CRM_KEY.length > 0) {
    try {
      const res = await fetch(`${CRM_URL}/rest/v1/admissions?id=eq.${admissionId}`, {
        method: 'PATCH',
        headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ roll_number: rollNumber }),
      })
      crmStatus = { http: res.status, ok: res.ok }
    } catch (e: unknown) {
      crmStatus = { error: String(e) }
    }
  }

  // 4. Fetch full admission record and trigger the ADMISSION LETTER (instant)
  let letterResult: unknown = 'SKIPPED'
  if (CRM_KEY.length > 0) {
    try {
      const admRes = await fetch(
        `${CRM_URL}/rest/v1/admissions?id=eq.${admissionId}&select=*`,
        { headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` } },
      )
      const admArr = await admRes.json()
      const admission = admArr[0] ?? record
      admission.roll_number = rollNumber // ensure latest roll number is used

      const docRes = await fetch(DOC_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admission, type: 'letter' }),
      })
      letterResult = await docRes.json()
    } catch (e: unknown) {
      letterResult = { error: String(e) }
    }
  }

  return new Response(
    JSON.stringify({ success: true, roll_number: rollNumber, crm_writeback: crmStatus, letter: letterResult }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
