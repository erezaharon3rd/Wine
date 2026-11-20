-- Grape Arts · התקנה בחלקים · חלק 4 מתוך 8
-- מריצים לפי הסדר: 1, 2, 3... כל חלק בנפרד. מותר להריץ שוב חלק שכבר רץ.

-- =====================================================================
--  שלב 4 · לקראת עלייה לאוויר
--  עלות ותקציב למנוע, מפסק בטיחות, תור עבודות, הגבלות קבצים,
--  הצטרפות עצמית, מדידת שימוש בלי פרטים אישיים, בדיקת תקינות
-- =====================================================================

-- ---------- מנוע: עלות, תקציב חודשי ומכסה לפי ארגון ----------
alter table settings add column if not exists cost_image numeric not null default 0.5;     -- ₪ לצילום, הערכה
alter table settings add column if not exists cost_text  numeric not null default 0.02;    -- ₪ לניתוח
alter table settings add column if not exists engine_budget numeric not null default 300;  -- ₪ לחודש, לכל המערכת
alter table settings add column if not exists customer_render_quota int not null default 3;
alter table settings add column if not exists breaker_fails int not null default 6;        -- כשלים ב-10 דקות שמשביתים את המנוע
alter table organizations add column if not exists render_quota int;                       -- ריק = לפי ההגדרה הכללית
alter table engine_usage add column if not exists org_id uuid;
alter table engine_usage add column if not exists cost numeric not null default 0;
alter table engine_usage add column if not exists state text not null default 'pending';
do $$ begin
  alter table engine_usage add constraint engine_usage_state check (state in ('pending','ok','failed'));
exception when duplicate_object then null; end $$;
create index if not exists engine_usage_org_idx on engine_usage (org_id, kind, created_at);
create index if not exists engine_usage_time_idx on engine_usage (created_at);
-- שימוש ישן שלא דווח עליו נחשב כמוצלח
update engine_usage set state = 'ok' where state = 'pending' and created_at < now() - interval '10 minutes';

create or replace function engine_spend_month() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost), 0) from engine_usage where state <> 'failed' and created_at >= date_trunc('month', now())
$$;

-- מפסק בטיחות: הרבה כשלים ברצף משביתים את המנוע ל-10 דקות
create or replace function engine_breaker_open() returns boolean
language sql stable security definer set search_path = public as $$
  select count(*) filter (where state = 'failed') >= (select breaker_fails from settings where id = 1)
     and count(*) filter (where state = 'failed') > count(*) filter (where state = 'ok')
  from engine_usage where created_at > now() - interval '10 minutes'
$$;

create or replace function engine_quota_of() returns int
language sql stable security definer set search_path = public as $$
  select case when my_role()::text = 'customer' then (select customer_render_quota from settings where id = 1)
              else coalesce((select render_quota from organizations where id = my_org()), (select render_quota from settings where id = 1)) end
$$;

create or replace function engine_used_month() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from engine_usage
  where kind = 'image' and state <> 'failed' and created_at >= date_trunc('month', now())
    and case when my_role()::text = 'customer' or my_org() is null then user_id = auth.uid() else org_id = my_org() end
$$;

create or replace function engine_take(p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare s settings; used int; minute int; day_all int; lim int; c numeric; o uuid := my_org();
begin
  if my_role() is null then raise exception 'החשבון עוד לא אושר'; end if;
  if p_kind not in ('image','text') then raise exception 'סוג שימוש לא מוכר'; end if;
  select * into s from settings where id = 1;
  if engine_breaker_open() then raise exception 'המנוע מושבת לכמה דקות בגלל תקלה אצל הספק. כדאי לנסות שוב בעוד רבע שעה'; end if;
  perform pg_advisory_xact_lock(hashtext('engine:' || coalesce(o::text, auth.uid()::text)));

  select count(*) into minute from engine_usage where user_id = auth.uid() and created_at > now() - interval '1 minute';
  if minute >= s.engine_per_minute then raise exception 'יותר מדי בקשות בדקה. כדאי לחכות רגע'; end if;

  c := case p_kind when 'image' then s.cost_image else s.cost_text end;
  if engine_spend_month() + c > s.engine_budget and not is_admin() then
    raise exception 'תקציב המנוע לחודש הזה נוצל. מנהל המערכת יכול להגדיל אותו'; end if;

  if p_kind = 'image' then
    used := engine_used_month(); lim := engine_quota_of();
    if used >= lim and not is_admin() then raise exception 'מכסת הצילומים לחודש הזה נגמרה. מנהל המערכת יכול להגדיל אותה'; end if;
    select count(*) into day_all from engine_usage where kind = 'image' and state <> 'failed' and created_at >= date_trunc('day', now());
    if day_all >= s.engine_daily_cap then raise exception 'המנוע הגיע לתקרה היומית של המערכת. כדאי לנסות מחר'; end if;
  else
    select count(*) into used from engine_usage where user_id = auth.uid() and kind = 'text' and state <> 'failed'
      and created_at >= date_trunc('day', now());
    lim := s.text_daily_quota;
    if used >= lim and not is_admin() then raise exception 'מכסת הניתוחים להיום נגמרה'; end if;
  end if;

  insert into engine_usage (user_id, kind, org_id, cost) values (auth.uid(), p_kind, case when my_role()::text = 'customer' then null else o end, c);
  return greatest(0, lim - used - 1);
end $$;
revoke execute on function engine_take(text) from public, anon;
grant execute on function engine_take(text) to authenticated;

-- אחרי התשובה מהספק: הצלחה נספרת, כישלון לא נספר ונכנס למפסק
create or replace function engine_report(p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update engine_usage set state = case when p_ok then 'ok' else 'failed' end,
                          cost = case when p_ok then cost else 0 end
  where id = (select id from engine_usage where user_id = auth.uid() and state = 'pending' order by created_at desc limit 1);
end $$;
revoke execute on function engine_report(boolean) from public, anon;
grant execute on function engine_report(boolean) to authenticated;

create or replace function render_quota_left() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, engine_quota_of() - engine_used_month())
$$;

-- סיכום למנהל: הוצאה החודש, תקציב, מצב המפסק
create or replace function engine_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s settings;
begin
  if not is_admin() then raise exception 'רק מנהל המערכת'; end if;
  select * into s from settings where id = 1;
  return jsonb_build_object(
    'spend', engine_spend_month(), 'budget', s.engine_budget, 'breaker', engine_breaker_open(),
    'images', (select count(*) from engine_usage where kind = 'image' and state = 'ok' and created_at >= date_trunc('month', now())),
    'texts',  (select count(*) from engine_usage where kind = 'text'  and state = 'ok' and created_at >= date_trunc('month', now())),
    'failed', (select count(*) from engine_usage where state = 'failed' and created_at > now() - interval '24 hours'),
    'by_org', (select coalesce(jsonb_object_agg(coalesce(o.name, 'לקוחות'), n), '{}') from
               (select org_id, count(*) n from engine_usage where kind = 'image' and state <> 'failed'
                and created_at >= date_trunc('month', now()) group by org_id) u left join organizations o on o.id = u.org_id));
end $$;
grant execute on function engine_status() to authenticated;

-- ---------- תור עבודות: לקיחה בטוחה במקביל, ניסיונות חוזרים, רשימת כשלים ----------
create table if not exists jobs (
  id          bigint generated by default as identity primary key,
  kind        text not null,
  payload     jsonb not null default '{}',
  state       text not null default 'queued' check (state in ('queued','running','done','dead')),
  attempts    int not null default 0,
  max_attempts int not null default 3,
  run_after   timestamptz not null default now(),
  locked_until timestamptz,
  last_error  text,
  result      jsonb,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);
create index if not exists jobs_ready_idx on jobs (state, run_after);
alter table jobs enable row level security;
drop policy if exists jobs_read on jobs;
create policy jobs_read on jobs for select to authenticated using (created_by = auth.uid() or is_admin());

create or replace function job_enqueue(p_kind text, p_payload jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare i bigint;
begin
  if my_role() is null then raise exception 'החשבון עוד לא אושר'; end if;
  if p_kind not in ('render','analyze','print_pdf','preview') then raise exception 'סוג עבודה לא מוכר'; end if;
  insert into jobs (kind, payload) values (p_kind, coalesce(p_payload, '{}')) returning id into i;
  return i;
end $$;
grant execute on function job_enqueue(text, jsonb) to authenticated;

-- המעבד לוקח עבודה אחת. עבודה שנתקעה חוזרת לתור אחרי שהזמן שלה עבר
create or replace function job_claim(p_kinds text[], p_seconds int default 120) returns jobs
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs
  where kind = any(p_kinds) and run_after <= now()
    and (state = 'queued' or (state = 'running' and locked_until < now()))
  order by run_after, id for update skip locked limit 1;
  if not found then return null; end if;
  update jobs set state = 'running', attempts = attempts + 1, locked_until = now() + make_interval(secs => p_seconds)
  where id = j.id returning * into j;
  return j;
end $$;

create or replace function job_finish(p_id bigint, p_ok boolean, p_result jsonb default null, p_error text default null) returns text
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_id for update;
  if not found or j.state <> 'running' then return null; end if;
  if p_ok then
    update jobs set state = 'done', result = p_result, done_at = now(), locked_until = null where id = p_id; return 'done';
  elsif j.attempts >= j.max_attempts then
    update jobs set state = 'dead', last_error = left(p_error, 500), locked_until = null where id = p_id; return 'dead';
  else
    update jobs set state = 'queued', last_error = left(p_error, 500), locked_until = null,
      run_after = now() + make_interval(secs => 30 * power(2, j.attempts - 1)::int) where id = p_id;   -- 30, 60, 120 שניות
    return 'queued';
  end if;
end $$;
-- הלקיחה והסיום רק למעבד בשרת (service role), לא לדפדפן
revoke execute on function job_claim(text[], int) from public, anon, authenticated;
revoke execute on function job_finish(bigint, boolean, jsonb, text) from public, anon, authenticated;

-- ---------- הגבלות קבצים באחסון ----------
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    update storage.buckets set file_size_limit = 40 * 1024 * 1024, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/tiff'] where id = 'works';
    update storage.buckets set file_size_limit = 6 * 1024 * 1024,  allowed_mime_types = array['image/jpeg','image/webp'] where id = 'previews';
    update storage.buckets set file_size_limit = 12 * 1024 * 1024, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'renders';
    update storage.buckets set file_size_limit = 20 * 1024 * 1024, allowed_mime_types = array['application/pdf','image/png'] where id in ('contracts','print');
  end if;
end $$;

-- ---------- הצטרפות עצמית: בקשה, ואישור שיוצר ארגון ומשייך ----------
alter table applications add column if not exists user_id uuid default auth.uid();
alter table applications add column if not exists note text;
create unique index if not exists applications_one_open on applications (created_by) where status = 'new';

create or replace function application_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.kind::text not in ('gallery','artist','winery','printer') then raise exception 'סוג הצטרפות לא מוכר'; end if;
    if length(coalesce(new.name,'')) not between 2 and 80 or length(coalesce(new.details,'')) > 600
       or length(coalesce(new.site,'')) > 200 or length(coalesce(new.contact,'')) > 120 or length(coalesce(new.why,'')) > 600 then
      raise exception 'אחד השדות ארוך מדי או חסר'; end if;
    new.status := 'new'; new.created_by := auth.uid(); new.user_id := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists application_guard_t on applications;
create trigger application_guard_t before insert on applications for each row execute function application_guard();

create or replace function application_decide(p_id bigint, p_ok boolean, p_gallery uuid default null, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare a applications; org uuid;
begin
  if coalesce(my_role()::text, '') not in ('admin','curator') then raise exception 'רק מנהל או אוצר מאשרים הצטרפות'; end if;
  select * into a from applications where id = p_id for update;
  if not found or a.status <> 'new' then raise exception 'הבקשה כבר טופלה'; end if;
  if not p_ok then
    update applications set status = 'rejected', note = left(p_note, 500) where id = p_id;
    if a.user_id is not null then perform notify_users(null, null, a.user_id, 'בקשת ההצטרפות לא אושרה' || coalesce(': ' || p_note, '')); end if;
    return 'rejected';
  end if;
  perform set_config('app.bypass', '1', true);
  if a.kind::text = 'artist' then
    if p_gallery is null then select id into p_gallery from organizations where kind = 'gallery' order by created_at limit 1; end if;
    if a.user_id is not null then
      update profiles set role = 'artist', status = 'active', org_id = null where id = a.user_id and role is null;
      insert into artists (user_id, gallery_id, name) select a.user_id, p_gallery, a.name
      where not exists (select 1 from artists where user_id = a.user_id);
    end if;
  else
    insert into organizations (kind, name, details) values (a.kind, a.name,
      jsonb_build_object('site', a.site, 'contact', a.contact, 'about', a.details)) returning id into org;
    if a.user_id is not null then
      update profiles set role = a.kind, status = 'active', org_id = org where id = a.user_id and role is null;
    end if;
  end if;
  update applications set status = 'approved', note = left(p_note, 500) where id = p_id;
  if a.user_id is not null then perform notify_users(null, null, a.user_id, 'בקשת ההצטרפות אושרה. אפשר להתחיל'); end if;
  return 'approved';
end $$;
grant execute on function application_decide(bigint, boolean, uuid, text) to authenticated;

-- ---------- מדידת שימוש: ספירות בלבד, בלי מזהה משתמש ----------
create table if not exists usage_daily (
  day   date not null default current_date,
  event text not null,
  role  text not null default '',
  n     int  not null default 0,
  primary key (day, event, role)
);
alter table usage_daily enable row level security;
drop policy if exists usage_read on usage_daily;
create policy usage_read on usage_daily for select to authenticated using (is_admin());

create or replace function track(p_event text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event !~ '^[a-z_]{2,32}$' then return; end if;
  insert into usage_daily (event, role, n) values (p_event, coalesce(my_role()::text, 'guest'), 1)
  on conflict (day, event, role) do update set n = usage_daily.n + 1;
end $$;
grant execute on function track(text) to authenticated, anon;

-- ---------- בדיקת תקינות לשירות ניטור חיצוני ----------
create or replace function health() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('db', true, 'engine_breaker', engine_breaker_open(),
    'engine_budget_used_pct', round(100 * engine_spend_month() / nullif((select engine_budget from settings where id = 1), 0)),
    'jobs_dead_24h', (select count(*) from jobs where state = 'dead' and created_at > now() - interval '24 hours'),
    'at', now())
$$;
grant execute on function health() to anon, authenticated;

-- =====================================================================
--  שלב 5 · ניטור שגיאות בלי שירות חיצוני
--  שגיאות מהדפדפן נספרות לפי סוג, בלי פרטי משתמש
-- =====================================================================
create table if not exists client_errors (
  id       bigint generated by default as identity primary key,
  sig      text not null unique,          -- טביעת אצבע של ההודעה והמקום
  message  text not null,
  place    text,
  role     text,
  n        int not null default 1,
  first_at timestamptz not null default now(),
  last_at  timestamptz not null default now(),
  resolved boolean not null default false
);
alter table client_errors enable row level security;
drop policy if exists cerr_admin on client_errors;
create policy cerr_admin on client_errors for all to authenticated using (is_admin()) with check (is_admin());

create or replace function log_error(p_message text, p_place text default null) returns void
language plpgsql security definer set search_path = public as $$
declare m text; pl text; s text;
begin
  -- בלי פרטים אישיים: כתובות מייל, מספרים ארוכים ומזהים מוחלפים
  m := left(regexp_replace(regexp_replace(regexp_replace(coalesce(p_message,''),
         '[\w.+-]+@[\w-]+\.[\w.]+', '<email>', 'g'),
         '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', 'gi'),
         '\d{5,}', '<n>', 'g'), 300);
  pl := left(regexp_replace(coalesce(p_place,''), '\?.*$', ''), 120);
  if m = '' then return; end if;
  s := md5(m || '|' || pl);
  insert into client_errors (sig, message, place, role) values (s, m, pl, coalesce(my_role()::text, 'guest'))
  on conflict (sig) do update set n = client_errors.n + 1, last_at = now(),
    resolved = case when client_errors.last_at < now() - interval '1 day' then false else client_errors.resolved end;
end $$;
grant execute on function log_error(text, text) to authenticated, anon;

create or replace function health() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('db', true, 'engine_breaker', engine_breaker_open(),
    'engine_budget_used_pct', round(100 * engine_spend_month() / nullif((select engine_budget from settings where id = 1), 0)),
    'jobs_dead_24h', (select count(*) from jobs where state = 'dead' and created_at > now() - interval '24 hours'),
    'client_errors_1h', (select coalesce(sum(n), 0) from client_errors where last_at > now() - interval '1 hour' and not resolved),
    'at', now())
$$;
grant execute on function health() to anon, authenticated;

-- =====================================================================
--  שלב 6 · בדיקת קובץ אוטומטית במקום בדיקה ידנית של האוצרת
--  השרת אוכף את אותם כללים: מספיק פיקסלים לתווית, בלי כפילויות.
--  אישור הגלריה מפרסם ישר למאגר; העלאה של הגלריה עצמה מתפרסמת מיד.
-- =====================================================================
alter table works add column if not exists phash text;
alter table works add column if not exists file_check jsonb;
create index if not exists works_phash_idx on works (phash) where phash is not null;

-- DPI על אזור הציור בתווית רגילה (72×93 מ״מ)
create or replace function label_dpi(w int, h int) returns int
language sql immutable as $$ select floor(least(w / (72 / 25.4), h / (93 / 25.4)))::int $$;

create or replace function hamming64(a text, b text) returns int
language sql immutable as $$
  select bit_count(('x' || lpad(a, 16, '0'))::bit(64) # ('x' || lpad(b, 16, '0'))::bit(64))::int
$$;

create or replace function guard_work() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(my_role()::text, ''); d works;
begin
  if tg_op = 'INSERT' and auth.uid() is not null then
    -- בדיקת הקובץ: אותם כללים כמו בדפדפן
    if new.px_w is null or new.px_h is null then raise exception 'חסרים נתוני הקובץ. כדאי להעלות שוב'; end if;
    if label_dpi(new.px_w, new.px_h) < 240 then
      raise exception 'הרזולוציה נמוכה מדי להדפסה: % DPI על התווית, וצריך לפחות 240', label_dpi(new.px_w, new.px_h); end if;
    if new.phash is not null and new.phash !~ '^[0-9a-f]{16}$' then raise exception 'טביעת האצבע של התמונה לא תקינה'; end if;
    select * into d from works where phash is not null and new.phash is not null and hamming64(phash, new.phash) <= 5 limit 1;
    if found then raise exception 'היצירה כבר נמצאת במאגר: "%"', d.title; end if;
  end if;
  if r not in ('curator','admin') and auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.pick_rank := null;
      -- גלריה שמעלה בעצמה כבר אישרה: הקובץ נבדק, אז היצירה עולה ישר למאגר
      new.status := case when r = 'gallery' then 'live' else 'pending' end;
    elsif new.status is distinct from old.status and r = 'gallery'
          and old.status in ('pending','review') and new.status in ('live','rejected') then
      null;   -- אישור הגלריה מפרסם; הבדיקה הטכנית כבר נעשתה בהעלאה
    elsif new.status is distinct from old.status and new.status in ('live','review','rejected') then
      raise exception 'רק הגלריה מאשרת יצירות';
    elsif new.pick_rank is distinct from old.pick_rank then
      new.pick_rank := old.pick_rank;
    end if;
    if tg_op = 'UPDATE' and (new.phash is distinct from old.phash or new.px_w is distinct from old.px_w or new.px_h is distinct from old.px_h)
       and r <> 'gallery' and old.status = 'live' then
      raise exception 'אי אפשר להחליף את הקובץ של יצירה שכבר פורסמה';
    end if;
  end if;
  return new;
end $$;

-- יצירות שחיכו לבדיקה ידנית: אם הקובץ מתאים, הן עוברות למאגר
update works set status = 'live'
where status = 'review' and px_w is not null and px_h is not null and label_dpi(px_w, px_h) >= 240;

select 'חלק 4 מתוך 8 הסתיים בהצלחה' as result;
