-- נסיון מקומי של מבנה Supabase: תפקידים, auth ו-storage
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, phone text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
grant usage on schema public, auth, storage to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
alter default privileges in schema public grant all on sequences to authenticated, anon;
grant select, insert on storage.objects to authenticated;
