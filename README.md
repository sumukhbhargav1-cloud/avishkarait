# AVISHKAR 2K26

Public event website and Supabase-backed team registration, participant, and administrator portals for the AIT Innovation Hackathon.

## Features

- Public pages for the event, domains, schedule, guidelines, FAQ, contact, registration, privacy, terms and the Chikkamagaluru travel guide at `/blog`.
- Participant portal with team details, registration status, announcements, project submission, accommodation requests and a team meal QR code.
- Administrator portal with registration review, team management, announcements, domain editing, CSV export, accommodation request management and meal QR scanning.
- Supabase Auth and Postgres with database row-level security.

## Event details

- AVISHKAR 2K26, 25-26 November 2026 at AIT, Chikkamagaluru, Karnataka.
- Registration fee: INR 1,500 per team. Prize pool: INR 1,00,000.
- Payment collection details and accommodation availability must be confirmed by event organisers.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Stop the server with Ctrl+C. For production, run `npm run build` followed by `npm start`.

## Deploy to Vercel

1. Push this project to a private GitHub repository and import that repository from the Vercel dashboard. Vercel detects Next.js automatically.
2. In the Vercel project settings, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS deployment URL (for example, `https://avishkar-2k26.vercel.app`). Set each variable for Production and Preview as needed.
3. Treat `SUPABASE_SERVICE_ROLE_KEY` as a secret: keep it server-only, never prefix it with `NEXT_PUBLIC_`, and never commit it. Add `RESEND_API_KEY` and `ADMIN_EMAIL` for email notifications, and `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only when enabling Razorpay payments.
4. In Supabase Authentication / URL Configuration, set the production Site URL and add `https://your-deployment-domain/auth/callback` to Redirect URLs. Keep the localhost callback for development.
5. Configure custom SMTP in Supabase Authentication / SMTP Settings if magic links must be delivered to users outside your Supabase organisation or you need more than the built-in email limit. Hosting on Vercel does not change Supabase's email limits.
6. Set `ADMIN_LOGIN_USERNAME` and `ADMIN_LOGIN_EMAIL` in the server environment. Create the matching Auth user manually in Supabase with a strong password and mark its email as confirmed; this setup does not require sending an email. The admin login form asks for the username and password (passphrase), while the mapped Auth email stays server-side. Team leader magic-link sign-in remains separate and still uses email.

## Registration CAPTCHA (Cloudflare Turnstile)

The public registration review step requires Cloudflare Turnstile verification. The registration API independently verifies every token with Cloudflare before creating a participant account; missing, invalid, expired, or unverifiable tokens are rejected.

1. In the Cloudflare dashboard, open Turnstile and add a widget for your production hostname (and localhost if you test locally).
2. Copy the widget's **site key** into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env.local` and the Vercel project environment.
3. Copy the widget's **secret key** into `TURNSTILE_SECRET_KEY` in `.env.local` and the Vercel project environment. This is server-only: never prefix it with `NEXT_PUBLIC_` and never commit its value.
4. Set both variables for the Vercel environments you use (Production, Preview, and Development as appropriate), then redeploy.
5. Keep the Cloudflare widget hostname allowlist limited to the actual event website and required preview/local development hosts.

If either key is missing, registration intentionally fails closed rather than accepting an unverified submission.

## Configure Supabase

1. Create a Supabase project. In Project Settings / API, copy the Project URL and publishable key (or use the legacy anon key if that is what your project provides).
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. The app also accepts the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` variable.
3. For a new project, install the CLI with `npm install supabase --save-dev`, initialize it with `npx supabase init`, then run `npx supabase login` and `npx supabase link --project-ref <project-ref>`. Preview with `npx supabase db push --dry-run --remote`; apply only after checking the target with `npx supabase db push --remote`. For an existing project with migrations previously run in the SQL Editor, use the SQL Editor for the new migration unless CLI migration history has been aligned.
4. In Authentication / Providers, enable Email sign-in. In Authentication / URL Configuration, set `http://localhost:3000` as the Site URL and add `http://localhost:3000/auth/callback` to Redirect URLs. Add the production HTTPS origin and its `/auth/callback` before deployment.
5. Create the administrator Auth user in **Authentication / Users / Add user**. Enter the admin account email and a long unique password, and mark the email as confirmed in the dashboard. This is a manual account setup step; the app's admin login does not send or receive email. Set `ADMIN_LOGIN_EMAIL` to this same address and `ADMIN_LOGIN_USERNAME` to the username you want administrators to type. Keep both variables server-side in `.env.local` and Vercel; never add a `NEXT_PUBLIC_` prefix.

6. In the Supabase SQL Editor, assign that account's profile role:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('admin-account@example.com');
```

Replace the sample with the account email. First confirm a profile row exists with `select id, email, role from public.profiles where lower(email) = lower('admin-account@example.com');`. If there is no row, verify the Auth user exists and that the `handle_new_auth_user` trigger from migration 001 is installed. Keep the SQL Editor limited to trusted project administrators. Never put a service-role key in browser code or a `NEXT_PUBLIC_` variable.

7. In local `.env.local`, set `ADMIN_LOGIN_USERNAME` and `ADMIN_LOGIN_EMAIL` alongside the Supabase URL and publishable key. Restart `npm run dev` after changing environment variables. In Vercel, add the same two server-side variables under Project / Settings / Environment Variables, then redeploy.
8. Open `/admin/login` and sign in with the configured username and the password created for the Auth user. The account must have `profiles.role = 'admin'`. Team leaders continue to sign in through `/login` with magic links. Configure custom SMTP only if you need team leader sign-in emails delivered beyond Supabase's built-in testing limits.

## Database migrations

Apply these files in order to a new project:

1. `supabase/migrations/202611090001_initial_schema.sql`
2. `supabase/migrations/202611090002_portals.sql`
3. `supabase/migrations/202611090003_official_domains_and_multi_registration.sql`
4. `supabase/migrations/202611100004_archive_event_details.sql`
5. `supabase/migrations/202611100005_civilx_official_rules.sql`
6. `supabase/migrations/202611100006_accommodation_and_meal_qr.sql`
7. `supabase/migrations/202611100007_preserve_admin_team_leaders.sql`
8. `supabase/migrations/202611100008_align_mechspark_team_size.sql`
9. `supabase/migrations/202611100009_confirmed_software_domains_and_logistics.sql`

For an existing database, apply only the migrations not already applied, in order. Migration 006 adds random per-team QR credentials, accommodation requests and duplicate-protected meal check-ins. Migration 007 prevents team registration from replacing an administrator role. Migration 008 aligns MechSpark CAD Challenge team constraints (2-4 members). Migration 009 updates confirmed AI in Cybersecurity & FinTech and Full Stack Development team sizes (2-4 members, 24 hours), official coordinator contacts, registration deadline (21 Nov 2026), and UPI payment collection details.

## Operations

- `/portal`: team workspace. Team leaders submit and update accommodation requests; organisers set their status in `/admin/accommodation`. Admins who lead a team can access both workspaces.
- Team meal QR codes are shown in `/portal`. `/admin/meals` scans a team once per meal type per India-local date. The scanner needs camera permission and an HTTPS page (localhost is supported for development); it also provides a manual input fallback.
- QR values act as team credentials. Share them only with the team and authorised event staff.
- `/supabase/tests/portal_isolation.sql` contains participant isolation checks. Substitute real account UUIDs before running.

The project URL and publishable key are set in the ignored local `.env.local` file. Apply the migrations in order before using the data-backed features.

registration portal: portal.avishkarait.online/register
