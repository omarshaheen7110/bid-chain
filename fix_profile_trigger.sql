-- ============================================================
-- FIX: automatic profile creation on signup
-- Run this in Supabase: SQL Editor -> New query -> Run
-- (safe to run even though the original schema already ran)
-- ============================================================

-- Remove the old insert policy — it's no longer needed, since
-- profile rows will now be created by a trigger, not the client.
drop policy if exists "Users can insert their own profile" on profiles;

-- This function runs with elevated privileges (SECURITY DEFINER),
-- so it can insert into "profiles" on behalf of a brand new user
-- even before that user has an active login session — solving the
-- exact error you hit ("new row violates row-level security policy").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, company_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name'
  );
  return new;
end;
$$;

-- Fire that function automatically every time Supabase Auth
-- creates a new row in auth.users (i.e. right at signup).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
