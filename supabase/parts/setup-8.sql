-- Grape Arts · התקנה בחלקים · חלק 8 מתוך 8 (שלב 13, חלק ב)
-- ---------- 13.8 הזמנות: כרטיס הנוסע על כל הזמנה ----------
alter table customer_orders add column if not exists channel text not null default 'winery_customer';
alter table customer_orders add column if not exists owner_winery_id uuid references organizations(id);
alter table customer_orders add column if not exists buyer_id uuid references buyers(id);
alter table customer_orders add column if not exists buyer_kind text;
alter table customer_orders add column if not exists package_id bigint references packages(id);
alter table customer_orders add column if not exists series_id bigint references series(id);
alter table customer_orders add column if not exists bottles int;
alter table customer_orders add column if not exists delivery_date date;
alter table customer_orders add column if not exists quote_until date;
alter table customer_orders add column if not exists gallery_id uuid references organizations(id);
alter table customer_orders add column if not exists artist_pct numeric;
alter table customer_orders add column if not exists split jsonb;
alter table customer_orders add column if not exists collector_consent boolean not null default false;
alter table customer_orders drop constraint if exists customer_orders_channel_check;
alter table customer_orders add constraint customer_orders_channel_check check (channel in ('winery','winery_customer','direct'));
alter table customer_orders drop constraint if exists customer_orders_buyer_kind_check;
alter table customer_orders add constraint customer_orders_buyer_kind_check check (buyer_kind is null or buyer_kind in ('private','business','collector'));
alter table customer_orders drop constraint if exists customer_orders_status_check;
alter table customer_orders add constraint customer_orders_status_check
  check (status in ('quote','sent','review','label','approved','print','done','cancel'));
alter table edition_items drop constraint if exists edition_items_order_fk;
alter table edition_items add constraint edition_items_order_fk foreign key (order_id) references customer_orders(id);
create index if not exists corders_owner_idx on customer_orders(owner_winery_id);
create index if not exists corders_series_idx on customer_orders(series_id);
update customer_orders set owner_winery_id = winery_id where channel = 'winery_customer' and owner_winery_id is null;

-- פרטי הקשר המלאים של הזמנה חיצונית: רק הקונה והמנהל
create table if not exists order_contacts (
  order_id bigint primary key references customer_orders(id) on delete cascade,
  cust     jsonb not null
);
alter table order_contacts enable row level security;
drop policy if exists oc_read on order_contacts;
create policy oc_read on order_contacts for select to authenticated using (
  is_admin() or exists (select 1 from customer_orders o where o.id = order_id and o.customer_id = auth.uid()));

-- הכרטיס נקבע ונצלם ברגע היצירה
create or replace function corder_card() returns trigger
language plpgsql security definer set search_path = public as $$
declare a artists; pct numeric;
begin
  if new.channel = 'direct' and coalesce(current_setting('app.bypass', true), '') <> '1' then
    raise exception 'הזמנה חיצונית נשלחת רק דרך הקטלוג'; end if;
  if new.channel = 'winery_customer' then new.owner_winery_id := new.winery_id; end if;
  select * into a from artists where id = (new.design ->> 'artist')::uuid;
  if found then
    new.gallery_id := a.gallery_id;
    select coalesce(t.artist_pct, (select artist_share from settings)) into pct from artist_tiers t where t.code = a.tier;
    new.artist_pct := pct;
  end if;
  return new;
end $$;
drop trigger if exists corder_aa_card on customer_orders;
create trigger corder_aa_card before insert on customer_orders for each row execute function corder_card();

-- השדות של הכרטיס לא משתנים אחרי היצירה
create or replace function corder_card_lock() returns trigger
language plpgsql as $$
begin
  if new.channel <> old.channel
     or (old.owner_winery_id is not null and new.owner_winery_id is distinct from old.owner_winery_id)
     or (new.customer_id is not null and new.customer_id is distinct from old.customer_id)
     or (old.gallery_id is not null and new.gallery_id is distinct from old.gallery_id)
     or (old.artist_pct is not null and new.artist_pct is distinct from old.artist_pct) then
    raise exception 'כרטיס הנוסע של ההזמנה לא משתנה'; end if;
  return new;
end $$;
drop trigger if exists corder_card_lock_t on customer_orders;
create trigger corder_card_lock_t before update on customer_orders for each row execute function corder_card_lock();

-- ---------- 13.9 מחיר בערוץ החיצוני ----------
alter table settings add column if not exists direct_open boolean not null default true;
alter table settings add column if not exists lead_days int not null default 21;
alter table settings add column if not exists order_cutoff date;
alter table settings add column if not exists direct_pricing jsonb not null default '{"t1":24,"d1":5,"t2":60,"d2":10}';

-- אותו יין עולה אותו מחיר לבקבוק: מחיר היקב ללקוחות שלו, ואם לא קבע, המחיר לערוץ החיצוני
create or replace function wine_unit(p_wine bigint) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((o.pricing -> 'prices' ->> w.id::text)::numeric, w.direct_price)
  from wines w join organizations o on o.id = w.winery_id where w.id = p_wine
$$;

create or replace function direct_quote(d jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare w wines; o organizations; pk packages; s series; addon numeric; q int; n int; wu numeric;
        art numeric; disc numeric; pr jsonb; wine_total numeric; art_total numeric; printp numeric := 0;
begin
  select * into w from wines where id = (d ->> 'wine')::bigint;
  if not found or not w.direct then raise exception 'היין לא נמצא'; end if;
  select * into o from organizations where id = w.winery_id;
  select * into pk from packages where id = (d ->> 'package')::bigint and active;
  if not found then raise exception 'המארז לא נמצא'; end if;
  q := greatest(1, coalesce((d ->> 'qty')::int, 1));
  n := q * pk.bottles;
  wu := wine_unit(w.id);
  if wu is null then raise exception 'ליין הזה עוד אין מחיר'; end if;
  select t.bottle_addon into addon from artists a join artist_tiers t on t.code = a.tier where a.id = (d ->> 'artist')::uuid;
  addon := coalesce(addon, 0);
  if pk.level = 'patron' and (d ->> 'series') is not null then
    select coalesce(print_price, 0) into printp from series where id = (d ->> 'series')::bigint;
  end if;
  pr := (select direct_pricing from settings);
  disc := case when n >= coalesce((pr ->> 't2')::int, 60) then coalesce((pr ->> 'd2')::numeric, 10)
               when n >= coalesce((pr ->> 't1')::int, 24) then coalesce((pr ->> 'd1')::numeric, 5) else 0 end;
  art := n * addon + q * (pk.price + printp);
  art_total := round(art * (1 - disc / 100));
  wine_total := round(n * wu);
  return jsonb_build_object('packages', q, 'bottles', n, 'wine_unit', wu, 'wine_total', wine_total,
    'art_total', art_total, 'discount_pct', disc, 'total', wine_total + art_total,
    'wine_seller', o.id, 'wine_seller_name', o.name, 'art_seller', 'platform');
end $$;
grant execute on function direct_quote(jsonb) to anon, authenticated;

-- כמה בקבוקים פנויים: המלאי פחות מה שכבר שמור בהזמנות שעוד לא שולמו
create or replace function shiners_free(p_wine bigint) returns int
language sql stable security definer set search_path = public as $$
  select w.shiners - coalesce((select sum(o.bottles) from customer_orders o
     where o.channel = 'direct' and o.paid_at is null and o.status in ('quote','approved')
       and (o.design ->> 'wine')::bigint = w.id), 0)::int
  from wines w where w.id = p_wine
$$;

create or replace function series_free(p_series bigint) returns int
language sql stable security definer set search_path = public as $$
  select case when s.kind = 'open' then null else
    s.size - (s.next_no - 1) - coalesce((select sum(o.bottles) from customer_orders o
      where o.series_id = s.id and o.paid_at is null and o.status in ('quote','approved')), 0)::int end
  from series s where s.id = p_series
$$;

-- בדיקות ההזמנה החיצונית
create or replace function direct_check(p_winery uuid, d jsonb, p_bottles int, p_level text) returns void
language plpgsql stable security definer set search_path = public as $$
declare w wines; o organizations; wk works; s series; lv artist_levels; free int;
begin
  select * into w from wines where id = (d ->> 'wine')::bigint;
  select * into o from organizations where id = w.winery_id;
  if not w.direct or not o.partner or not o.active or w.winery_id <> p_winery then raise exception 'היין לא זמין להזמנה'; end if;
  select * into wk from works where id = (d ->> 'work')::bigint;
  if wk.artist_id::text <> (d ->> 'artist') then raise exception 'היצירה לא שייכת לאמן'; end if;
  select * into lv from artist_levels where artist_id = wk.artist_id and level = p_level;
  if not found or not lv.artist_ok or not lv.gallery_ok then raise exception 'האמן לא משתתף ברמה הזו'; end if;
  if (d ->> 'logo') is not null or (d ->> 'zone') is not null then
    if not wk.frame_ok then raise exception 'לציור הזה עוד אין מסגרת לוגו מאושרת'; end if;
    if coalesce(d ->> 'zone', '') not in (select unnest(wk.frame_zones)) then raise exception 'הלוגו והטקסט רק מחוץ לציור, באזור שהאמן אישר'; end if;
  end if;
  if (d ->> 'series') is not null then
    select * into s from series where id = (d ->> 'series')::bigint;
    if not found or s.work_id <> wk.id then raise exception 'המהדורה לא שייכת ליצירה'; end if;
    if s.wine_id is not null and s.wine_id <> w.id then raise exception 'המהדורה הזו על יין אחר'; end if;
    if not (p_level = any(s.levels)) then raise exception 'המהדורה לא פתוחה לרמה הזו'; end if;
    if s.closed_at is not null then raise exception 'המהדורה אזלה'; end if;
    free := series_free(s.id);
    if free is not null and p_bottles > free then raise exception 'נותרו % בקבוקים במהדורה', free; end if;
  elsif p_level in ('collector','patron') then
    raise exception 'רמת אספנים ופטרון רק במהדורה ממוספרת';
  end if;
  free := shiners_free(w.id);
  if p_bottles > coalesce(free, 0) then raise exception 'נותרו % בקבוקים מהיין הזה', coalesce(free, 0); end if;
end $$;

-- השומר של ההזמנה: לפי הערוץ
create or replace function corder_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare q jsonb;
begin
  if length(coalesce(new.cust ->> 'n', '')) not between 1 and 80
     or length(coalesce(new.cust ->> 'ph', '')) > 30
     or length(coalesce(new.cust ->> 'em', '')) > 120
     or length(coalesce(new.cust ->> 'note', '')) > 500 then
    if tg_op = 'INSERT' then raise exception 'פרטי הקשר אינם תקינים'; end if;
  end if;
  perform corder_check(new.winery_id, new.design);
  if new.channel = 'direct' then
    if tg_op = 'INSERT' or new.design is distinct from old.design then
      q := direct_quote(new.design);
      new.total := (q ->> 'total')::numeric;
      new.bottles := (q ->> 'bottles')::int;
      new.split := q;
    end if;
    return new;
  end if;
  if new.winery_design is not null then perform corder_check(new.winery_id, new.winery_design); end if;
  new.total := corder_price(new.winery_id, coalesce(new.winery_design, new.design));
  new.bottles := greatest(1, coalesce(((coalesce(new.winery_design, new.design)) ->> 'qty')::int, 1));
  return new;
end $$;

-- הודעת ההזמנה החדשה: רק בערוץ של היקב. הזמנה חיצונית מודיעה בעצמה
create or replace function corder_new() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.channel = 'direct' then return new; end if;
  new.log := jsonb_build_array(jsonb_build_object('t','הלקוח שלח את ההזמנה','at',now()));
  perform notify_users(new.winery_id, 'winery', null, 'הזמנת לקוח חדשה');
  return new;
end $$;

-- ---------- 13.10 הזמנה מהקטלוג ----------
create or replace function notify_admins(msg text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, body) select id, msg from profiles where role::text = 'admin' and status = 'active';
$$;
revoke execute on function notify_admins(text) from public, anon, authenticated;

alter table customer_orders add column if not exists adult_at timestamptz;
alter table customer_orders add column if not exists terms_version text;

create or replace function place_order(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare me profiles; d jsonb := p -> 'design'; pk packages; w wines; st settings; lvl text; n int; oid bigint;
        b uuid; dd date; quote boolean := coalesce((p ->> 'quote')::boolean, false); a artists; c jsonb := p -> 'cust';
        first text;
begin
  select * into me from profiles where id = auth.uid();
  if not found or me.role::text <> 'customer' or me.status <> 'active' then raise exception 'צריך להתחבר כדי לשלוח הזמנה'; end if;
  if me.org_id is not null then raise exception 'ההזמנה שלך נשלחת דרך היקב שלך'; end if;
  select * into st from settings where id = 1;
  if not st.direct_open then raise exception 'ההזמנות סגורות כרגע'; end if;
  if st.order_cutoff is not null and current_date > st.order_cutoff then raise exception 'ההזמנות לחג הזה כבר נסגרו'; end if;
  select * into pk from packages where id = (d ->> 'package')::bigint and active;
  if not found then raise exception 'המארז לא נמצא'; end if;
  select * into w from wines where id = (d ->> 'wine')::bigint;
  if not found then raise exception 'היין לא נמצא'; end if;
  n := greatest(1, coalesce((d ->> 'qty')::int, 1)) * pk.bottles;
  lvl := pk.level;
  perform direct_check(w.winery_id, d, n, lvl);
  dd := nullif(p ->> 'delivery', '')::date;
  if dd is null or dd < current_date + st.lead_days then
    raise exception 'תאריך האספקה המוקדם ביותר הוא %', to_char(current_date + st.lead_days, 'DD.MM.YYYY'); end if;
  if c is null or length(coalesce(c ->> 'n', '')) < 2 or length(coalesce(c ->> 'ph', '')) < 7 then
    raise exception 'צריך שם וטלפון'; end if;
  if coalesce((p ->> 'adult')::boolean, false) is not true then raise exception 'צריך לאשר שגילך 18 ומעלה'; end if;
  if length(coalesce(p ->> 'terms', '')) < 4 then raise exception 'צריך לאשר את תנאי השימוש'; end if;
  if (p ->> 'buyer_kind') = 'business' then
    if p -> 'buyer' is null or length(coalesce(p -> 'buyer' ->> 'name', '')) < 2 then raise exception 'צריך את שם העסק'; end if;
    if me.buyer_id is null then
      insert into buyers (name, kind, vat_id) values (p -> 'buyer' ->> 'name', coalesce(p -> 'buyer' ->> 'kind', 'company'), nullif(p -> 'buyer' ->> 'vat', ''))
      returning id into b;
      perform set_config('app.bypass', '1', true);
      update profiles set buyer_id = b where id = me.id;
    else b := me.buyer_id; end if;
  end if;
  first := split_part(btrim(c ->> 'n'), ' ', 1);
  perform set_config('app.bypass', '1', true);
  insert into customer_orders (winery_id, customer_id, cust, design, status, channel, buyer_id, buyer_kind,
                               package_id, series_id, delivery_date, quote_until, collector_consent, adult_at, terms_version)
  values (w.winery_id, me.id, jsonb_build_object('n', first), d, case when quote then 'quote' else 'approved' end, 'direct', b,
          coalesce(p ->> 'buyer_kind', case when lvl = 'case' then 'private' else 'collector' end),
          pk.id, nullif(d ->> 'series', '')::bigint, dd, case when quote then least(dd - st.lead_days, current_date + 14) end,
          coalesce((p ->> 'consent')::boolean, false), now(), left(p ->> 'terms', 20))
  returning id into oid;
  insert into order_contacts (order_id, cust) values (oid, jsonb_build_object(
    'n', left(c ->> 'n', 80), 'ph', left(c ->> 'ph', 30), 'em', left(coalesce(c ->> 'em', ''), 120),
    'addr', left(coalesce(c ->> 'addr', ''), 300), 'note', left(coalesce(c ->> 'note', ''), 500)));
  update customer_orders set log = jsonb_build_array(jsonb_build_object('t',
    case when quote then 'נשלחה בקשה להצעת מחיר' else 'ההזמנה נשלחה. הלקוח אישר את העיצוב' end, 'at', now())) where id = oid;
  perform notify_admins('הזמנה חיצונית חדשה #' || oid);
  if not quote then
    perform notify_users(w.winery_id, 'winery', null, 'הוזמנו ' || n || ' בקבוקים מהיין שלך');
    select * into a from artists where id = (d ->> 'artist')::uuid;
    perform notify_users(a.gallery_id, 'gallery', null, 'הוזמנו בקבוקים עם הציור של ' || a.name);
    if a.user_id is not null then perform notify_users(null, null, a.user_id, 'הוזמנו בקבוקים עם הציור שלך'); end if;
  end if;
  return oid;
end $$;
grant execute on function place_order(jsonb) to authenticated;

-- הקצאת מספרים במהדורה, בזמן התשלום
create or replace function edition_allocate(p_order bigint) returns void
language plpgsql security definer set search_path = public as $$
declare o customer_orders; s series; pk packages; k int;
begin
  select * into o from customer_orders where id = p_order;
  if o.series_id is null then return; end if;
  select * into s from series where id = o.series_id for update;
  select * into pk from packages where id = o.package_id;
  if s.kind = 'closed' then
    if s.closed_at is not null or s.next_no + o.bottles - 1 > s.size then raise exception 'המהדורה אזלה'; end if;
    insert into edition_items (series_id, kind, no, order_id)
      select s.id, 'bottle', g, o.id from generate_series(s.next_no, s.next_no + o.bottles - 1) g;
    update series set next_no = next_no + o.bottles where id = s.id;
  end if;
  if pk.level = 'patron' then
    k := greatest(1, coalesce((o.design ->> 'qty')::int, 1));
    if s.print_next + k - 1 > s.print_size then raise exception 'מהדורת ההדפס אזלה'; end if;
    insert into edition_items (series_id, kind, no, order_id)
      select s.id, 'print', g, o.id from generate_series(s.print_next, s.print_next + k - 1) g;
    update series set print_next = print_next + k where id = s.id;
  end if;
end $$;
revoke execute on function edition_allocate(bigint) from public, anon, authenticated;

-- הפעולות בהזמנה חיצונית
create or replace function direct_action(p_id bigint, p_action text, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare o customer_orders; r text := my_role()::text; me_c boolean; msg text; a artists; st settings;
begin
  select * into o from customer_orders where id = p_id for update;
  if not found or o.channel <> 'direct' then raise exception 'ההזמנה לא נמצאה'; end if;
  me_c := o.customer_id = auth.uid();
  select * into a from artists where id = (o.design ->> 'artist')::uuid;
  select * into st from settings where id = 1;
  perform set_config('app.bypass', '1', true);
  if p_action = 'qaccept' and me_c and o.status = 'quote' then
    if o.quote_until < current_date then raise exception 'תוקף ההצעה עבר. אפשר לבקש הצעה חדשה'; end if;
    perform direct_check(o.winery_id, o.design, 0, (select level from packages where id = o.package_id));
    update customer_orders set status = 'approved' where id = p_id;
    msg := 'הלקוח אישר את הצעת המחיר';
    perform notify_admins(msg || ' #' || p_id);
    perform notify_users(o.winery_id, 'winery', null, 'הוזמנו ' || o.bottles || ' בקבוקים מהיין שלך');
    perform notify_users(a.gallery_id, 'gallery', null, 'הוזמנו בקבוקים עם הציור של ' || a.name);
  elsif p_action = 'paid' and r = 'admin' and o.status = 'approved' and o.paid_at is null then
    if shiners_free((o.design ->> 'wine')::bigint) + o.bottles < o.bottles then raise exception 'אין מספיק בקבוקים'; end if;
    perform edition_allocate(p_id);
    update wines set shiners = shiners - o.bottles where id = (o.design ->> 'wine')::bigint;
    update customer_orders set paid_at = now(), status = 'print' where id = p_id;
    msg := 'התשלום התקבל. ההזמנה עברה להפקה';
    perform notify_users(null, null, o.customer_id, msg);
    perform notify_users(o.winery_id, 'winery', null, 'להכין ' || o.bottles || ' בקבוקים להזמנה #' || p_id);
  elsif p_action = 'done' and (r = 'admin' or r = 'printer') and o.status = 'print' then
    update customer_orders set status = 'done' where id = p_id;
    msg := 'ההזמנה מוכנה למשלוח'; perform notify_users(null, null, o.customer_id, msg);
  elsif p_action = 'cancel' and (me_c or r = 'admin') and o.status in ('quote','approved') and o.paid_at is null then
    update customer_orders set status = 'cancel' where id = p_id;
    msg := 'ההזמנה בוטלה' || coalesce(': ' || nullif(p_note, ''), '');
    perform notify_admins(msg || ' #' || p_id);
  elsif p_action = 'sign' and (a.user_id = auth.uid() or r = 'admin') then
    update edition_items set signed_at = now(), signed_by = auth.uid() where order_id = p_id and signed_at is null;
    msg := 'האמן חתם על התעודות';
  elsif p_action = 'stamp' and ((r = 'gallery' and a.gallery_id = my_org()) or r = 'admin') then
    update edition_items set gallery_stamped_at = now() where order_id = p_id and gallery_stamped_at is null;
    msg := 'הגלריה הטביעה חותמת על התעודות';
  else
    raise exception 'הפעולה אינה אפשרית בשלב הזה';
  end if;
  update customer_orders set log = log || jsonb_build_array(jsonb_build_object('t', msg, 'at', now())) where id = p_id;
  return (select status from customer_orders where id = p_id);
end $$;
grant execute on function direct_action(bigint, text, text) to authenticated;

-- מי רואה הזמנות: היקב הבעלים, היקב המספק, האמן והגלריה, הדפוס, הקונה והמנהל
drop policy if exists co_read on customer_orders;
create policy co_read on customer_orders for select to authenticated using (
     customer_id = auth.uid() or is_admin()
  or (my_role()::text = 'winery'  and (winery_id = my_org() or owner_winery_id = my_org()) and status <> 'quote')
  or (my_role()::text = 'printer' and status in ('print','done')));
drop policy if exists co_art on customer_orders;
create policy co_art on customer_orders for select to authenticated using (
  (status in ('label','approved','print','done') or label_round > 1) and exists (
    select 1 from artists a where a.id = (coalesce(winery_design, design) ->> 'artist')::uuid
      and ((my_role()::text = 'gallery' and a.gallery_id = my_org()) or a.user_id = auth.uid())));

drop policy if exists ei_read on edition_items;
create policy ei_read on edition_items for select to authenticated using (
  is_admin() or exists (select 1 from customer_orders o where o.id = order_id and o.customer_id = auth.uid())
  or exists (select 1 from series s join works w on w.id = s.work_id join artists a on a.id = w.artist_id
             where s.id = series_id and (a.user_id = auth.uid() or (my_role()::text = 'gallery' and a.gallery_id = my_org()))));

-- ---------- 13.11 אימות תעודה, פתוח לכולם ----------
create or replace function verify_certificate(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'kind', e.kind, 'no', e.no,
    'of', case when e.kind = 'print' then s.print_size else s.size end,
    'series', coalesce(s.name, w.title), 'work', w.title, 'year', w.year, 'size', w.size,
    'artist', a.name, 'technique', case when e.kind = 'print' then s.print_technique end,
    'wine', wi.name, 'vintage', wi.vintage, 'winery', wo.name, 'drink_by', wi.drink_by,
    'signed', e.signed_at is not null, 'stamped', e.gallery_stamped_at is not null, 'issued', e.created_at::date)
  from edition_items e join series s on s.id = e.series_id join works w on w.id = s.work_id
       join artists a on a.id = w.artist_id
       left join customer_orders o on o.id = e.order_id
       left join wines wi on wi.id = coalesce(s.wine_id, (o.design ->> 'wine')::bigint)
       left join organizations wo on wo.id = wi.winery_id
  where e.verify = lower(btrim(p_code))
$$;
grant execute on function verify_certificate(text) to anon, authenticated;

-- ---------- 13.12 ביקורי סטודיו, בתיאום עם הגלריה ----------
create table if not exists studio_visits (
  id           bigint generated by default as identity primary key,
  order_id     bigint references customer_orders(id),
  artist_id    uuid not null references artists(id),
  requested_by uuid not null default auth.uid() references profiles(id),
  note         text check (note is null or length(note) <= 500),
  status       text not null default 'requested' check (status in ('requested','accepted','declined','done')),
  visit_at     timestamptz,
  decided_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
alter table studio_visits enable row level security;
drop policy if exists sv_read on studio_visits;
create policy sv_read on studio_visits for select to authenticated using (
  is_admin() or requested_by = auth.uid() or exists (select 1 from artists a where a.id = artist_id
    and (a.user_id = auth.uid() or (my_role()::text = 'gallery' and a.gallery_id = my_org()))));

create or replace function visit_request(p_order bigint, p_note text) returns bigint
language plpgsql security definer set search_path = public as $$
declare o customer_orders; a artists; used int; vid bigint;
begin
  select * into o from customer_orders where id = p_order and customer_id = auth.uid();
  if not found or o.paid_at is null then raise exception 'ביקור בסטודיו פתוח לרוכשי רמת הפטרון אחרי התשלום'; end if;
  if (select level from packages where id = o.package_id) <> 'patron' then raise exception 'ביקור בסטודיו שייך לרמת הפטרון'; end if;
  if exists (select 1 from studio_visits where order_id = p_order and status in ('requested','accepted')) then raise exception 'כבר נשלחה בקשה'; end if;
  select * into a from artists where id = (o.design ->> 'artist')::uuid;
  select count(*) into used from studio_visits where artist_id = a.id and status in ('requested','accepted','done')
    and created_at >= date_trunc('year', now());
  if used >= a.visit_cap then raise exception 'האמן כבר מלא בביקורים השנה'; end if;
  insert into studio_visits (order_id, artist_id, note) values (p_order, a.id, nullif(left(btrim(coalesce(p_note, '')), 500), ''))
    returning id into vid;
  perform notify_users(a.gallery_id, 'gallery', null, 'בקשה לביקור בסטודיו של ' || a.name);
  if a.user_id is not null then perform notify_users(null, null, a.user_id, 'בקשה לביקור בסטודיו שלך'); end if;
  return vid;
end $$;
grant execute on function visit_request(bigint, text) to authenticated;

create or replace function visit_decide(p_id bigint, p_ok boolean, p_at timestamptz default null, p_note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare v studio_visits; a artists; r text := my_role()::text;
begin
  select * into v from studio_visits where id = p_id for update;
  if not found then raise exception 'הבקשה לא נמצאה'; end if;
  select * into a from artists where id = v.artist_id;
  if not (a.user_id = auth.uid() or (r = 'gallery' and a.gallery_id = my_org()) or r = 'admin') then
    raise exception 'רק האמן, הגלריה שלו או המנהל'; end if;
  if v.status <> 'requested' then raise exception 'כבר הוחלט על הבקשה'; end if;
  if p_ok and p_at is null then raise exception 'צריך מועד לביקור'; end if;
  update studio_visits set status = case when p_ok then 'accepted' else 'declined' end, visit_at = p_at, decided_by = auth.uid() where id = p_id;
  perform notify_users(null, null, v.requested_by, case when p_ok then 'הביקור בסטודיו נקבע ל־' || to_char(p_at at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI')
    else 'הביקור בסטודיו לא מתאפשר הפעם' end || coalesce(': ' || nullif(p_note, ''), ''));
  perform notify_users(a.gallery_id, 'gallery', null, 'הוחלט על ביקור בסטודיו של ' || a.name);
  return case when p_ok then 'accepted' else 'declined' end;
end $$;
grant execute on function visit_decide(bigint, boolean, timestamptz, text) to authenticated;

-- פרטי אספנים לגלריה: רק מי שהסכים
create or replace function gallery_collectors() returns table (order_id bigint, artist text, name text, phone text, email text, ordered date)
language sql stable security definer set search_path = public as $$
  select o.id, a.name, c.cust ->> 'n', c.cust ->> 'ph', c.cust ->> 'em', o.created_at::date
  from customer_orders o join order_contacts c on c.order_id = o.id
       join artists a on a.id = (o.design ->> 'artist')::uuid
  where o.channel = 'direct' and o.collector_consent and o.paid_at is not null
    and (is_admin() or (my_role()::text = 'gallery' and a.gallery_id = my_org()))
  order by o.id desc
$$;
grant execute on function gallery_collectors() to authenticated;

-- ---------- 13.13 טיוטות לשיתוף עם מאשר בחברה ----------
create table if not exists order_drafts (
  token      text primary key default substr(md5(random()::text || clock_timestamp()::text), 1, 16),
  owner      uuid not null default auth.uid() references profiles(id) on delete cascade,
  data       jsonb not null check (pg_column_size(data) < 20000),
  created_at timestamptz not null default now()
);
alter table order_drafts enable row level security;
drop policy if exists od_own on order_drafts;
create policy od_own on order_drafts for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create or replace function get_draft(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select data from order_drafts where token = p_token and created_at > now() - interval '60 days'
$$;
grant execute on function get_draft(text) to anon, authenticated;

-- ---------- 13.14 לוגו של הקונה: תיקייה פרטית ----------
insert into storage.buckets (id, name, public) values ('logos', 'logos', false) on conflict (id) do nothing;
do $$ begin
  update storage.buckets set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/png','image/svg+xml','image/jpeg','image/webp'] where id = 'logos';
exception when others then null; end $$;
drop policy if exists "logos write" on storage.objects;
drop policy if exists "logos read" on storage.objects;
create policy "logos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos read" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and ((storage.foldername(name))[1] = auth.uid()::text or my_role()::text in ('admin','printer')));

-- ---------- 13.15 הקטלוג הציבורי ----------
create or replace function catalog() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'open', s.direct_open and (s.order_cutoff is null or current_date <= s.order_cutoff),
    'lead_days', s.lead_days, 'cutoff', s.order_cutoff, 'vat', s.vat_pct,
    'packages', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort) from packages p where p.active), '[]'),
    'artists', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'bio', a.bio, 'country', a.country,
        'tier', a.tier, 'levels', (select coalesce(jsonb_agg(l.level), '[]') from artist_levels l
                                   where l.artist_id = a.id and l.artist_ok and l.gallery_ok)))
      from artists a where exists (select 1 from artist_levels l where l.artist_id = a.id and l.artist_ok and l.gallery_ok)), '[]'),
    'works', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'artist', w.artist_id, 'title', w.title, 'year', w.year,
        'size', w.size, 'tone', w.tone, 'preview', w.preview_path, 'zones', case when w.frame_ok then to_jsonb(w.frame_zones) else '[]' end))
      from works w where w.status = 'live' and w.available
        and exists (select 1 from artist_levels l where l.artist_id = w.artist_id and l.artist_ok and l.gallery_ok)), '[]'),
    'wines', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'vintage', w.vintage, 'type', w.type,
        'winery', o.name, 'kosher', o.kosher, 'price', wine_unit(w.id), 'drink_by', w.drink_by, 'free', shiners_free(w.id)))
      from wines w join organizations o on o.id = w.winery_id
      where w.direct and o.partner and o.active and wine_unit(w.id) is not null and shiners_free(w.id) > 0), '[]'),
    'series', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'work', x.work_id, 'wine', x.wine_id, 'kind', x.kind,
        'name', x.name, 'size', x.size, 'free', series_free(x.id), 'levels', x.levels, 'technique', x.print_technique,
        'print_size', x.print_size, 'print_free', case when x.print_size is not null then x.print_size - x.print_next + 1 end))
      from series x where x.closed_at is null), '[]'))
  from settings s where s.id = 1
$$;
grant execute on function catalog() to anon, authenticated;
-- ═══ 14. מיילים: תור יוצא ═══
-- כל הודעה במערכת נכנסת גם לתור מיילים. הפונקציה mail-outbox שולחת מהתור כשיש מפתח של ספק המיילים.
-- משתמש יכול לבטל מיילים (profiles.mail_opt). בלי מפתח שום דבר לא נשלח, והתור פשוט מחכה.
alter table profiles add column if not exists mail_opt boolean not null default true;
create table if not exists mail_outbox (
  id bigint generated always as identity primary key,
  user_id uuid, to_email text not null, subject text not null, body text not null, link text,
  created_at timestamptz not null default now(), sent_at timestamptz, tries int not null default 0, error text);
create index if not exists mail_outbox_wait on mail_outbox (id) where sent_at is null;
alter table mail_outbox enable row level security;
drop policy if exists mo_admin on mail_outbox;
create policy mo_admin on mail_outbox for select using (is_admin());

create or replace function notif_mail() returns trigger
language plpgsql security definer set search_path = public as $$
declare em text; pr profiles;
begin
  select * into pr from profiles where id = new.user_id;
  if not found or not pr.mail_opt then return new; end if;
  select email into em from auth.users where id = new.user_id;
  if em is null or em like '%@test.local' then return new; end if;
  insert into mail_outbox (user_id, to_email, subject, body, link)
  values (new.user_id, em, 'Grape Arts: ' || left(new.body, 70), new.body,
          case when pr.role::text = 'customer' and pr.org_id is null then '/Portal/shop.html#orders' else '/Portal/' end);
  return new;
end $$;
drop trigger if exists notif_mail_t on notifications;
create trigger notif_mail_t after insert on notifications for each row execute function notif_mail();

-- המשתמש מדליק או מכבה מיילים לעצמו
create or replace function set_mail_opt(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'צריך להתחבר'; end if;
  perform set_config('app.bypass', '1', true);
  update profiles set mail_opt = p_on where id = auth.uid();
end $$;
grant execute on function set_mail_opt(boolean) to authenticated;

