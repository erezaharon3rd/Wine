-- Grape Arts · התקנה בחלקים · חלק 7 מתוך 8 (שלב 13, חלק א)

-- =====================================================================
-- שלב 13: מנוע אחד, שלושה ערוצים (Grape Arts)
--   כרטיס נוסע ושיוך נעול · קונים עסקיים · יקבים שותפים ומלאי
--   מארזים ורמות · השתתפות אמן והסכמת גלריה · מסגרת תווית
--   סדרות ומהדורות, מרשם קבוע ותעודות · הזמנה חיצונית והצעת מחיר
--   ביקורי סטודיו · טיוטות לשיתוף · קטלוג ציבורי ואימות תעודה
-- =====================================================================

update organizations set name = 'Grape Arts' where kind = 'admin' and name = 'סדנת התווית';

-- ---------- 13.1 כרטיס הנוסע ----------
alter table profiles add column if not exists acq_channel text;
alter table profiles add column if not exists acq_ref text;
alter table profiles add column if not exists acq_at timestamptz;
alter table profiles drop constraint if exists profiles_acq_channel_check;
alter table profiles add constraint profiles_acq_channel_check
  check (acq_channel is null or acq_channel in ('winery_link','invite','direct','admin'));

update profiles set acq_channel = 'winery_link', acq_at = created_at
  where acq_channel is null and role::text = 'customer' and org_id is not null;
update profiles set acq_channel = 'invite', acq_at = created_at
  where acq_channel is null and role is not null and role::text <> 'customer';

-- המקור נקבע פעם אחת. לקוח של יקב עובר ליקב אחר רק על ידי המנהל, והמעבר נרשם ביומן
create or replace function guard_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.acq_channel is not null and (new.acq_channel is distinct from old.acq_channel
     or new.acq_ref is distinct from old.acq_ref or new.acq_at is distinct from old.acq_at) then
    raise exception 'מקור ההצטרפות של משתמש לא משתנה';
  end if;
  if old.role::text = 'customer' and new.org_id is distinct from old.org_id then
    if not is_admin() and auth.uid() is not null then
      raise exception 'רק מנהל המערכת מעביר לקוח בין יקבים';
    end if;
    insert into audit_log (action, entity, entity_id, data)
    values ('customer_transfer', 'profile', new.id::text,
            jsonb_build_object('from', old.org_id, 'to', new.org_id, 'reason', current_setting('app.reason', true)));
  end if;
  return new;
end $$;
drop trigger if exists profiles_card on profiles;
create trigger profiles_card before update on profiles for each row execute function guard_card();

create or replace function customer_transfer(p_user uuid, p_winery uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'רק מנהל המערכת מעביר לקוח'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'צריך לכתוב למה מעבירים'; end if;
  if p_winery is not null and not exists (select 1 from organizations where id = p_winery and kind = 'winery') then
    raise exception 'היקב לא נמצא'; end if;
  perform set_config('app.reason', left(p_reason, 300), true);
  update profiles set org_id = p_winery where id = p_user and role::text = 'customer';
  if not found then raise exception 'הלקוח לא נמצא'; end if;
end $$;
grant execute on function customer_transfer(uuid, uuid, text) to authenticated;

-- הצטרפות דרך קישור של יקב: הכניסה הראשונה קובעת
create or replace function join_as_customer(p_slug text) returns boolean
language plpgsql security definer set search_path = public as $$
declare w uuid;
begin
  select id into w from organizations where slug = p_slug and kind = 'winery' and active;
  if w is null then return false; end if;
  perform set_config('app.bypass', '1', true);
  update profiles set role = 'customer', status = 'active', org_id = w,
         acq_channel = coalesce(acq_channel, 'winery_link'), acq_ref = coalesce(acq_ref, p_slug), acq_at = coalesce(acq_at, now())
  where id = auth.uid() and role is null and status = 'pending';
  return found;
end $$;
grant execute on function join_as_customer(text) to authenticated;

-- הצטרפות ישירה, כלקוח של המערכת
create or replace function join_direct(p_ref text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass', '1', true);
  update profiles set role = 'customer', status = 'active', org_id = null,
         acq_channel = coalesce(acq_channel, 'direct'), acq_ref = coalesce(acq_ref, left(nullif(p_ref, ''), 60)), acq_at = coalesce(acq_at, now())
  where id = auth.uid() and role is null and status = 'pending';
  return found;
end $$;
grant execute on function join_direct(text) to authenticated;

-- קישור צוות: כמו בשלב 12, ובנוסף נרשם המקור
create or replace function join_org(p_token text) returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare i org_invites; em text; ok_mail boolean;
begin
  select * into i from org_invites where token = p_token and not revoked and expires_at > now() for update;
  if not found then return false; end if;
  if i.max_uses is not null and i.uses >= i.max_uses then raise exception 'הקישור כבר נוצל. מבקשים קישור חדש ממנהל המערכת'; end if;
  select lower(email), email_confirmed_at is not null into em, ok_mail from auth.users where id = auth.uid();
  if not coalesce(ok_mail, false) then raise exception 'צריך לאשר את כתובת המייל לפני ההצטרפות'; end if;
  if i.email is not null and lower(trim(i.email)) <> em then raise exception 'הקישור הזה אישי, ושייך לכתובת מייל אחרת'; end if;
  perform set_config('app.bypass', '1', true);
  update profiles set role = i.role, status = 'active', org_id = i.org_id,
         acq_channel = coalesce(acq_channel, 'invite'), acq_ref = coalesce(acq_ref, left(p_token, 8)), acq_at = coalesce(acq_at, now())
  where id = auth.uid() and role is null and status = 'pending';
  if not found then return false; end if;
  update org_invites set uses = uses + 1 where token = p_token;
  if i.role::text = 'artist' and not exists (select 1 from artists where user_id = auth.uid()) then
    insert into artists (user_id, gallery_id, name)
    values (auth.uid(), i.org_id, coalesce((select full_name from profiles where id = auth.uid()), 'אמן'));
    perform set_config('app.bypass', '1', true);
    update profiles set org_id = null where id = auth.uid();
  end if;
  return true;
end $$;
grant execute on function join_org(text) to authenticated;

-- ---------- 13.2 קונים עסקיים ----------
create table if not exists buyers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 2 and 120),
  kind       text not null check (kind in ('company','restaurant','hotel','other')),
  vat_id     text check (vat_id is null or length(vat_id) <= 20),
  created_by uuid default auth.uid() references profiles(id),
  created_at timestamptz not null default now()
);
alter table buyers enable row level security;
alter table profiles add column if not exists buyer_id uuid references buyers(id);
drop policy if exists buyers_read on buyers;
create policy buyers_read on buyers for select to authenticated using (
  is_admin() or id = (select buyer_id from profiles where id = auth.uid()));

create or replace function my_card() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'channel', case when p.role::text = 'customer' and p.org_id is not null then 'winery_customer'
                    when p.role::text = 'customer' then 'direct'
                    else coalesce(p.role::text, 'guest') end,
    'owner_winery', case when p.role::text = 'customer' then p.org_id end,
    'owner_name', (select o.name from organizations o where o.id = p.org_id and p.role::text = 'customer'),
    'price_book', case when p.role::text = 'customer' and p.org_id is not null then 'winery' else 'platform' end,
    'buyer', (select jsonb_build_object('id', b.id, 'name', b.name, 'kind', b.kind) from buyers b where b.id = p.buyer_id),
    'acq', p.acq_channel, 'acq_ref', p.acq_ref, 'acq_at', p.acq_at)
  from profiles p where p.id = auth.uid()
$$;
grant execute on function my_card() to authenticated;

-- ---------- 13.3 יקבים שותפים ומלאי בקבוקים בלי תווית ----------
alter table organizations add column if not exists partner boolean not null default false;
alter table organizations add column if not exists kosher boolean not null default false;
alter table wines add column if not exists direct boolean not null default false;
alter table wines add column if not exists direct_price numeric check (direct_price is null or direct_price > 0);
alter table wines add column if not exists cost_price numeric check (cost_price is null or cost_price >= 0);
alter table wines add column if not exists shiners int not null default 0;
alter table wines add column if not exists drink_by int;
alter table wines drop constraint if exists wines_shiners_check;
alter table wines add constraint wines_shiners_check check (shiners >= 0);

-- ---------- 13.4 מארזים ורמות ----------
create table if not exists packages (
  id       bigint generated by default as identity primary key,
  code     text not null unique,
  name     text not null,
  level    text not null check (level in ('case','collector','patron')),
  bottles  int  not null check (bottles between 1 and 12),
  box      text,
  price    numeric not null default 0 check (price >= 0),   -- המארז עצמו, בלי היין, לפני מע״מ
  includes jsonb not null default '{}',
  active   boolean not null default true,
  sort     int not null default 0
);
alter table packages enable row level security;
drop policy if exists packages_read on packages;
drop policy if exists packages_admin on packages;
create policy packages_read on packages for select to anon, authenticated using (active or is_admin());
create policy packages_admin on packages for all to authenticated using (is_admin()) with check (is_admin());
insert into packages (code, name, level, bottles, box, price, includes, sort) values
  ('single',    'בקבוק במארז',          'case',      1, 'קופסה קשיחה',            35,  '{"card":true}', 1),
  ('duo',       'זוג בקבוקים',          'case',      2, 'קופסה זוגית',            55,  '{"card":true}', 2),
  ('trio',      'שלישייה',              'case',      3, 'ארגז עץ קטן',            75,  '{"card":true}', 3),
  ('case6',     'ארגז שישה',            'case',      6, 'ארגז קרטון מודפס',       60,  '{"card":true}', 4),
  ('collector', 'בקבוק ממוספר',        'collector', 1, 'קופסה קשיחה ממוספרת',    95,  '{"card":true,"certificate":true}', 5),
  ('patron',    'בקבוק ממוספר + הדפס חתום', 'patron',    1, 'קופסת אספנים',           180, '{"card":true,"certificate":true,"print":true}', 6)
on conflict (code) do nothing;

-- ---------- 13.5 השתתפות אמן ברמות והסכמת הגלריה ----------
create table if not exists artist_levels (
  artist_id  uuid not null references artists(id) on delete cascade,
  level      text not null check (level in ('case','collector','patron')),
  artist_ok  boolean not null default false,
  gallery_ok boolean not null default false,
  gallery_by uuid references profiles(id),
  gallery_at timestamptz,
  primary key (artist_id, level)
);
alter table artist_levels enable row level security;
drop policy if exists al_read on artist_levels;
create policy al_read on artist_levels for select to authenticated using (true);
alter table artists add column if not exists visit_cap int not null default 6;

create or replace function set_artist_level(p_artist uuid, p_level text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a artists; r text := my_role()::text; me_art boolean; me_gal boolean; x artist_levels;
begin
  select * into a from artists where id = p_artist;
  if not found then raise exception 'האמן לא נמצא'; end if;
  if p_level not in ('case','collector','patron') then raise exception 'רמה לא מוכרת'; end if;
  me_art := a.user_id = auth.uid();
  me_gal := r = 'gallery' and a.gallery_id = my_org();
  if not (me_art or me_gal or r = 'admin') then raise exception 'רק האמן, הגלריה שלו או המנהל'; end if;
  insert into artist_levels (artist_id, level) values (p_artist, p_level) on conflict do nothing;
  if me_art or r = 'admin' then update artist_levels set artist_ok = p_on where artist_id = p_artist and level = p_level; end if;
  if me_gal or r = 'admin' then
    update artist_levels set gallery_ok = p_on, gallery_by = auth.uid(), gallery_at = now() where artist_id = p_artist and level = p_level;
  end if;
  select * into x from artist_levels where artist_id = p_artist and level = p_level;
  if me_art and not me_gal then perform notify_users(a.gallery_id, 'gallery', null, a.name || ' ' || case when p_on then 'הצטרף' else 'יצא' end || ' לרמה ' || p_level || '. מחכה להסכמת הגלריה'); end if;
  return to_jsonb(x);
end $$;
grant execute on function set_artist_level(uuid, text, boolean) to authenticated;

-- ---------- 13.6 מסגרת תווית: איפה מותר טקסט ולוגו. אף פעם לא על הציור ----------
alter table works add column if not exists frame_zones text[] not null default '{band,neck,back,card}';
alter table works add column if not exists frame_ok boolean not null default false;
alter table works add column if not exists frame_by uuid references profiles(id);
alter table works add column if not exists frame_at timestamptz;
alter table works drop constraint if exists works_frame_zones_check;
alter table works add constraint works_frame_zones_check check (frame_zones <@ array['band','neck','back','card']::text[]);

create or replace function set_frame(p_work bigint, p_zones text[], p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare a artists; r text := my_role()::text;
begin
  select ar.* into a from works w join artists ar on ar.id = w.artist_id where w.id = p_work;
  if not found then raise exception 'היצירה לא נמצאה'; end if;
  if not (a.user_id = auth.uid() or (r = 'gallery' and a.gallery_id = my_org()) or r = 'admin') then
    raise exception 'רק האמן, הגלריה שלו או המנהל'; end if;
  if p_zones is null or not (p_zones <@ array['band','neck','back','card']::text[]) then raise exception 'אזור לא מוכר'; end if;
  perform set_config('app.bypass', '1', true);
  update works set frame_zones = p_zones, frame_ok = p_ok, frame_by = auth.uid(), frame_at = now() where id = p_work;
end $$;
grant execute on function set_frame(bigint, text[], boolean) to authenticated;

-- ---------- 13.7 סדרות ומהדורות ----------
create table if not exists series (
  id              bigint generated by default as identity primary key,
  work_id         bigint not null references works(id),
  wine_id         bigint references wines(id),
  kind            text not null check (kind in ('open','closed')),
  name            text,
  size            int,
  next_no         int not null default 1,
  closed_at       timestamptz,
  levels          text[] not null default '{case}',
  print_technique text,
  print_size      int,
  print_next      int not null default 1,
  print_price     numeric check (print_price is null or print_price >= 0),
  created_by      uuid default auth.uid() references profiles(id),
  created_at      timestamptz not null default now(),
  check ((kind = 'open' and size is null) or (kind = 'closed' and size between 1 and 5000)),
  check (print_size is null or print_size between 1 and 500),
  check (levels <@ array['case','collector','patron']::text[])
);
alter table series enable row level security;
drop policy if exists series_read on series;
create policy series_read on series for select to authenticated using (true);

-- מהדורה סגורה: הגודל לא משתנה אחרי שהוקצה מספר, ומהדורה שנסגרה לא נפתחת שוב. גם לא על ידי המנהל
create or replace function guard_series() returns trigger
language plpgsql as $$
begin
  if old.closed_at is not null and (new.closed_at is null or new.closed_at <> old.closed_at) then
    raise exception 'מהדורה שנסגרה לא נפתחת שוב'; end if;
  if new.kind <> old.kind or new.work_id <> old.work_id then raise exception 'סוג המהדורה והיצירה לא משתנים'; end if;
  if old.next_no > 1 and new.size is distinct from old.size then raise exception 'גודל המהדורה לא משתנה אחרי שהוקצו מספרים'; end if;
  if old.print_next > 1 and new.print_size is distinct from old.print_size then raise exception 'גודל מהדורת ההדפס לא משתנה אחרי שהוקצו מספרים'; end if;
  if new.next_no < old.next_no or new.print_next < old.print_next then raise exception 'מספור לא חוזר אחורה'; end if;
  if new.kind = 'closed' and new.next_no > new.size and new.closed_at is null then new.closed_at := now(); end if;
  return new;
end $$;
drop trigger if exists series_guard on series;
create trigger series_guard before update on series for each row execute function guard_series();

create or replace function series_create(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare w works; a artists; r text := my_role()::text; nid bigint;
begin
  select * into w from works where id = (p ->> 'work')::bigint;
  if not found or w.status <> 'live' then raise exception 'היצירה אינה זמינה'; end if;
  select * into a from artists where id = w.artist_id;
  if not (r = 'admin' or (r = 'gallery' and a.gallery_id = my_org())) then raise exception 'רק הגלריה של האמן או המנהל'; end if;
  insert into series (work_id, wine_id, kind, name, size, levels, print_technique, print_size, print_price)
  values (w.id, nullif(p ->> 'wine', '')::bigint, p ->> 'kind', nullif(p ->> 'name', ''),
          case when p ->> 'kind' = 'closed' then (p ->> 'size')::int end,
          coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'levels') x), '{case}'),
          nullif(p ->> 'print_technique', ''), nullif(p ->> 'print_size', '')::int, nullif(p ->> 'print_price', '')::numeric)
  returning id into nid;
  if (select array['collector','patron'] && levels from series where id = nid) and (select kind from series where id = nid) <> 'closed' then
    raise exception 'רמות האספנים והפטרון דורשות מהדורה סגורה וממוספרת'; end if;
  if exists (select 1 from series where id = nid and 'patron' = any(levels)) and
     ((select print_size from series where id = nid) is null or nullif(p ->> 'print_technique', '') is null) then
    raise exception 'לרמת הפטרון צריך גודל מהדורת הדפס ושם טכניקה מדויק'; end if;
  return nid;
end $$;
grant execute on function series_create(jsonb) to authenticated;

-- המרשם הקבוע: כל מספר שניתן. לא נמחק ולא משתנה
create table if not exists edition_items (
  id                 bigint generated by default as identity primary key,
  series_id          bigint not null references series(id),
  kind               text not null default 'bottle' check (kind in ('bottle','print')),
  no                 int not null,
  order_id           bigint,
  verify             text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  signed_at          timestamptz,
  signed_by          uuid references profiles(id),
  gallery_stamped_at timestamptz,
  created_at         timestamptz not null default now(),
  unique (series_id, kind, no)
);
alter table edition_items enable row level security;
create or replace function guard_edition_item() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'המרשם לא נמחק'; end if;
  if new.series_id <> old.series_id or new.kind <> old.kind or new.no <> old.no
     or new.verify <> old.verify or new.order_id is distinct from old.order_id then
    raise exception 'המרשם לא משתנה'; end if;
  return new;
end $$;
drop trigger if exists edition_items_guard on edition_items;
create trigger edition_items_guard before update or delete on edition_items for each row execute function guard_edition_item();

