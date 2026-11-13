# AVISHKAR Portal

An independent participant registration portal for `portal.avishkarait.online`. This repository, its Supabase backend, and its Vercel deployment are separate from the existing `avishkarait` public website. The portal does not connect to that website's database.

## Local development

Requirements: Node.js 20.9+ and npm.

1. Copy `.env.example` to `.env.local`.
2. Create a **new Supabase project** for this portal and copy its Project URL and publishable/anon key into `.env.local`. Never use credentials from the public site or another Supabase project.
3. Install dependencies with `npm install`.
4. Apply the migration to the new project with the Supabase CLI: `supabase link --project-ref <NEW_PROJECT_REF>` followed by `supabase db push`.
5. In the new project's Auth URL configuration, allow `http://localhost:3000` and `https://portal.avishkarait.online`. Choose the email confirmation/OTP behavior for the new portal there.
6. Run `npm run dev` and open `http://localhost:3000`.

No event is seeded by the migration. Add portal-owned event records in the new project's SQL editor or through the future admin interface. Event descriptions, rules and team-size limits belong in `public.events`; site/portal configuration belongs in `public.portal_config`. Do not fetch registration-form data from the public website.

## Authentication and admin setup

The schema creates one `profiles` row for each new Supabase Auth user. Use the new project's email OTP or password flow; configure redirect URLs in that project's Auth settings. Participant credentials and accounts are not imported. Create the initial admin by signing up through this portal, then promote that account in the **new project's** SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'ADMIN_EMAIL');
```

The public client uses only the new project's publishable/anon key. Never put a service-role key in a `NEXT_PUBLIC_*` variable or browser code.

## Data and access boundaries

- `profiles`: participant profile and role.
- `portal_config`, `events`: portal-owned branding, contact, registration settings, event descriptions, rules and team constraints.
- `registrations`, `registration_members`: team registration data, scoped to its leader and portal admins by RLS.
- `registration-documents`: private storage bucket. Object paths start with the uploader's auth user ID; PDF/JPEG/PNG uploads are limited to 10 MiB.
- RLS is enabled on every public table. Admin roles must be granted using trusted SQL in the new project.

The first migration is `supabase/migrations/202611130001_initial_portal_schema.sql`. Apply it only to the new portal project. Treat changes to registration and admin policies as security-sensitive and review them before deployment.

## New GitHub repository

This local folder is intended to be the independent repository `https://github.com/sumukh0759T/portal-avishkar`. After creating that empty repository under the correct GitHub account, from this folder run:

```powershell
git init
git add .
git commit -m "Initial independent AVISHKAR portal"
git branch -M main
git remote add origin https://github.com/sumukh0759T/portal-avishkar.git
git push -u origin main
```

Do not add the old `avishkarait` remote. `.env.local` and other `.env.*` files are ignored; `.env.example` contains placeholders only.

## Separate Vercel deployment

Sign in to the **different Vercel account**, import only `sumukh0759T/portal-avishkar`, and configure the same two Supabase values from the new portal project plus:

- `NEXT_PUBLIC_APP_URL=https://portal.avishkarait.online`
- `NEXT_PUBLIC_SITE_DOMAIN=portal.avishkarait.online`

Deploy, then add `portal.avishkarait.online` to this new Vercel project's Domains and configure the DNS records Vercel provides. Keep `avishkarait.online` attached to its existing public-site hosting. In the new Supabase project's Auth URL settings, set the production site URL to `https://portal.avishkarait.online` and allow its auth callback paths.

The public website can independently point its Register buttons at `https://portal.avishkarait.online`; no database link is required.
