# Database changes for the admission-docs + Audit Portal + hashed-login work

Applied via Supabase migrations. Two projects are involved:

- **CRM** project `lrcimdchhbsgbnvdmpwd` (holds `admissions`, `v2_bd_members`)
- **GC Buddy** project `uxdrldreaockdloqvojs` (holds `approved_students`,
  `student_progress`, edge functions, storage)

## CRM project (`lrcimdchhbsgbnvdmpwd`)

### admissions — approval workflow + document URLs + email
```sql
alter table public.admissions
  add column if not exists payment_status text not null default 'pending', -- pending|approved|rejected|legacy
  add column if not exists payment_reviewed_by text,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists reject_reason text,
  add column if not exists letter_url text,
  add column if not exists receipt_url text,
  add column if not exists letter_generated_at timestamptz,
  add column if not exists receipt_generated_at timestamptz,
  add column if not exists receipt_no text,
  add column if not exists candidate_email text;
update public.admissions set payment_status='legacy' where payment_status='pending'; -- pre-existing rows
create index if not exists idx_admissions_payment_status on public.admissions(payment_status);
create sequence if not exists public.payment_receipt_serial start 1;
create or replace function public.next_receipt_serial() returns bigint
  language sql security definer set search_path=public
  as $$ select nextval('public.payment_receipt_serial'); $$;
```

### v2_bd_members — audit role + hashed login
```sql
-- allow the 'audit' role (Audit Portal accounts)
alter table public.v2_bd_members drop constraint if exists v2_bd_members_role_check;
alter table public.v2_bd_members add constraint v2_bd_members_role_check
  check (role = any (array['bd','tl','admin','audit']));

-- bcrypt password hashing + token sessions
create extension if not exists pgcrypto with schema extensions;
alter table public.v2_bd_members add column if not exists password_hash text;
update public.v2_bd_members
  set password_hash = extensions.crypt(login_password, extensions.gen_salt('bf',10))
  where password_hash is null and login_password is not null;

create table if not exists public.auth_sessions (
  token uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.v2_bd_members(id) on delete cascade,
  name text, role text,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 days'
);

-- verify_login / validate_session / set_member_password
-- (see hashed_login_bcrypt migration; verify_login lazily migrates plaintext-only rows)
```

### admissions + payment_receipts — additional (multi) payment receipts
```sql
-- financing type on the admission (drives receipt wording)
alter table public.admissions add column if not exists financing_type text
  not null default 'testbook_emi'
  check (financing_type in ('testbook_emi','partner_loan','full'));
update public.admissions set financing_type='full' where full_payment is true and financing_type='testbook_emi';

-- ledger of ADDITIONAL payment receipts (the enrolment receipt stays on admissions)
create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  admission_id bigint not null references public.admissions(id) on delete cascade,
  roll_number text, seq int not null default 1, receipt_no text,
  amount integer not null, payment_date date not null default current_date,
  payment_mode text not null default 'other'
    check (payment_mode in ('down_payment','emi_installment','loan_disbursement','topup','other')),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text, reviewed_at timestamptz, reject_reason text,
  receipt_url text, generated_at timestamptz, created_by text,
  created_at timestamptz not null default now()
);
-- RLS: read open to anon/authenticated; requests via RPC, approvals via edge fn (service role)
alter table public.payment_receipts enable row level security;
create policy anon_read_payment_receipts on public.payment_receipts for select to anon using (true);
create policy auth_read_payment_receipts on public.payment_receipts for select to authenticated using (true);

-- per-student receipt number (roll + running count incl. the enrolment receipt)
create function public.next_receipt_no(p_admission_id bigint) returns text ...;
-- create a pending request from the CRM (anon-callable, security definer)
create function public.request_payment_receipt(p_admission_id bigint, p_amount integer,
  p_payment_date date, p_payment_mode text, p_note text, p_created_by text) returns uuid ...;
```
Flow: CRM operator calls `request_payment_receipt` (pending) → Audit Portal → `audit-action`
with `{receipt_id, action}` (service-role, validates the `audit` session) → assigns `receipt_no`,
generates a financing-aware `type:'payment'` PDF via generate-document, writes back `receipt_url`.
`generate-document` is invoked function-to-function WITH the service-role JWT (verify_jwt is on).

## GC Buddy project (`uxdrldreaockdloqvojs`)

- Private storage bucket **`assets`** holding **`testbook-logo.png`** (the crisp
  testbook wordmark), read by `generate-document` at runtime. The header/footer
  are now drawn natively (crisp vector text + this logo) instead of embedding a
  low-resolution full-page letterhead scan; if the logo is missing the function
  falls back to a vector "testbook" wordmark so generation never fails.
  (The old `letterhead.jpg` is no longer used.)
- Generated PDFs are written to the existing **`admission-letters`** bucket.

## ✅ Post-merge cleanup — APPLIED (migration `plaintext_password_cleanup`)

The hashed login is live in production and verified, so plaintext passwords have
been removed. All 27 members authenticate via `password_hash` (bcrypt); 0 rows
retain `login_password`. `set_member_password` was also updated to stop writing
plaintext, so new BDs never reintroduce it. `verify_login` is unaffected (it
reads `password_hash`).

```sql
-- future password sets no longer write plaintext
create or replace function public.set_member_password(p_id uuid, p_password text)
  returns void language sql security definer set search_path to 'public','extensions'
as $$
  update public.v2_bd_members
    set password_hash = crypt(p_password, gen_salt('bf', 10)),
        login_password = null, updated_at = now()
    where id = p_id;
$$;

-- remove plaintext passwords at rest
alter table public.v2_bd_members alter column login_password drop not null;
update public.v2_bd_members set login_password = null where login_password is not null;

-- block any client from reading the secret columns directly
revoke select (login_password, password_hash) on public.v2_bd_members from anon, authenticated;
```
