-- Payment option: UPI details for the organisers' account plus per-registration
-- payment tracking. Additive only; existing registrations default to NOT PAID.

alter table public.registration_settings
  add column if not exists upi_id text,
  add column if not exists beneficiary_name text,
  add column if not exists registration_fee integer not null default 1500,
  add column if not exists official_qr_image_url text,
  add column if not exists payment_enabled boolean not null default true;

alter table public.registrations
  add column if not exists payment_amount integer not null default 1500,
  add column if not exists payment_status text not null default 'NOT PAID',
  add column if not exists payment_reference text,
  add column if not exists payment_submitted_at timestamptz;

create index if not exists registrations_payment_status_idx
  on public.registrations(payment_status);
