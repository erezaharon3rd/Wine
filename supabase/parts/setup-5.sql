-- סדנת התווית · התקנה בחלקים · חלק 5 מתוך 6
-- מריצים לפי הסדר: 1, 2, 3... כל חלק בנפרד. מותר להריץ שוב חלק שכבר רץ.

-- =====================================================================
--  שלב 7 · פעולות אוטומטיות בלי מגע אדם
--  תמחור אוטומטי, אישור הזמנות, דפוס אחרי תשלום, מספרי חשבונית,
--  בלעדיות, תזכורות, סגירת בקשות תקועות, סוף רישיון, המלצות לפי פופולריות,
--  שמירת פרטי לקוחות לתקופה מוגבלת, בדיקת צילומים, תזמון יומי
-- =====================================================================

-- ---------- הגדרות: כל אוטומציה ניתנת לכיבוי ----------
alter table organizations add column if not exists auto_price   boolean not null default false; -- גלריה: לתמחר לפי הנוסחה מיד
alter table organizations add column if not exists auto_approve boolean not null default false; -- יקב: לאשר הזמנות לקוח מיד
alter table organizations add column if not exists auto_print   boolean not null default true;  -- יקב: לשלוח לדפוס מיד אחרי תשלום
alter table settings add column if not exists auto_picks boolean not null default true;          -- המלצות לפי פופולריות
alter table settings add column if not exists stale_days int not null default 3;                 -- תזכורת אחרי
alter table settings add column if not exists cancel_days int not null default 30;               -- סגירה אחרי
alter table settings add column if not exists customer_retention_days int;                       -- ריק = לא מוחקים (עורך הדין יקבע)
alter table works add column if not exists pop_score numeric not null default 0;
alter table works add column if not exists excl_lock boolean not null default false;
alter table renders add column if not exists auto_check jsonb;
alter table customer_orders add column if not exists updated_at timestamptz not null default now();

create table if not exists reminders (
  entity    text   not null,
  entity_id bigint not null,
  kind      text   not null,
  at        timestamptz not null default now(),
  primary key (entity, entity_id, kind)
);
alter table reminders enable row level security;
drop policy if exists rem_admin on reminders;
create policy rem_admin on reminders for select to authenticated using (is_admin());

create or replace function corders_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists corders_touch_t on customer_orders;
create trigger corders_touch_t before update on customer_orders for each row execute function corders_touch();

-- ---------- 1. תמחור אוטומטי ----------
create or replace function deal_auto_price(p_deal bigint) returns void
language plpgsql security definer set search_path = public as $$
declare x deals; s settings; ar artists;
begin
  select * into x from deals where id = p_deal for update;
  if x.status <> 'sent' then return; end if;
  select * into s from settings where id = 1;
  x.adj_pct := 0;
  update deals set adj_pct = 0, comm_pct = s.comm_pct, price_net = deal_price(x), status = 'priced',
         note = 'תומחר אוטומטית לפי הנוסחה', updated_at = now() where id = p_deal;
  select * into ar from artists where id = x.artist_id;
  if ar.pre_consent and x.license_type = 'one' and x.qty_tier = 'a' and not x.exclusive then
    update deals set status = 'sign', updated_at = now() where id = p_deal;
    perform deal_make_contract(p_deal);
    perform notify_deal(p_deal, 'המחיר אושר מראש. נשאר שהיינן והאמן או הגלריה יאשרו את התווית, ואז חותמים', array['winery','artist','gallery']::app_role[]);
  else
    perform notify_deal(p_deal, 'הבקשה תומחרה אוטומטית. נדרשת הסכמת האמן', array['artist']::app_role[]);
  end if;
  insert into audit_log (actor, action, entity, entity_id) values (null, 'auto_price', 'deal', p_deal::text);
end $$;
revoke execute on function deal_auto_price(bigint) from public, anon, authenticated;

create or replace function deals_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select auto_price from organizations where id = new.gallery_id) then perform deal_auto_price(new.id); end if;
  return null;
end $$;
drop trigger if exists deals_auto_price_t on deals;
create trigger deals_auto_price_t after insert on deals for each row execute function deals_after_insert();

-- ---------- 3 + 7. אחרי תשלום: דפוס אוטומטי. בלעדיות נועלת ומשחררת את היצירה ----------
create or replace function work_refresh_available(p_work bigint) returns void
language plpgsql security definer set search_path = public as $$
declare locked boolean;
begin
  locked := exists (select 1 from deals where work_id = p_work and exclusive and status in ('active','pay','sign')
                    and coalesce(ends_at, current_date + 1) >= current_date);
  if locked then
    update works set available = false, excl_lock = true where id = p_work and (available or not excl_lock);
  else
    update works set available = true, excl_lock = false where id = p_work and excl_lock;
  end if;
end $$;
revoke execute on function work_refresh_available(bigint) from public, anon, authenticated;

create or replace function deals_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr uuid;
begin
  if new.status is distinct from old.status then
    if new.exclusive then perform work_refresh_available(new.work_id); end if;
    if new.status = 'active' and (select auto_print from organizations where id = new.winery_id) then
      select id into pr from organizations where kind = 'printer' and active order by created_at limit 1;
      insert into print_orders (deal_id, printer_id, due) values (new.id, pr, current_date + 21) on conflict (deal_id) do nothing;
      if found then
        perform notify_deal(new.id, 'התשלום אושר. ההזמנה נשלחה לבית הדפוס', array['winery']::app_role[]);
        if pr is not null then perform notify_users(pr, 'printer', null, 'הזמנת דפוס חדשה לעסקה ' || new.id); end if;
      end if;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists deals_after_update_t on deals;
create trigger deals_after_update_t after update of status on deals for each row execute function deals_after_update();

-- ---------- 2 + 3. הזמנות לקוח: אישור מיד, ודפוס מיד אחרי תשלום ----------
create or replace function corders_auto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- אחרי תשלום: ישר לדפוס, אם היקב בחר בזה
  if old.paid_at is null and new.paid_at is not null and new.status = 'approved'
     and (select auto_print from organizations where id = new.winery_id) then
    new.status := 'print';
    new.log := coalesce(new.log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('t', 'ההזמנה עברה לדפוס אוטומטית', 'at', now()));
    if new.customer_id is not null then perform notify_users(null, null, new.customer_id, 'ההזמנה עברה לדפוס'); end if;
  end if;
  return new;
end $$;
drop trigger if exists corders_auto_t on customer_orders;
create trigger corders_auto_t before update of paid_at on customer_orders for each row execute function corders_auto();

-- הזמנה חדשה: אישור מיד, אם היקב בחר בזה (אחרי ההכנסה, כדי שהרשאת הלקוח תישאר "נשלחה")
create or replace function corders_auto_approve() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select auto_approve from organizations where id = new.winery_id) then
    update customer_orders set status = 'approved',
      log = coalesce(log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('t', 'ההזמנה אושרה אוטומטית', 'at', now()))
    where id = new.id;
    if new.customer_id is not null then perform notify_users(null, null, new.customer_id, 'ההזמנה אושרה. היקב יחזור אליך לגבי התשלום'); end if;
  end if;
  return null;
end $$;
drop trigger if exists corders_auto_approve_t on customer_orders;
create trigger corders_auto_approve_t after insert on customer_orders for each row execute function corders_auto_approve();

-- ---------- 4. מספרי חשבונית רצים ----------
create sequence if not exists invoice_seq;
create or replace function invoice_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.number is null or new.number = '' then
    new.number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 4, '0');
  end if;
  return new;
end $$;
drop trigger if exists invoice_number_t on invoices;
create trigger invoice_number_t before insert on invoices for each row execute function invoice_number();
update invoices set number = 'INV-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 4, '0')
where number is null or number = '';

-- ---------- תזכורת אחת לכל מצב, לא יותר מפעם בכמה ימים ----------
create or replace function remind_once(p_entity text, p_id bigint, p_kind text, p_every interval) returns boolean
language plpgsql security definer set search_path = public as $$
declare last timestamptz;
begin
  select at into last from reminders where entity = p_entity and entity_id = p_id and kind = p_kind;
  if found and (p_every is null or last > now() - p_every) then return false; end if;
  insert into reminders (entity, entity_id, kind) values (p_entity, p_id, p_kind)
  on conflict (entity, entity_id, kind) do update set at = now();
  return true;
end $$;
revoke execute on function remind_once(text,bigint,text,interval) from public, anon, authenticated;

-- ---------- 5 + 6 + 8 + 9 + 13. העבודה היומית ----------
create or replace function daily_maintenance() returns jsonb
language plpgsql security definer set search_path = public as $$
declare s settings; d record; o record; n_rem int := 0; n_cancel int := 0; n_end int := 0; n_co int := 0; n_anon int := 0;
  st interval; ca interval; who app_role[]; msg text;
begin
  select * into s from settings where id = 1;
  st := make_interval(days => s.stale_days); ca := make_interval(days => s.cancel_days);

  -- בקשות רישיון שלא זזו: סגירה אחרי תקופה, תזכורת לפני
  for d in select * from deals where status in ('sent','priced','sign') and updated_at < now() - ca loop
    update deals set status = 'cancelled', note = 'נסגרה אוטומטית אחרי ' || s.cancel_days || ' יום בלי תגובה', updated_at = now() where id = d.id;
    perform notify_deal(d.id, 'הבקשה נסגרה אוטומטית אחרי ' || s.cancel_days || ' יום בלי תגובה', array['winery','gallery']::app_role[]);
    n_cancel := n_cancel + 1;
  end loop;
  for d in select * from deals where status in ('sent','priced','sign','pay') and updated_at < now() - st loop
    who := case d.status when 'sent' then array['gallery'] when 'priced' then array['artist'] when 'sign' then array['winery'] else array['gallery','winery'] end::app_role[];
    msg := case d.status when 'sent' then 'תזכורת: בקשת רישיון מחכה לתמחור'
                         when 'priced' then 'תזכורת: בקשת רישיון מחכה להסכמת האמן'
                         when 'sign' then 'תזכורת: החוזה מחכה לחתימה'
                         else 'תזכורת: עסקה מחכה לתשלום' end;
    if remind_once('deal', d.id, 'stale:' || d.status, st) then perform notify_deal(d.id, msg, who); n_rem := n_rem + 1; end if;
  end loop;

  -- סוף רישיון: התראה 60 ו-30 יום לפני, הודעה כשנגמר, ושחרור בלעדיות
  for d in select * from deals where status = 'active' and ends_at is not null loop
    if d.ends_at < current_date then
      if remind_once('deal', d.id, 'ended', null) then
        perform notify_deal(d.id, 'הרישיון הסתיים. יש שישה חודשים למכירת מלאי שכבר הודפס', array['winery','gallery','artist']::app_role[]);
        if d.exclusive then perform work_refresh_available(d.work_id); end if;
        n_end := n_end + 1;
      end if;
    elsif d.ends_at <= current_date + 30 then
      if remind_once('deal', d.id, 'end30', null) then perform notify_deal(d.id, 'הרישיון מסתיים בעוד פחות מחודש. אפשר לחדש מחדר העסקה', array['winery','gallery']::app_role[]); n_rem := n_rem + 1; end if;
    elsif d.ends_at <= current_date + 60 then
      if remind_once('deal', d.id, 'end60', null) then perform notify_deal(d.id, 'הרישיון מסתיים בעוד חודשיים', array['winery','gallery']::app_role[]); n_rem := n_rem + 1; end if;
    end if;
  end loop;

  -- הזמנות לקוח שלא זזו
  for o in select * from customer_orders where status in ('sent','review','label') and updated_at < now() - ca loop
    update customer_orders set status = 'cancel',
      log = log || jsonb_build_array(jsonb_build_object('t', 'ההזמנה נסגרה אוטומטית אחרי ' || s.cancel_days || ' יום בלי תגובה', 'at', now())) where id = o.id;
    perform notify_users(o.winery_id, 'winery', null, 'הזמנת לקוח ' || o.id || ' נסגרה אחרי ' || s.cancel_days || ' יום בלי תגובה');
    if o.customer_id is not null then perform notify_users(null, null, o.customer_id, 'ההזמנה נסגרה כי לא הייתה תגובה זמן רב. אפשר לשלוח אותה שוב'); end if;
    n_cancel := n_cancel + 1;
  end loop;
  for o in select * from customer_orders where status = 'sent' and updated_at < now() - st loop
    if remind_once('corder', o.id, 'stale:sent', st) then perform notify_users(o.winery_id, 'winery', null, 'תזכורת: הזמנת לקוח ' || o.id || ' מחכה לאישור'); n_co := n_co + 1; end if;
  end loop;
  for o in select * from customer_orders where status = 'review' and updated_at < now() - st and customer_id is not null loop
    if remind_once('corder', o.id, 'stale:review', st) then perform notify_users(null, null, o.customer_id, 'תזכורת: היקב הציע התאמות להזמנה שלך, והן מחכות לאישורך'); n_co := n_co + 1; end if;
  end loop;
  for o in select * from customer_orders where status = 'label' and updated_at < now() - st loop
    if remind_once('corder', o.id, 'stale:label', st) then perform label_notify('corder', o.id, 'תזכורת: תווית של לקוח מחכה לאישור שלך', array['art']); n_co := n_co + 1; end if;
  end loop;
  for o in select * from customer_orders where status = 'approved' and paid_at is null and updated_at < now() - st loop
    if remind_once('corder', o.id, 'stale:unpaid', st) then perform notify_users(o.winery_id, 'winery', null, 'תזכורת: הזמנת לקוח ' || o.id || ' אושרה ומחכה לתשלום'); n_co := n_co + 1; end if;
  end loop;

  -- המלצות לפי פופולריות: ניסיונות על בקבוק, רישיונות והזמנות ב-90 הימים האחרונים
  update works w set pop_score = coalesce(t.n, 0) + 5 * coalesce(l.n, 0) + 2 * coalesce(c.n, 0)
  from works w2
  left join (select work_id, count(*) n from designs where created_at > now() - interval '90 days' group by work_id) t on t.work_id = w2.id
  left join (select work_id, count(*) n from deals where created_at > now() - interval '90 days' and status not in ('rejected','cancelled') group by work_id) l on l.work_id = w2.id
  left join (select (design ->> 'work')::bigint work_id, count(*) n from customer_orders where created_at > now() - interval '90 days' and status <> 'cancel' group by 1) c on c.work_id = w2.id
  where w.id = w2.id;
  if s.auto_picks then
    update works w set pick_rank = r.rk from (
      select id, case when rn <= 8 and pop_score > 0 then rn end rk
      from (select id, pop_score, row_number() over (order by pop_score desc, id) rn from works where status = 'live' and available) z) r
    where w.id = r.id and w.pick_rank is distinct from r.rk;
  end if;

  -- פרטי לקוחות בהזמנות שהסתיימו נמחקים אחרי תקופה שנקבעה (כבוי עד שעורך הדין יקבע)
  if s.customer_retention_days is not null then
    update customer_orders set cust = jsonb_build_object('n', 'לקוח')
    where status in ('done','cancel') and updated_at < now() - make_interval(days => s.customer_retention_days)
      and cust ->> 'n' is distinct from 'לקוח';
    get diagnostics n_anon = row_count;
  end if;

  insert into audit_log (actor, action, entity, data) values (null, 'daily', 'system',
    jsonb_build_object('reminders', n_rem, 'cancelled', n_cancel, 'ended', n_end, 'orders', n_co, 'anonymized', n_anon));
  return jsonb_build_object('reminders', n_rem, 'cancelled', n_cancel, 'ended', n_end, 'orders', n_co, 'anonymized', n_anon);
end $$;
revoke execute on function daily_maintenance() from public, anon, authenticated;

-- ---------- 10. בדיקת צילום אוטומטית: התוצאה נשמרת, ומה שתואם מאושר ----------
create or replace function render_auto_check(p_path text, p_match boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update renders set auto_check = jsonb_build_object('match', p_match, 'reason', left(coalesce(p_reason,''), 200), 'at', now()),
                     approved = case when p_match then true else approved end
  where image_path = p_path and created_by = auth.uid() and approved is null;
end $$;
grant execute on function render_auto_check(text, boolean, text) to authenticated;

-- ---------- 12. דוח חודשי לגלריה ולאמן ----------
create or replace function monthly_statement(p_month date) returns table (
  deal_id bigint, paid_at date, winery text, work text, artist text, net numeric, platform numeric, artist_share numeric, gallery_share numeric)
language sql stable security definer set search_path = public as $$
  select d.id, d.paid_at, wo.name, w.title, a.name, d.price_net,
         round(d.price_net * coalesce(d.comm_pct, s.comm_pct) / 100),
         round((d.price_net - round(d.price_net * coalesce(d.comm_pct, s.comm_pct) / 100)) * s.artist_share / 100),
         d.price_net - round(d.price_net * coalesce(d.comm_pct, s.comm_pct) / 100)
           - round((d.price_net - round(d.price_net * coalesce(d.comm_pct, s.comm_pct) / 100)) * s.artist_share / 100)
  from deals d join works w on w.id = d.work_id join artists a on a.id = d.artist_id
       join organizations wo on wo.id = d.winery_id cross join settings s
  where d.paid_at >= date_trunc('month', p_month) and d.paid_at < date_trunc('month', p_month) + interval '1 month'
    and (is_admin() or (my_role()::text = 'gallery' and d.gallery_id = my_org()) or d.artist_id = my_artist())
  order by d.paid_at, d.id
$$;
grant execute on function monthly_statement(date) to authenticated;

-- ---------- תזמון יומי (פועל כשהתוסף pg_cron מופעל ב-Supabase) ----------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'daily-maintenance';
    perform cron.schedule('daily-maintenance', '17 1 * * *', 'select public.daily_maintenance()');
  end if;
end $$;

select 'חלק 5 מתוך 6 הסתיים בהצלחה' as result;
