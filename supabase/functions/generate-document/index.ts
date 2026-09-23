// generate-document — builds branded PDFs on the Testbook letterhead.
//   type: 'letter'  -> Admission Letter (welcome + next steps), generated instantly
//   type: 'receipt' -> Payment Receipt (summary + payment notes), generated on approval
//
// Uploads to the `admission-letters` storage bucket, writes the signed URL back to
// the CRM admissions row, and emails the document to the candidate (if email + key).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb, PDFFont, RGB, PDFImage } from 'https://esm.sh/pdf-lib@1.17.1'

// Letterhead JPEG lives in the private `assets` storage bucket (assets/letterhead.jpg)
// on this project; fetched with the service role at runtime.
const LETTERHEAD_BUCKET = 'assets'
const LETTERHEAD_PATH = 'letterhead.jpg'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const A4W = 595.28, A4H = 841.89
const LM = 60, RM = 60, CW = A4W - LM - RM, TOP = 684, BM = 110
const BLACK = rgb(0.09,0.09,0.09), NAVY = rgb(0.082,0.133,0.271), BLUE = rgb(0.118,0.216,0.447),
      MUTED = rgb(0.40,0.43,0.50), LGRAY = rgb(0.937,0.945,0.953), MGRAY = rgb(0.80,0.82,0.84), WHITE = rgb(1,1,1)
const EMAIL = 'support.gc@testbook.com'
const SUPPORT_PHONE = '+91 92173 03928'

interface Fonts { reg: PDFFont; bold: PDFFont }
type Seg = { t: string; b?: boolean }

const S = (v: unknown): string => String(v ?? '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/…/g, '...').replace(/ /g, ' ')
const inr = (v: number) => `Rs. ${Math.round(v).toLocaleString('en-IN')}`
const fdate = (v: string | null | undefined): string => {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
const ordinal = (n: number): string => { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v-20)%10] ?? s[v] ?? s[0]) }
const MR = new Set(['Adarsh','Naeem','Pulkit','Sanidhya','Utkarsh','Shubham','Amit'])
const MS = new Set(['Himshikha','Himshika','Khushboo','Nagma','Riya','Ruchi'])
const counsellor = (n: string | null | undefined): string => {
  if (!n) return 'Your Counsellor'
  const b = String(n).replace(' TL', '').trim()
  return MR.has(b) ? `Mr. ${b}` : MS.has(b) ? `Ms. ${b}` : b
}

// ---- run-based text layout (bold-aware wrapping) ----
function tokenize(segs: Seg[]) {
  const w: Array<{ text: string; bold: boolean }> = []
  for (const seg of segs) for (const p of S(seg.t).split(' ')) if (p) w.push({ text: p, bold: !!seg.b })
  return w
}
function compress(words: Array<{ text: string; bold: boolean }>): Seg[] {
  if (!words.length) return []
  const out: Seg[] = []; let cb = words[0].bold, ct = words[0].text
  for (let i = 1; i < words.length; i++) {
    const w = words[i]
    if (w.bold === cb) ct += ' ' + w.text
    else { out.push({ t: ct, b: cb || undefined }); cb = w.bold; ct = ' ' + w.text }
  }
  out.push({ t: ct, b: cb || undefined }); return out
}
function mixedWrap(segs: Seg[], fonts: Fonts, size: number, maxW: number): Seg[][] {
  const words = tokenize(segs), lines: Seg[][] = []
  let lw: Array<{ text: string; bold: boolean }> = [], w = 0
  const sw = fonts.reg.widthOfTextAtSize(' ', size)
  for (const wd of words) {
    const f = wd.bold ? fonts.bold : fonts.reg
    const ww = f.widthOfTextAtSize(wd.text, size), need = lw.length === 0 ? ww : ww + sw
    if (lw.length > 0 && w + need > maxW) { lines.push(compress(lw)); lw = [wd]; w = ww }
    else { if (lw.length > 0) w += sw; lw.push(wd); w += ww }
  }
  if (lw.length > 0) lines.push(compress(lw))
  return lines
}
function drawSegLine(page: any, segs: Seg[], x: number, y: number, size: number, fonts: Fonts, color: RGB) {
  let cx = x
  for (const seg of segs) { const f = seg.b ? fonts.bold : fonts.reg; page.drawText(seg.t, { x: cx, y, size, font: f, color }); cx += f.widthOfTextAtSize(seg.t, size) }
}
function blockH(segs: Seg[], fonts: Fonts, size: number, maxW: number, lh: number): number {
  return mixedWrap(segs, fonts, size, maxW).length * lh
}

class PDFBuilder {
  doc!: PDFDocument; fonts!: Fonts; lh!: PDFImage; page: any; y = TOP
  async init(lhBytes: Uint8Array) {
    this.doc = await PDFDocument.create()
    this.fonts = { reg: await this.doc.embedFont(StandardFonts.Helvetica), bold: await this.doc.embedFont(StandardFonts.HelveticaBold) }
    this.lh = await this.doc.embedJpg(lhBytes)
  }
  newPage() {
    this.page = this.doc.addPage([A4W, A4H])
    this.page.drawImage(this.lh, { x: 0, y: 0, width: A4W, height: A4H })
    this.page.drawRectangle({ x: 32, y: 662, width: A4W - 64, height: 42, color: WHITE }) // mask Ref/Date band
    this.y = TOP
  }
  checkBreak(need: number) { if (this.y - need < BM + 10) this.newPage() }
  block(segs: Seg[], size: number, x: number, y: number, maxW: number, lh: number, color: RGB = BLACK): number {
    for (const line of mixedWrap(segs, this.fonts, size, maxW)) { drawSegLine(this.page, line, x, y, size, this.fonts, color); y -= lh }
    return y
  }
  sectionHead(t: string) {
    this.page.drawText(t, { x: LM, y: this.y, size: 12, font: this.fonts.bold, color: NAVY }); this.y -= 9
    this.page.drawLine({ start: { x: LM, y: this.y }, end: { x: A4W - RM, y: this.y }, thickness: 2, color: BLUE }); this.y -= 14
  }
}

function buildLetterPages(b: PDFBuilder, a: Record<string, unknown>) {
  const cname = S(a.candidate_name), roll = S(a.roll_number), bd = counsellor(a.bd_name as string)
  // Page 1 — welcome
  b.newPage()
  const title = 'Programme Admission Letter'
  const tW = b.fonts.bold.widthOfTextAtSize(title, 17)
  b.page.drawText(title, { x: LM + (CW - tW) / 2, y: b.y, size: 17, font: b.fonts.bold, color: BLACK })
  let y = b.y - 34
  b.page.drawText(fdate(a.enrollment_date as string), { x: LM, y, size: 10, font: b.fonts.bold, color: BLACK }); y -= 15
  b.page.drawText(cname, { x: LM, y, size: 10, font: b.fonts.bold, color: BLACK }); y -= 15
  if (a.current_city) { b.page.drawText(S(a.current_city), { x: LM, y, size: 10, font: b.fonts.reg, color: BLACK }); y -= 15 }
  if (a.candidate_phone) { b.page.drawText(S(a.candidate_phone), { x: LM, y, size: 10, font: b.fonts.reg, color: BLACK }); y -= 15 }
  y -= 5
  b.page.drawText(`Dear ${cname},`, { x: LM, y, size: 10.5, font: b.fonts.reg, color: BLACK }); y -= 20
  y = b.block([{ t: 'We are delighted to inform you that you have been successfully enrolled in the ' }, { t: 'German Language Programme (A1–B2)', b: true }, { t: ' at ' }, { t: 'Global Careers by Testbook', b: true }, { t: '. This programme is designed specifically for nursing professionals aspiring to build a rewarding career in Germany. We warmly welcome you and extend our heartiest congratulations on this life-changing decision.' }], 10.5, LM, y, CW, 15); y -= 10
  y = b.block([{ t: "Germany's healthcare sector is one of the most respected in the world — offering competitive salaries, world-class infrastructure, and a deeply fulfilling work environment where nursing professionals are genuinely valued. With our AI-powered platform, expert faculty, and a dedicated support team, you are in excellent hands. You are not just learning a language — " }, { t: 'you are building a future.', b: true }], 10.5, LM, y, CW, 15); y -= 10
  y = b.block([{ t: 'To get started, your dedicated Success Manager ' }, { t: 'Mr. Amit', b: true }, { t: ' will reach out to schedule your welcome onboarding call — covering KYC verification, batch selection, and getting set up on ' }, { t: 'GC Buddy AI', b: true }, { t: '. Your counsellor ' }, { t: bd, b: true }, { t: ' also remains available for any enrolment queries.' }], 10.5, LM, y, CW, 15); y -= 18
  b.page.drawText('Warm regards,', { x: LM, y, size: 10.5, font: b.fonts.reg, color: BLACK }); y -= 24
  b.page.drawText('Student Success Team', { x: LM, y, size: 11, font: b.fonts.bold, color: BLACK }); y -= 15
  b.page.drawText('Global Careers by Testbook', { x: LM, y, size: 10, font: b.fonts.reg, color: MUTED }); y -= 13
  b.page.drawText(EMAIL, { x: LM, y, size: 10, font: b.fonts.reg, color: MUTED })

  // Page 2 — next steps
  b.newPage()
  b.sectionHead('Your Next Steps'); b.y -= 4
  const stepLW = 54
  const steps = [
    { n: 'Step 01', h: 'Connect with Your Success Manager', s: [{ t: 'Your dedicated Success Manager ' }, { t: 'Mr. Amit', b: true }, { t: ' will call you on your registered number to schedule a welcome onboarding call and plan your learning roadmap. Reach him at ' }, { t: SUPPORT_PHONE, b: true }, { t: '.' }] },
    { n: 'Step 02', h: 'Complete Your KYC & Select Your Batch', s: [{ t: 'Submit your government ID, nursing qualification certificates, and a recent photograph through the link shared by Mr. Amit. Once verified, you will select your preferred batch timing. Slots are limited — complete KYC promptly.' }] },
    { n: 'Step 03', h: 'Download GC Buddy AI', s: [{ t: 'GC Buddy AI is your primary learning platform, accessible at ' }, { t: 'gcbuddyai.pages.dev', b: true }, { t: '. It includes AI exercises, vocabulary drills, grammar modules, and live class access — all in the nursing context.' }] },
    { n: 'Step 04', h: `Login Using Your Roll Number: ${roll}`, s: [{ t: 'Your Roll Number ' }, { t: roll, b: true }, { t: ' is your permanent identity on the platform. Keep it safe — you will need it throughout the programme and for all official correspondence.' }] },
    { n: 'Step 05', h: 'Attend Your First Class & Begin Your Journey', s: [{ t: 'Your schedule will be shared via WhatsApp and the app. Consistent attendance and daily practice are the strongest predictors of success in language assessments and placement readiness.' }] },
  ]
  for (const st of steps) {
    const lines = mixedWrap(st.s, b.fonts, 9.5, CW - 16); const boxH = lines.length * 13 + 12
    b.checkBreak(24 + boxH + 12)
    b.page.drawRectangle({ x: LM, y: b.y - 20, width: stepLW, height: 20, color: NAVY })
    const nW = b.fonts.bold.widthOfTextAtSize(st.n, 8)
    b.page.drawText(st.n, { x: LM + (stepLW - nW) / 2, y: b.y - 13, size: 8, font: b.fonts.bold, color: WHITE })
    b.page.drawText(st.h, { x: LM + stepLW + 8, y: b.y - 7, size: 10.5, font: b.fonts.bold, color: NAVY })
    b.y -= 24
    b.page.drawRectangle({ x: LM, y: b.y - boxH, width: CW, height: boxH, color: LGRAY })
    let ty = b.y - 9
    for (const line of lines) { drawSegLine(b.page, line, LM + 8, ty, 9.5, b.fonts, BLACK); ty -= 13 }
    b.y -= boxH + 12
  }
}

function drawTable(b: PDFBuilder, rows: [string, string, boolean?][], c1W: number, c2W: number) {
  const rowH = 22, tW = c1W + c2W; const sy = b.y
  b.page.drawLine({ start: { x: LM, y: sy }, end: { x: LM + tW, y: sy }, thickness: 0.8, color: NAVY })
  rows.forEach(([label, value, boldVal], i) => {
    const ry = sy - (i + 1) * rowH
    b.page.drawRectangle({ x: LM, y: ry, width: c1W, height: rowH, color: LGRAY })
    b.page.drawRectangle({ x: LM + c1W, y: ry, width: c2W, height: rowH, color: WHITE })
    if (i < rows.length - 1) b.page.drawLine({ start: { x: LM, y: ry }, end: { x: LM + tW, y: ry }, thickness: 0.3, color: MGRAY })
    b.page.drawText(S(label), { x: LM + 8, y: ry + 8, size: 8, font: b.fonts.bold, color: MUTED })
    b.page.drawText(S(value), { x: LM + c1W + 8, y: ry + 8, size: 10, font: boldVal ? b.fonts.bold : b.fonts.reg, color: BLACK })
  })
  const ey = sy - rows.length * rowH
  b.page.drawLine({ start: { x: LM, y: ey }, end: { x: LM + tW, y: ey }, thickness: 0.8, color: NAVY })
  b.y = ey
}

function buildReceiptPages(b: PDFBuilder, a: Record<string, unknown>) {
  const cname = S(a.candidate_name), roll = S(a.roll_number)
  const receiptNo = S(a.receipt_no) || roll
  const pfee = Number(a.program_fee ?? 0), rfee = Number(a.reg_fee ?? 0), paid = Number(a.collected_amount ?? 0)
  const n_emi = Number(a.emi_months ?? 0), emiDay = Number(a.emi_day ?? 3)
  const emib = pfee - rfee, emi_pm = n_emi > 0 ? Math.round(emib / n_emi) : 0, balance = pfee - paid, emiOrd = ordinal(emiDay)

  b.newPage()
  const title = 'Payment Receipt'
  b.page.drawText(title, { x: LM, y: b.y, size: 17, font: b.fonts.bold, color: BLACK })
  const r1 = `Receipt No: ${receiptNo}`, r2 = `Date: ${fdate(new Date().toISOString())}`
  b.page.drawText(r1, { x: A4W - RM - b.fonts.reg.widthOfTextAtSize(r1, 9), y: b.y + 4, size: 9, font: b.fonts.reg, color: MUTED })
  b.page.drawText(r2, { x: A4W - RM - b.fonts.reg.widthOfTextAtSize(r2, 9), y: b.y - 8, size: 9, font: b.fonts.reg, color: MUTED })
  b.y -= 16
  b.page.drawLine({ start: { x: LM, y: b.y }, end: { x: A4W - RM, y: b.y }, thickness: 1, color: BLUE }); b.y -= 20
  b.page.drawText('Received From', { x: LM, y: b.y, size: 8, font: b.fonts.bold, color: MUTED }); b.y -= 13
  b.page.drawText(cname, { x: LM, y: b.y, size: 11, font: b.fonts.bold, color: BLACK }); b.y -= 14
  b.page.drawText(`${S(a.current_city)}  ·  ${S(a.candidate_phone)}`, { x: LM, y: b.y, size: 9.5, font: b.fonts.reg, color: BLACK }); b.y -= 13
  b.page.drawText(`Roll Number: ${roll}`, { x: LM, y: b.y, size: 9.5, font: b.fonts.bold, color: NAVY }); b.y -= 22

  b.sectionHead('Payment Summary'); b.y -= 2
  drawTable(b, [
    ['Candidate Name', cname], ['Roll Number', roll], ['Enrolment Date', fdate(a.enrollment_date as string)],
    ['Total Programme Fee', inr(pfee)], ['Registration Fee (paid at enrolment)', inr(rfee)],
    ['Amount Subject to EMI', inr(emib), true], ['Number of Monthly EMIs', `${n_emi} months`],
    ['Monthly EMI Amount', inr(emi_pm), true], ['EMI Deduction Date', `${emiOrd} of every month`],
    ['Amount Collected at Enrolment', inr(paid)], ['Balance Payable (via EMI)', inr(balance), true],
    ['Payment Mode', a.full_payment ? 'Full Payment' : 'EMI Plan'],
  ], CW * 0.42, CW * 0.58)
  b.y -= 18

  b.page.drawText('Important Payment Notes', { x: LM, y: b.y, size: 11, font: b.fonts.bold, color: NAVY }); b.y -= 8
  b.page.drawLine({ start: { x: LM, y: b.y }, end: { x: A4W - RM, y: b.y }, thickness: 0.5, color: LGRAY }); b.y -= 13
  const notes: Array<{ head: string; segs: Seg[] }> = [
    { head: '1. How Your EMI is Processed', segs: [{ t: 'Your monthly instalment of ' }, { t: inr(emi_pm), b: true }, { t: ' will be automatically deducted from your registered bank account or payment source on the ' }, { t: `${emiOrd} of each month`, b: true }, { t: '. The deduction runs on an auto-debit / NACH mandate set up at the time of enrolment. You do not need to manually initiate any payment each month — ensure funds are available and the rest is handled automatically.' }] },
    { head: '2. Maintain Sufficient Bank Balance', segs: [{ t: 'Please ensure your account holds at least ' }, { t: inr(emi_pm), b: true }, { t: ` on or before the ${emiOrd} of every month. Insufficient balance will result in a failed transaction. Banks typically levy a dishonour charge of Rs. 300–800 per failed attempt. Global Careers by Testbook bears no responsibility for such bank charges. Repeated failures may also impact your CIBIL credit score.` }] },
    { head: '3. Failed EMI — Consequences & Reinstatement', segs: [{ t: 'A failed EMI deduction will result in the ' }, { t: 'immediate suspension of your access', b: true }, { t: ' to the GC Buddy AI platform and all live classes. Access is reinstated only upon recovery of the overdue amount. To clear a failed EMI, contact your Success Manager Mr. Amit at ' + SUPPORT_PHONE + ' or ' }, { t: EMAIL, b: true }, { t: '. Persistent non-payment beyond 30 days may lead to permanent termination of enrolment without refund.' }] },
    { head: '4. EMI Tenure Extension — 18 or 24 Months', segs: [{ t: `If your current ${n_emi}-month EMI schedule feels stretched, you may extend your tenure to ` }, { t: '18 or 24 months', b: true }, { t: " through our partner lending institutions, subject to your credit score and the lender's eligibility. A longer tenure reduces your monthly instalment while increasing total interest payable. This must be requested before your 2nd EMI deduction date." }] },
    { head: '5. Partner Loan — Disclaimer of Liability', segs: [{ t: 'If you avail financing through any partner institution (NBFC / co-lending partner), the loan agreement, repayment schedule, interest rates and all obligations are strictly between you and the lender. ' }, { t: 'Global Careers by Testbook bears absolutely no liability', b: true }, { t: ' for loan-related disputes, interest charges, penalties, credit-score impact, or any legal action by the lender. Read all loan documents carefully before signing.' }] },
    { head: '6. Payment Receipts & Documentation', segs: [{ t: 'An official payment receipt will be issued to your registered email within 3 working days of each successful payment. For any discrepancy, write to us with your Roll Number ' }, { t: roll, b: true }, { t: ' and the transaction reference number. Save all bank confirmation messages for your records.' }] },
    { head: '7. GST & Tax Information', segs: [{ t: 'The programme fee is inclusive of all applicable taxes including GST at the prevailing rate. A GST invoice will be provided upon request. If you require an invoice in a specific entity name for reimbursement, inform your counsellor with the necessary GSTIN details.' }] },
    { head: '8. Fee Non-Refundability', segs: [{ t: 'All fees paid — registration fee, programme fee, and all EMI instalments — are ' }, { t: 'strictly non-refundable', b: true }, { t: ' under any circumstances, including change of mind, inability to attend, personal emergencies, relocation, or medical conditions.' }] },
  ]
  for (const note of notes) {
    const bodyH = blockH(note.segs, b.fonts, 9, CW, 13)
    b.checkBreak(14 + bodyH + 9)
    b.page.drawText(note.head, { x: LM, y: b.y, size: 9.5, font: b.fonts.bold, color: NAVY }); b.y -= 14
    for (const line of mixedWrap(note.segs, b.fonts, 9, CW)) { drawSegLine(b.page, line, LM, b.y, 9, b.fonts, BLACK); b.y -= 13 }
    b.y -= 9
  }
}

async function buildPDF(a: Record<string, unknown>, type: string, lhBytes: Uint8Array): Promise<Uint8Array> {
  const b = new PDFBuilder(); await b.init(lhBytes)
  if (type === 'receipt') buildReceiptPages(b, a)
  else buildLetterPages(b, a)
  return b.doc.save()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  try {
    const payload = await req.json()
    const a = payload.admission ?? payload.record ?? payload
    const type = payload.type === 'receipt' ? 'receipt' : 'letter'
    const roll = String(a.roll_number ?? 'unknown')

    const GCB_URL = Deno.env.get('SUPABASE_URL')!
    const GCB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const gcb = createClient(GCB_URL, GCB_KEY)

    const { data: lhBlob, error: lhErr } = await gcb.storage.from(LETTERHEAD_BUCKET).download(LETTERHEAD_PATH)
    if (lhErr || !lhBlob) throw new Error(`letterhead asset missing (upload ${LETTERHEAD_BUCKET}/${LETTERHEAD_PATH}): ${lhErr?.message ?? 'not found'}`)
    const lhBytes = new Uint8Array(await lhBlob.arrayBuffer())
    const pdfBytes = await buildPDF(a, type, lhBytes)

    const fileName = `${roll}_${type === 'receipt' ? 'payment_receipt' : 'admission_letter'}.pdf`
    const { error: upErr } = await gcb.storage.from('admission-letters')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (upErr) throw upErr
    const { data: urlData } = await gcb.storage.from('admission-letters')
      .createSignedUrl(fileName, 31536000) // 1 year
    const docUrl = urlData?.signedUrl ?? null

    // Write the URL back to the CRM admissions row (best-effort)
    let crmWriteback: unknown = 'skipped'
    const CRM_URL = 'https://lrcimdchhbsgbnvdmpwd.supabase.co'
    const CRM_KEY = Deno.env.get('CRM_SERVICE_ROLE_KEY') ?? ''
    const admId = a.id
    if (CRM_KEY && admId != null && docUrl) {
      const patch = type === 'receipt'
        ? { receipt_url: docUrl, receipt_generated_at: new Date().toISOString(), ...(a.receipt_no ? { receipt_no: a.receipt_no } : {}) }
        : { letter_url: docUrl, letter_generated_at: new Date().toISOString() }
      const res = await fetch(`${CRM_URL}/rest/v1/admissions?id=eq.${admId}`, {
        method: 'PATCH',
        headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      })
      crmWriteback = { http: res.status, ok: res.ok }
    }

    // Email the document to the candidate (best-effort)
    let emailStatus = 'skipped'
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
    const toEmail = String(a.candidate_email ?? '')
    if (resendKey && toEmail) {
      let b64 = ''
      for (let i = 0; i < pdfBytes.length; i++) b64 += String.fromCharCode(pdfBytes[i])
      b64 = btoa(b64)
      const cname = String(a.candidate_name ?? '')
      const isReceipt = type === 'receipt'
      const subject = isReceipt ? `Your Payment Receipt — Roll No. ${roll}` : `Your Programme Admission Letter — Roll No. ${roll}`
      const docLabel = isReceipt ? 'Payment Receipt' : 'Programme Admission Letter'
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'GC Admissions <support.gc@testbook.com>',
          to: [toEmail],
          subject,
          attachments: [{ filename: fileName, content: b64 }],
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222"><div style="background:#153b72;padding:24px 32px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0;font-size:20px">Global Careers by Testbook</h2><p style="color:#a8c4e8;margin:4px 0 0;font-size:13px">${docLabel}</p></div><div style="background:#f7f8fa;padding:28px 32px;border-radius:0 0 8px 8px;border:1px solid #e2e5ea;border-top:none"><p style="margin:0 0 12px">Dear <strong>${cname}</strong>,</p><p style="margin:0 0 16px">Your <strong>${docLabel}</strong> is attached to this email as a PDF. Please keep it for your records.</p><p style="margin:0 0 8px"><strong>Roll Number:</strong> ${roll}</p><p style="margin:0 0 24px">For any queries, reply to this email or write to <a href="mailto:support.gc@testbook.com">support.gc@testbook.com</a>.</p><p style="margin:0;color:#666;font-size:12px">— Student Success Team, Global Careers by Testbook</p></div></div>`,
        }),
      })
      emailStatus = emailRes.ok ? 'sent' : `failed:${emailRes.status}`
    }

    return new Response(
      JSON.stringify({ success: true, type, file_name: fileName, doc_url: docUrl, crm_writeback: crmWriteback, email: emailStatus }),
      { headers: { 'Content-Type': 'application/json', ...CORS } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
