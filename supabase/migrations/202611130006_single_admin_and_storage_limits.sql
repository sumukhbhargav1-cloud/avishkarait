-- Keep the portal restricted to the one organiser account and cap proof usage.
-- Existing proof objects remain private and are not deleted.

create unique index if not exists profiles_single_admin_idx
  on public.profiles (role)
  where role = 'admin';

update storage.buckets
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'payment-proofs';
