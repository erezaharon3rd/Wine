create extension if not exists pg_net with schema extensions;
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'outbox_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'outbox_secret');
  end if; end $$;
create or replace function mail_secret_ok(t text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'outbox_secret' and decrypted_secret = t and length(t) > 20) $$;
revoke execute on function mail_secret_ok(text) from public, anon, authenticated;
grant execute on function mail_secret_ok(text) to service_role;
create or replace function mail_kick() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from mail_outbox where sent_at is null and tries < 5 and created_at > now() - interval '2 days') then return; end if;
  perform net.http_post(
    url := 'https://qkmdlnarqtjqjnchmjve.supabase.co/functions/v1/mail-outbox',
    headers := jsonb_build_object('Content-Type','application/json','x-outbox-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'outbox_secret')),
    body := '{}'::jsonb);
end $$;
revoke execute on function mail_kick() from public, anon, authenticated;
select cron.unschedule('mail-outbox') where exists (select 1 from cron.job where jobname = 'mail-outbox');
select cron.schedule('mail-outbox', '*/2 * * * *', 'select public.mail_kick()');
