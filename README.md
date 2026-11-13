# AVISHKAR Portal

An independent participant registration portal for `portal.avishkarait.online`. This repository, its Supabase backend, and its Vercel deployment are separate from the existing `avishkarait` public website. The portal does not connect to that website's database.

## Local development

Requirements: Node.js 20.9+ and npm.

1. Copy `.env.example` to `.env.local`.
2. Create a **new Supabase project** for this portal. Set its URL, publishable/anon key, and service-role key in `.env.local`. Keep the service-role key server-only. Never use credentials from the public site or another Supabase project.
3. Install dependencies with `npm install`.
4. Apply migrations in order to the new project: `supabase link --project-ref <NEW_PROJECT_REF>` followed by `supabase db push`.
5. Run `npm run dev` and open `http://localhost:3000`.

Registration domains, challenge rules, team-size limits, per-domain student and faculty coordinator contacts, and the organiser-confirmed capacity of 20 teams per domain are pre-coded in `src/config/registration-domains.ts`. The fifth domain is named THEODO. Availability counts come from `public.registrations`; the registration RPC applies a per-domain transaction lock before checking capacity and writing the registration.

The form displays a UPI QR generated from the confirmed UPI ID in the same central configuration. Payment is ₹1,500 per team. Uploads accept PNG, JPEG or WebP up to 2 MiB and are written to the private `payment-proofs` bucket. The server validates file signatures and stores only an object path on the registration. Registration and payment statuses start as `payment_pending` and `pending`. This workflow does not create participant auth users or issue credentials. The successful submission screen thanks the team and explains that organisers will confirm manually through WhatsApp.

## Registration and credentials

The registration page, admin portal and participant portal all use the same independent Supabase project. `registrations` is the team record, `registration_members` stores each additional member's contact details, and each accommodation request is stored with its team's contact phone. Admin screens assemble these related rows into team and request cards; no second participant database is used.

The public registration flow does not create Supabase Auth users or credentials. An authorized admin manually confirms the payment in `/admin`. Confirmation creates or activates the team leader's account, creates individual QR tokens, confirms the registration, and offers a copyable message. Organisers send confirmation and access details manually through WhatsApp. Newly created participant accounts receive a cryptographically random temporary password and must change it at first sign-in. The temporary password and QR secrets are encrypted at rest with `PORTAL_CREDENTIAL_ENCRYPTION_KEY`; set this key in Vercel before confirming payments. Generate it once with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`, then keep the same value across deployments. Changing the key makes previously encrypted credentials unreadable. There is no self-service sign-up or email-link login; `/login` accepts organiser-issued email/password credentials and routes users based on their profile role.

Public registration uses Cloudflare Turnstile. The widget runs in the form and every submission is verified server-side through Cloudflare Siteverify before the proof image is uploaded or any registration is written. A honeypot field adds a basic extra bot check. Configure the Turnstile site key and secret before enabling registration; submissions fail closed if the keys are missing or verification fails.

Participant sign-in is at `/login`; the team leader can access the team's participant QR codes and submit accommodation requests at `/participant`. Admins use `/admin`. Create the single administrator account once from Supabase Authentication > Users, then promote that account from the new project's SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where lower(email) = lower('admin@example.com'));
```

Every admin API verifies the Supabase access token and `profiles.role` on the server. Payment proof previews use short-lived signed URLs from the private bucket. Meal check-in accepts QR scans or participant email, requires a confirmed registration, and uses a database unique constraint to prevent duplicate collection. Accommodation requests are team-leader-only and admins can approve, reject or complete them.

## Data and access boundaries

- `registrations`, `registration_members`: team contacts, domain/challenge selection, UTR, private proof object path, and payment/registration status.
- `payment-proofs`: private Storage bucket. No anon or authenticated policies are created; only the server-side service role uploads proof images.
- RLS is enabled on the database tables. Public clients have no direct read/write grants to registration records.
- `participant_qr_tokens`, `meal_checkins`, `accommodation_requests`, `admin_audit_log`: private participant and admin workflows. Admin API actions use server-side role checks; participant APIs verify the authenticated team leader.

The schema migrations are `supabase/migrations/202611130001_initial_portal_schema.sql` through `supabase/migrations/202611130006_single_admin_and_storage_limits.sql`. Apply them only to the new portal project. `supabase/tests/registration_capacity.sql` is a rollback-only SQL integration check for the atomic capacity RPC. Apply all six migrations before using registration, `/admin` or `/participant`. The last migration limits the private payment-proof bucket to 2 MiB per image and enforces a single admin profile; existing proof objects are not deleted. Disable public user sign-ups in the Supabase Auth settings and create the sole admin account manually.

## New GitHub repository

This folder is configured with `origin` at `https://github.com/sumukh0759T/portal-avishkar`. To publish a later local commit:

```powershell
git add .
git push origin main
```

Do not add the old `avishkarait` remote. `.env.local` and other `.env.*` files are ignored; `.env.example` contains placeholders only.

## Separate Vercel deployment

Sign in to the **different Vercel account** and import only `sumukh0759T/portal-avishkar`. Set the project root to `.` and use the Next.js framework preset; `npm run build` is the build command and Next.js should choose its output directory automatically. Set the production branch to `main`.

Add these project environment variables for Production and Preview, using values from the **new portal Supabase project**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never prefix it with `NEXT_PUBLIC_`)
- `PORTAL_CREDENTIAL_ENCRYPTION_KEY` (stable base64-encoded 32-byte key; keep the same value across deployments)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public widget key)
- `TURNSTILE_SECRET_KEY` (server-only Turnstile secret)
- `NEXT_PUBLIC_APP_URL=https://portal.avishkarait.online`
- `NEXT_PUBLIC_SITE_DOMAIN=portal.avishkarait.online`
- `NEXT_PUBLIC_PARTICIPANT_PORTAL_URL=https://portal.avishkarait.online/participant`

Apply all Supabase migrations before testing workflows. In the new Supabase project's Auth URL settings, set the production site URL to `https://portal.avishkarait.online` and add `https://portal.avishkarait.online/auth/callback` to the allowed redirect URLs. Add `portal.avishkarait.online` to this new Vercel project's Domains and configure the DNS records Vercel provides. Keep `avishkarait.online` attached to its existing public-site hosting.

Create a Cloudflare Turnstile widget for `portal.avishkarait.online`, then add its site key and secret as the two Vercel variables above. Add `localhost` to the widget's allowed hostnames for local development, or use a separate development widget. Do not expose the secret key in a `NEXT_PUBLIC_` variable.

After changing Vercel environment variables, start a new deployment because existing deployments do not receive updated values. Once Git is connected, pushes to `main` start production builds. A failed Vercel build should be diagnosed from that deployment's Build Logs; a successful local `npm run build` only verifies the repository build, not project settings or Supabase configuration.

The public website can independently point its Register buttons at `https://portal.avishkarait.online`; no database link is required.
