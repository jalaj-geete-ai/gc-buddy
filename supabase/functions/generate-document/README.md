# generate-document

Supabase Edge Function (GC Buddy project `uxdrldreaockdloqvojs`) that renders
branded PDFs on the Testbook letterhead:

- `type: 'letter'`  → **Admission Letter** (welcome + next steps) — generated instantly
  when a roll number is assigned.
- `type: 'receipt'` → **Payment Receipt** (payment summary + payment notes) — generated
  after the Audit Portal approves the payment terms.

It uploads the PDF to the `admission-letters` storage bucket, writes the signed URL
back to the CRM `admissions` row (`letter_url` / `receipt_url`), and emails the
document to `candidate_email` via Resend (when `RESEND_API_KEY` is set).

The letterhead image is read at runtime from the private `assets` storage bucket
(`assets/letterhead.jpg`) on the same project.

Deploy: `supabase functions deploy generate-document --project-ref uxdrldreaockdloqvojs`
