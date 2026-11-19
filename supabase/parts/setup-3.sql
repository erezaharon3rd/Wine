-- סדנת התווית · התקנה בחלקים · חלק 3 מתוך 6
-- מריצים לפי הסדר: 1, 2, 3... כל חלק בנפרד. מותר להריץ שוב חלק שכבר רץ.

-- =====================================================================
--  שלב 3 · חיזוק לפיילוט
--  מחיר בשרת, טבלת מעברים, גרסאות, מזהים חד־פעמיים, יומן אוטומטי,
--  אחסון פרטי ותצוגות מקדימות, קישורי הצטרפות, הסכמה מראש,
--  תבניות חוזה, מחיקת חשבון, מטמון צילומים
-- =====================================================================

-- ---------- עמודות חדשות ----------
alter table deals            add column if not exists version int not null default 1;
alter table customer_orders  add column if not exists version int not null default 1;
alter table customer_orders  add column if not exists client_key uuid unique;
alter table works            add column if not exists preview_path text;
alter table works            add column if not exists thumb_path text;
alter table artists          add column if not exists pre_consent boolean not null default false;
alter table contracts        add column if not exists template_version int;
alter table contracts        add column if not exists terms_hash text;
alter table renders          add column if not exists design_hash text;
create index if not exists renders_hash_idx on renders(design_hash);

-- לקוח שמחק את חשבונו: ההזמנות נשארות בלי שם
alter table customer_orders alter column customer_id drop not null;
alter table customer_orders drop constraint if exists customer_orders_customer_id_fkey;
alter table customer_orders add constraint customer_orders_customer_id_fkey
  foreign key (customer_id) references profiles(id) on delete set null;

-- ---------- גרסה עולה בכל עדכון ----------
create or replace function bump_version() returns trigger
language plpgsql as $$ begin new.version := old.version + 1; return new; end $$;
drop trigger if exists deals_version on deals;
create trigger deals_version before update on deals for each row execute function bump_version();
drop trigger if exists corders_version on customer_orders;
create trigger corders_version before update on customer_orders for each row execute function bump_version();

-- ---------- יומן: נכתב רק מהשרת ----------
drop policy if exists log_ins on audit_log;
create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
        n jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
        d jsonb := '{}'::jsonb; k text; id text;
begin
  for k in select jsonb_object_keys(o || n) loop
    if k in ('version','updated_at','created_at','log','pop_score','excl_lock') then continue; end if;
    if (o -> k) is distinct from (n -> k) then
      d := d || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
    end if;
  end loop;
  if d = '{}'::jsonb then return coalesce(new, old); end if;
  id := coalesce(n ->> 'id', o ->> 'id');
  insert into audit_log (actor, action, entity, entity_id, data)
  values (auth.uid(), lower(tg_op) || ':' || tg_table_name, tg_table_name, id, d);
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['works','organizations','profiles','settings','artists','wines'] loop
    execute format('drop trigger if exists audit_%1$s on %1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$s for each row execute function audit_row()', t);
  end loop;
end $$;

-- ---------- מחיר הזמנת לקוח: נקבע בשרת ----------
create or replace function corder_price(p_winery uuid, d jsonb) returns numeric
language plpgsql stable security definer set search_path = public as $$
begin return corder_price_of(coalesce((select pricing from organizations where id = p_winery), '{}'), d); end $$;
-- הנוסחה עצמה, בלי גישה לטבלאות. זהה ל-domain/pricing.ts ולמחירון בדפדפן
create or replace function corder_price_of(pr jsonb, d jsonb) returns numeric
language plpgsql immutable as $$
declare base numeric; art numeric; shp numeric; unit numeric; q int; disc numeric;
begin
  pr := coalesce(pr, '{}');
  base := coalesce((pr -> 'prices' ->> (d ->> 'wine'))::numeric, 100);
  art  := coalesce((pr -> 'artist' ->> (d ->> 'artist'))::numeric, 0);
  shp  := coalesce((coalesce(pr -> 'shape', '{"rect":0,"oval":2,"arch":3}') ->> (d ->> 'shape'))::numeric, 0);
  unit := base + art + shp
        + case when (d ->> 'foil')::boolean then coalesce((pr ->> 'foil')::numeric, 6) else 0 end
        + case when (d ->> 'emboss')::boolean then coalesce((pr ->> 'emboss')::numeric, 4) else 0 end;
  q := greatest(1, coalesce((d ->> 'qty')::int, 1));
  disc := case
    when q >= coalesce((pr ->> 't2')::int, 60) then coalesce((pr ->> 'd2')::numeric, 15)
    when q >= coalesce((pr ->> 't1')::int, 24) then coalesce((pr ->> 'd1')::numeric, 10)
    when q >= 6 then coalesce((pr ->> 'caseDisc')::numeric, 5)
    else 0 end;
  return round(unit * (1 - disc / 100)) * q;
end $$;

-- בדיקת העיצוב שהלקוח או היקב שולחים
create or replace function corder_check(p_winery uuid, d jsonb) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if d is null or jsonb_typeof(d) <> 'object' then raise exception 'העיצוב חסר'; end if;
  if not exists (select 1 from wines where id = (d ->> 'wine')::bigint and winery_id = p_winery) then
    raise exception 'היין לא שייך ליקב'; end if;
  if not exists (select 1 from works where id = (d ->> 'work')::bigint and status = 'live') then
    raise exception 'היצירה אינה זמינה'; end if;
  if coalesce((d ->> 'qty')::int, 0) not between 1 and 10000 then raise exception 'כמות לא תקינה'; end if;
  if length(coalesce(d ->> 'name', '')) > 24 then raise exception 'השם על התווית ארוך מדי'; end if;
  if length(coalesce(d ->> 'ded', '')) > 40 then raise exception 'ההקדשה ארוכה מדי'; end if;
  if coalesce(d ->> 'shape', 'rect') not in ('rect','oval','arch') then raise exception 'צורת תווית לא מוכרת'; end if;
  if coalesce((d ->> 'pos')::int, 50) not between 0 and 100 or coalesce((d ->> 'zoom')::int, 100) not between 100 and 200 then
    raise exception 'מיקום לא תקין'; end if;
end $$;

create or replace function corder_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(new.cust ->> 'n', '')) not between 1 and 80
     or length(coalesce(new.cust ->> 'ph', '')) > 30
     or length(coalesce(new.cust ->> 'em', '')) > 120
     or length(coalesce(new.cust ->> 'note', '')) > 500 then
    if tg_op = 'INSERT' then raise exception 'פרטי הקשר אינם תקינים'; end if;
  end if;
  perform corder_check(new.winery_id, new.design);
  if new.winery_design is not null then perform corder_check(new.winery_id, new.winery_design); end if;
  new.total := corder_price(new.winery_id, coalesce(new.winery_design, new.design));
  return new;
end $$;
drop trigger if exists corder_guard_t on customer_orders;
create trigger corder_guard_t before insert or update of design, winery_design, cust on customer_orders
  for each row execute function corder_guard();

-- ---------- טבלת מעברים לעסקה ----------
create table if not exists deal_transitions (
  from_status deal_status not null,
  action      text not null,
  to_status   deal_status not null,
  roles       text[] not null,     -- מי מורשה. 'artist:own' = האמן של העסקה וכו'
  primary key (from_status, action)
);
alter table deal_transitions enable row level security;
drop policy if exists dt_read on deal_transitions;
create policy dt_read on deal_transitions for select to authenticated using (true);
insert into deal_transitions values
  ('sent',   'price',   'priced',    '{gallery:own,admin}'),
  ('priced', 'approve', 'sign',      '{artist:own,admin}'),
  ('priced', 'change',  'sent',      '{artist:own,admin}'),
  ('sent',   'reject',  'rejected',  '{gallery:own,artist:own,admin}'),
  ('priced', 'reject',  'rejected',  '{gallery:own,artist:own,admin}'),
  ('sign',   'sign',    'pay',       '{winery:own}'),
  ('pay',    'paid',    'active',    '{gallery:own,admin}'),
  ('active', 'order',   'active',    '{winery:own,admin}'),
  ('sent',   'cancel',  'cancelled', '{winery:own,admin}'),
  ('priced', 'cancel',  'cancelled', '{winery:own,admin}'),
  ('sign',   'cancel',  'cancelled', '{winery:own,admin}')
on conflict (from_status, action) do update set to_status = excluded.to_status, roles = excluded.roles;

create or replace function deal_allowed(x deals, p_action text) returns deal_status
language plpgsql stable security definer set search_path = public as $$
declare t deal_transitions; r text := my_role()::text; ok boolean := false; who text;
begin
  select * into t from deal_transitions where from_status = x.status and action = p_action;
  if not found then return null; end if;
  foreach who in array t.roles loop
    ok := ok or (who = 'admin' and r = 'admin')
              or (who = 'gallery:own' and r = 'gallery' and x.gallery_id = my_org())
              or (who = 'winery:own'  and r = 'winery'  and x.winery_id  = my_org())
              or (who = 'artist:own'  and x.artist_id = my_artist() and r in ('artist','admin'));
  end loop;
  return case when ok then t.to_status end;
end $$;

-- ---------- תבניות חוזה ----------
create table if not exists contract_templates (
  version    int primary key,
  body       text not null,
  active     boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table contract_templates enable row level security;
drop policy if exists ct_read on contract_templates;
drop policy if exists ct_admin on contract_templates;
create policy ct_read  on contract_templates for select to authenticated using (my_role() is not null);
create policy ct_admin on contract_templates for all to authenticated using (is_admin()) with check (is_admin());
insert into contract_templates (version, active, body) values (1, true,
'1. הצדדים
{gallery}, בשם האמן {artist} ("הגלריה"), ו־{winery} ("היקב").

2. היצירה והשימוש
היצירה "{work}" על תווית היין "{wine}", על הקרטון ובשיווק הבקבוק בלבד. שימוש נוסף, כמו מוצרי משנה, דורש רישיון נפרד.

3. תקופה וכמות
{type}, {qty} בקבוקים, בישראל{exclusive}. בסוף הרישיון יש שישה חודשים למכירת מלאי שכבר הודפס.

4. זכויות
זכות היוצרים נשארת בידי האמן. שם האמן מופיע על התווית. חיתוך או שינוי צבע מעבר לאזורים שהאמן סימן מחייבים את אישורו.{restrict}

5. תמורה
{price} לפני מע״מ. התשלום לפי חשבונית הגלריה. הקבצים נמסרים אחרי שהתשלום מאושר.

6. ביטול ומחלוקות
ביטול לפני חתימה ללא עלות. קבצים פגומים שלא תוקנו מזכים בביטול ובהחזר. מחלוקת נפתרת בגישור, ולאחר מכן לפי הדין בישראל.')
on conflict (version) do nothing;

-- ---------- מזהים חד־פעמיים ----------
create table if not exists idem_keys (
  key        uuid primary key,
  user_id    uuid not null default auth.uid(),
  result     text,
  created_at timestamptz not null default now()
);
alter table idem_keys enable row level security;   -- רק הפונקציות ניגשות אליה

-- ---------- בקשת רישיון (עם מזהה חד־פעמי) ----------
drop function if exists request_license(bigint,bigint,text,text,text,text,boolean);
create or replace function request_license(
  p_work bigint, p_wine bigint, p_design text, p_label text,
  p_type text, p_qty text, p_exclusive boolean, p_key uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare w works; a artists; new_id bigint; prev text;
begin
  if coalesce(my_role()::text, '') <> 'winery' then raise exception 'רק יקב יכול לשלוח בקשה'; end if;
  if p_key is not null then
    select result into prev from idem_keys where key = p_key and user_id = auth.uid();
    if found then return prev::bigint; end if;
  end if;
  if p_type not in ('one','series') or p_qty not in ('a','b','c') then raise exception 'סוג רישיון לא תקין'; end if;
  select * into w from works where id = p_work and status = 'live' and available;
  if not found then raise exception 'היצירה אינה זמינה'; end if;
  if p_wine is not null and not exists (select 1 from wines where id = p_wine and winery_id = my_org()) then
    raise exception 'היין לא שייך ליקב'; end if;
  select * into a from artists where id = w.artist_id;
  insert into deals (winery_id, gallery_id, artist_id, work_id, wine_id, design_code,
                     wine_label, license_type, qty_tier, exclusive, created_by)
  values (my_org(), a.gallery_id, a.id, w.id, p_wine, p_design, left(p_label, 80),
          p_type, p_qty, coalesce(p_exclusive,false), auth.uid())
  returning id into new_id;
  if p_key is not null then insert into idem_keys (key, result) values (p_key, new_id::text); end if;
  perform notify_deal(new_id, 'בקשת רישיון חדשה', array['gallery','admin']::app_role[]);
  insert into audit_log(actor, action, entity, entity_id) values (auth.uid(), 'request','deal',new_id::text);
  return new_id;
end $$;
grant execute on function request_license(bigint,bigint,text,text,text,text,boolean,uuid) to authenticated;

-- ---------- חוזה: נוצר מהתבנית הפעילה, עם תמונת מצב וטביעת אצבע ----------
create or replace function deal_make_contract(p_deal bigint) returns void
language plpgsql security definer set search_path = public as $$
declare x deals; s settings; t contract_templates; terms jsonb;
begin
  select * into x from deals where id = p_deal;
  select * into s from settings where id = 1;
  select * into t from contract_templates where active order by version desc limit 1;
  terms := jsonb_build_object(
    'license_type', x.license_type, 'qty_tier', x.qty_tier, 'exclusive', x.exclusive,
    'price_net', x.price_net, 'vat_pct', s.vat_pct, 'comm_pct', x.comm_pct,
    'restrict', (select restrict_text from artists where id = x.artist_id),
    'restrict_tags', (select restrict_tags from artists where id = x.artist_id),
    'design', (select to_jsonb(d) - 'created_by' from designs d where d.code = x.design_code),
    'work', (select jsonb_build_object('id', id, 'title', title, 'image', image_path) from works where id = x.work_id),
    'template', t.body);
  insert into contracts (deal_id, terms, template_version, terms_hash)
  values (p_deal, terms, t.version, md5(terms::text))
  on conflict (deal_id) do nothing;
end $$;

-- ---------- מעבר שלב בעסקה: לפי הטבלה, עם בדיקת גרסה ----------
drop function if exists advance_deal(bigint,text,int,text);
create or replace function advance_deal(p_deal bigint, p_action text,
  p_adj int default 0, p_note text default null, p_version int default null)
returns deal_status
language plpgsql security definer set search_path = public as $$
declare x deals; s settings; nxt deal_status; ar artists;
begin
  select * into x from deals where id = p_deal for update;
  if not found or not can_see_deal(p_deal) then raise exception 'אין גישה לעסקה'; end if;
  if p_version is not null and p_version <> x.version then
    raise exception 'העסקה עודכנה בינתיים. הנה המצב החדש'; end if;
  nxt := deal_allowed(x, p_action);
  if nxt is null then raise exception 'הפעולה % אינה אפשרית בשלב הזה', p_action; end if;
  select * into s from settings where id = 1;
  p_note := nullif(left(coalesce(p_note,''), 500), '');

  if p_action = 'price' then
    x.adj_pct := greatest(-15, least(15, coalesce(p_adj,0)));
    update deals set adj_pct = x.adj_pct, note = p_note, comm_pct = s.comm_pct,
      price_net = deal_price(x), status = nxt, updated_at = now() where id = p_deal;
    select * into ar from artists where id = x.artist_id;
    -- הסכמה מראש: בציר אחד, עד 3,000 בקבוקים, בלי בלעדיות ובלי שינוי מחיר
    if ar.pre_consent and x.license_type = 'one' and x.qty_tier = 'a' and not x.exclusive and x.adj_pct = 0 then
      update deals set status = 'sign', updated_at = now() where id = p_deal;
      perform deal_make_contract(p_deal);
      perform notify_deal(p_deal, 'האמן הסכים מראש. החוזה מוכן לחתימה', array['winery','artist']::app_role[]);
    else
      perform notify_deal(p_deal, 'הגלריה תמחרה. נדרשת הסכמת האמן', array['artist']::app_role[]);
    end if;
  elsif p_action = 'approve' then
    update deals set status = nxt, updated_at = now() where id = p_deal;
    perform deal_make_contract(p_deal);
    perform notify_deal(p_deal, 'החוזה מוכן לחתימה', array['winery']::app_role[]);
  elsif p_action = 'sign' then
    update deals set status = nxt, signed_at = now(), updated_at = now() where id = p_deal;
    update contracts set signed_by = auth.uid(), signed_at = now() where deal_id = p_deal;
    insert into invoices (deal_id, net, vat, total)
    values (p_deal, x.price_net, round(x.price_net * s.vat_pct / 100, 2), round(x.price_net * (1 + s.vat_pct / 100), 2))
    on conflict (deal_id) do nothing;
    perform notify_deal(p_deal, 'החוזה נחתם. ממתין לתשלום', array['gallery']::app_role[]);
  elsif p_action = 'paid' then
    update deals set status = nxt, paid_at = current_date, ends_at = current_date + interval '1 year', updated_at = now() where id = p_deal;
    update invoices set confirmed_by = auth.uid(), confirmed_at = now(), number = coalesce(p_note, number) where deal_id = p_deal;
    perform notify_deal(p_deal, 'הרישיון פעיל', array['winery','artist']::app_role[]);
  elsif p_action = 'change' then
    update deals set status = nxt, updated_at = now() where id = p_deal;
    perform notify_deal(p_deal, 'האמן ביקש שינוי. הבקשה חזרה לתמחור', array['gallery']::app_role[]);
  elsif p_action = 'reject' then
    update deals set status = nxt, note = p_note, updated_at = now() where id = p_deal;
    perform notify_deal(p_deal, 'הבקשה נדחתה', array['winery']::app_role[]);
  elsif p_action = 'order' then
    insert into print_orders (deal_id, printer_id, due)
    values (p_deal, (select id from organizations where kind = 'printer' and active order by created_at limit 1), current_date + 21)
    on conflict (deal_id) do nothing;
  elsif p_action = 'cancel' then
    update deals set status = nxt, note = p_note, updated_at = now() where id = p_deal;
  end if;

  insert into audit_log(actor, action, entity, entity_id, data)
  values (auth.uid(), p_action, 'deal', p_deal::text, jsonb_build_object('adj', p_adj, 'note', p_note));
  select status into nxt from deals where id = p_deal;
  return nxt;
end $$;
grant execute on function advance_deal(bigint,text,int,text,int) to authenticated;

-- ---------- פעולות על הזמנת לקוח: עם בדיקת גרסה ----------
do $$ declare f text;
begin
  for f in select oid::regprocedure::text from pg_proc where proname = 'corder_action' and pronamespace = 'public'::regnamespace loop
    execute 'drop function ' || f;
  end loop;
end $$;
create or replace function corder_action(p_id bigint, p_action text, p_design jsonb default null,
                                         p_note text default null, p_total numeric default null,
                                         p_version int default null)
returns text
language plpgsql security definer set search_path = public as $$
declare o customer_orders; r text := my_role()::text; win boolean; cus boolean; msg text;
begin
  select * into o from customer_orders where id = p_id for update;
  if not found then raise exception 'ההזמנה לא נמצאה'; end if;
  if p_version is not null and p_version <> o.version then raise exception 'ההזמנה עודכנה בינתיים. הנה המצב החדש'; end if;
  win := r = 'admin' or (r = 'winery' and o.winery_id = my_org());
  cus := o.customer_id = auth.uid();
  p_note := nullif(left(coalesce(p_note,''), 500), '');

  if p_action = 'wsave' and win and o.status = 'sent' then
    update customer_orders set winery_design = p_design where id = p_id;   -- המחיר מחושב בטריגר
    return o.status;
  elsif p_action = 'wundo' and win and o.status = 'sent' then
    update customer_orders set winery_design = null where id = p_id; msg := 'היקב ביטל את ההתאמות';
  elsif p_action = 'wsend' and win and o.status = 'sent' and o.winery_design is not null then
    update customer_orders set status = 'review', winery_note = p_note where id = p_id;
    msg := 'היקב הציע התאמות לאישורך'; perform notify_users(null, null, o.customer_id, msg);
  elsif p_action = 'wok' and win and o.status = 'sent' then
    -- היינן מאשר מצידו; התווית עוברת לאישור האמן או הגלריה
    update customer_orders set status = 'label', winery_design = null, label_ok_w = o.label_round where id = p_id;
    insert into label_notes (entity, entity_id, round, side, kind) values ('corder', p_id, o.label_round, 'winery', 'approve');
    msg := 'היקב אישר את העיצוב. התווית עברה לאישור האמן'; perform notify_users(null, null, o.customer_id, msg);
    perform label_notify('corder', p_id, 'תווית של לקוח מחכה לאישור שלך', array['art']);
  elsif p_action = 'cok' and cus and o.status = 'review' then
    update customer_orders set status = 'label', label_ok_w = o.label_round where id = p_id;
    insert into label_notes (entity, entity_id, round, side, kind) values ('corder', p_id, o.label_round, 'winery', 'approve');
    msg := 'הלקוח אישר את ההתאמות. התווית עברה לאישור האמן'; perform notify_users(o.winery_id, 'winery', null, msg);
    perform label_notify('corder', p_id, 'תווית של לקוח מחכה לאישור שלך', array['art']);
  elsif p_action = 'cchange' and cus and o.status = 'review' then
    update customer_orders set status = 'sent' where id = p_id;
    msg := 'הלקוח ביקש שינוי: ' || coalesce(p_note, ''); perform notify_users(o.winery_id, 'winery', null, msg);
  elsif p_action = 'wpaid' and win and o.status = 'approved' and o.paid_at is null then
    update customer_orders set paid_at = now() where id = p_id; msg := 'היקב סימן שהתשלום התקבל';
  elsif p_action = 'wprint' and win and o.status = 'approved' and o.paid_at is not null then
    update customer_orders set status = 'print' where id = p_id;
    msg := 'ההזמנה עברה לדפוס'; perform notify_users(null, null, o.customer_id, msg);
  elsif p_action = 'done' and (win or r = 'printer') and o.status = 'print' then
    update customer_orders set status = 'done' where id = p_id;
    msg := 'הבקבוקים מוכנים'; perform notify_users(null, null, o.customer_id, msg);
  elsif p_action = 'cancel' and (win or cus) and o.status in ('sent','review') then
    update customer_orders set status = 'cancel' where id = p_id; msg := 'ההזמנה בוטלה';
  else
    raise exception 'הפעולה אינה אפשרית בשלב הזה';
  end if;
  update customer_orders set log = log || jsonb_build_array(jsonb_build_object('t', msg, 'at', now())) where id = p_id;
  select status into o.status from customer_orders where id = p_id;
  return o.status;
end $$;
grant execute on function corder_action(bigint,text,jsonb,text,numeric,int) to authenticated;

-- ---------- אחסון: מקור פרטי, תצוגות מקדימות ציבוריות ----------
insert into storage.buckets (id, name, public) values ('previews','previews',true)
on conflict (id) do update set public = true;
drop policy if exists "works read"     on storage.objects;
drop policy if exists "previews write" on storage.objects;
-- קובץ המקור: רק מי שצריך אותו לעבודה או לדפוס
create policy "works read" on storage.objects for select to authenticated using (
  bucket_id = 'works' and (
       is_admin() or my_role()::text = 'curator'
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from works w join artists a on a.id = w.artist_id
               where w.image_path = name and (a.gallery_id = my_org() or a.user_id = auth.uid()))
    or exists (select 1 from works w join deals d on d.work_id = w.id
               where w.image_path = name and d.status = 'active' and can_see_deal(d.id))
    or exists (select 1 from works w join customer_orders co
                 on (co.design ->> 'work')::bigint = w.id or (co.winery_design ->> 'work')::bigint = w.id
               where w.image_path = name and co.status in ('approved','print','done')
                 and (co.winery_id = my_org() or my_role()::text = 'printer'))));
-- תצוגות מקדימות עם סימן מים: כל אחד מעלה רק לתיקייה שלו
create policy "previews write" on storage.objects for insert to authenticated
  with check (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- קישורי הצטרפות לארגון ----------
create table if not exists org_invites (
  token      text primary key default replace(gen_random_uuid()::text, '-', ''),
  org_id     uuid not null references organizations(id) on delete cascade,
  role       app_role not null,
  expires_at timestamptz not null default now() + interval '14 days',
  revoked    boolean not null default false,
  uses       int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table org_invites alter column token set default replace(gen_random_uuid()::text, '-', '');
alter table org_invites enable row level security;
drop policy if exists inv_admin on org_invites;
create policy inv_admin on org_invites for all to authenticated using (is_admin()) with check (is_admin());

create or replace function join_org(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare i org_invites;
begin
  select * into i from org_invites where token = p_token and not revoked and expires_at > now();
  if not found then return false; end if;
  perform set_config('app.bypass', '1', true);
  update profiles set role = i.role, status = 'active', org_id = i.org_id
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

-- ---------- מחיקת חשבון (לקוח, או משתמש שעוד לא שויך) ----------
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare r text := coalesce((select role::text from profiles where id = auth.uid()), '');
begin
  if r not in ('', 'customer') then raise exception 'רק מנהל המערכת יכול להסיר חשבון של ארגון'; end if;
  update customer_orders set cust = jsonb_build_object('n', 'לקוח שמחק את חשבונו'), customer_id = null
  where customer_id = auth.uid();
  delete from notifications where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
grant execute on function delete_my_account() to authenticated;

-- ---------- הגדרות האמן: הסכמה מראש נשמרת רק על ידי האמן או המנהל ----------
-- (נכלל במדיניות art_self הקיימת)

select 'חלק 3 מתוך 6 הסתיים בהצלחה' as result;
