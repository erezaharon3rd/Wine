-- בדיקות הרשאה ומעברי מצב. רצות על מסד נקי אחרי setup.sql.
-- כל בדיקה שנכשלת עוצרת את ההרצה עם הודעה ברורה.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function t_as(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid, false); end $$;
create or replace function t_fail(q text, why text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then return; end;
  raise exception 'FAIL (צריך היה להיחסם): %', why;
end $$;
create or replace function t_eq(a anyelement, b anyelement, why text) returns void language plpgsql as $$
begin if a is distinct from b then raise exception 'FAIL %: קיבלנו % ציפינו %', why, a, b; end if; end $$;
grant execute on function t_as(text), t_fail(text,text) to authenticated;
grant execute on function t_eq(anyelement,anyelement,text) to authenticated;

-- ---------- נתונים ----------
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','admin@t'), ('00000000-0000-0000-0000-0000000000b1','win1@t'),
 ('00000000-0000-0000-0000-0000000000b2','win2@t'),  ('00000000-0000-0000-0000-0000000000c1','gal@t'),
 ('00000000-0000-0000-0000-0000000000d1','art@t'),   ('00000000-0000-0000-0000-0000000000e1','cust@t'),
 ('00000000-0000-0000-0000-0000000000e2','cust2@t'), ('00000000-0000-0000-0000-0000000000f1','new@t'),
 ('00000000-0000-0000-0000-0000000000f2','inv@t');
insert into organizations (id, kind, name, slug) values
 ('10000000-0000-0000-0000-0000000000b1','winery','יקב א','yka'), ('10000000-0000-0000-0000-0000000000b2','winery','יקב ב','ykb'),
 ('10000000-0000-0000-0000-0000000000c1','gallery','גלריה', null);
update profiles set role='admin',  status='active' where email='admin@t';
update profiles set role='winery', status='active', org_id='10000000-0000-0000-0000-0000000000b1' where email='win1@t';
update profiles set role='winery', status='active', org_id='10000000-0000-0000-0000-0000000000b2' where email='win2@t';
update profiles set role='gallery',status='active', org_id='10000000-0000-0000-0000-0000000000c1' where email='gal@t';
update profiles set role='artist', status='active' where email='art@t';
insert into artists (id, user_id, gallery_id, name, floor_price) values
 ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-0000000000c1','אמן',2500);
insert into storage.objects (bucket_id, name) values ('works','00000000-0000-0000-0000-0000000000d1/1.jpg');
insert into works (id, artist_id, title, status, image_path) values (1,'20000000-0000-0000-0000-000000000001','חורשה','live','00000000-0000-0000-0000-0000000000d1/1.jpg'),(2,'20000000-0000-0000-0000-000000000001','טיוטה','pending',null);
insert into wines (id, winery_id, name, type, vintage) values (1,'10000000-0000-0000-0000-0000000000b1','אדום','red',2024),(2,'10000000-0000-0000-0000-0000000000b2','לבן','white',2024);
update organizations set pricing='{"prices":{"1":120},"artist":{"20000000-0000-0000-0000-000000000001":14}}' where id='10000000-0000-0000-0000-0000000000b1';

set role authenticated;

-- ---------- זהות ----------
select t_as('00000000-0000-0000-0000-0000000000f1');
select t_eq((select count(*) from works)::int, 0, 'משתמש ממתין לא רואה יצירות');
select t_fail($$update profiles set role='admin' where id=auth.uid()$$, 'משתמש לא יכול להפוך לעצמו למנהל');
select t_eq(join_as_customer('nope'), false, 'קישור יקב שגוי');
select t_eq(join_as_customer('yka'), true, 'הצטרפות כלקוח דרך קישור');
select t_eq((select role::text from profiles where id=auth.uid()), 'customer', 'התפקיד לקוח');

-- קישור הצטרפות לארגון
select t_as('00000000-0000-0000-0000-0000000000a1');
insert into org_invites (org_id, role) values ('10000000-0000-0000-0000-0000000000b1','winery');
update org_invites set token='tok1';
select t_as('00000000-0000-0000-0000-0000000000f2');
select t_eq(join_org('tok1'), true, 'הצטרפות לארגון בקישור');
select t_eq((select role::text||':'||org_id from profiles where id=auth.uid()), 'winery:10000000-0000-0000-0000-0000000000b1', 'שויך ליקב א');
select t_eq(join_org('tok1'), false, 'קישור לא משנה תפקיד למי שכבר משויך');

-- ---------- יצירות ----------
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq((select count(*) from works)::int, 1, 'יקב רואה רק יצירות שפורסמו');
select t_as('00000000-0000-0000-0000-0000000000d1');
select t_fail($$update works set status='live' where id=2$$, 'אמן לא מפרסם לעצמו');
select t_as('00000000-0000-0000-0000-0000000000c1');
update works set status='review' where id=2;
select t_fail($$update works set status='live' where id=2$$, 'גלריה לא מפרסמת, רק מעבירה לבדיקה');

-- ---------- עסקה: הסבב המלא ----------
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_fail($$select request_license(2,1,null,'x','one','a',false)$$, 'יצירה שלא פורסמה');
select t_fail($$select request_license(1,2,null,'x','one','a',false)$$, 'יין של יקב אחר');
select t_eq(request_license(1,1,null,'אדום','one','b',true,'5a5a5a5a-0000-0000-0000-000000000001'::uuid), 1000::bigint, 'בקשה ראשונה');
select t_eq(request_license(1,1,null,'אדום','one','b',true,'5a5a5a5a-0000-0000-0000-000000000001'::uuid), 1000::bigint, 'שליחה חוזרת עם אותו מזהה לא יוצרת עסקה שנייה');
select t_eq((select count(*) from deals)::int, 1, 'יש עסקה אחת');
select t_eq((select count(*) from storage.objects where bucket_id='works')::int, 0, 'לפני תשלום היקב רואה רק תצוגה מקדימה');
select t_fail($$select advance_deal(1000,'price',0)$$, 'יקב לא מתמחר');
update deals set status='active';  -- נחסם בשקט על ידי ההרשאות
select t_eq((select status::text from deals where id=1000),'sent','העדכון הישיר לא עבר');

select t_as('00000000-0000-0000-0000-0000000000b2');
select t_eq((select count(*) from deals)::int, 0, 'יקב אחר לא רואה את העסקה');
select t_fail($$select advance_deal(1000,'sign')$$, 'יקב אחר לא חותם');

select t_as('00000000-0000-0000-0000-0000000000c1');
select t_eq(advance_deal(1000,'price',5,'התאמה')::text,'priced','הגלריה תמחרה');
select t_eq((select price_net from deals where id=1000), 6300::numeric, 'מחיר: 2500 × 1.5 × 1.6 + 5%');
select t_fail($$select advance_deal(1000,'paid',0,null,1)$$, 'גרסה ישנה נדחית');

select t_as('00000000-0000-0000-0000-0000000000d1');
select t_eq(advance_deal(1000,'approve')::text,'sign','האמן הסכים');
select t_eq((select template_version from contracts where deal_id=1000), 1, 'החוזה נוצר מתבנית 1');
select t_eq((select terms_hash is not null from contracts where deal_id=1000), true, 'לחוזה יש טביעת אצבע');

select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq(advance_deal(1000,'sign')::text,'pay','היקב חתם');
select t_eq((select total from invoices where deal_id=1000), 7434.00::numeric, 'חשבונית כוללת מע״מ 18%');
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_eq(advance_deal(1000,'paid',0,'INV-1')::text,'active','התשלום אושר');
select t_fail($$insert into audit_log(action) values ('זיוף')$$, 'אי אפשר לכתוב ליומן מהדפדפן');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq((select count(*) from storage.objects where bucket_id='works')::int, 1, 'יקב עם רישיון פעיל מקבל את קובץ המקור');
select t_as('00000000-0000-0000-0000-0000000000b2');
select t_eq((select count(*) from storage.objects where bucket_id='works')::int, 0, 'יקב אחר לא מקבל את קובץ המקור');
select t_as('00000000-0000-0000-0000-0000000000f1');
select t_eq((select count(*) from storage.objects where bucket_id='works')::int, 0, 'לקוח לא מקבל את קובץ המקור');

-- הסכמה מראש
select t_as('00000000-0000-0000-0000-0000000000a1');
update artists set pre_consent = true;
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq(request_license(1,1,null,'אדום','one','a',false)::int, 1001, 'בקשה קטנה');
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_eq(advance_deal(1001,'price',0)::text,'sign','בקשה קטנה עם הסכמה מראש עוברת ישר לחתימה');

-- ---------- הזמנת לקוח ----------
select t_as('00000000-0000-0000-0000-0000000000f1');
select t_eq((select count(*) from wines)::int, 1, 'לקוח רואה רק את יינות היקב שלו');
select t_eq((select count(*) from profiles where id <> auth.uid())::int, 0, 'לקוח לא רואה את אנשי היקב');
insert into customer_orders (winery_id, cust, design, total)
values ('10000000-0000-0000-0000-0000000000b1','{"n":"דנה","ph":"050","em":"d@x"}',
        '{"artist":"20000000-0000-0000-0000-000000000001","work":1,"wine":1,"shape":"arch","pos":50,"zoom":100,"name":"x","foil":true,"qty":6}', 1);
select t_eq((select total from customer_orders), 816::numeric, 'המחיר נקבע בשרת ולא לפי הדפדפן: (120+14+3+6)×0.95=136 ×6');
select t_fail($$insert into customer_orders (winery_id, cust, design) values ('10000000-0000-0000-0000-0000000000b1','{"n":"x"}','{"work":2,"wine":1,"qty":1}')$$, 'יצירה שלא פורסמה');
select t_fail($$insert into customer_orders (winery_id, cust, design) values ('10000000-0000-0000-0000-0000000000b2','{"n":"x"}','{"work":1,"wine":2,"qty":1}')$$, 'הזמנה ליקב אחר');
select t_fail($$insert into customer_orders (winery_id, cust, design) values ('10000000-0000-0000-0000-0000000000b1','{"n":"x"}','{"work":1,"wine":1,"qty":1,"ded":"0123456789012345678901234567890123456789X"}')$$, 'הקדשה ארוכה מדי');

select t_as('00000000-0000-0000-0000-0000000000b2');
select t_eq((select count(*) from customer_orders)::int, 0, 'יקב אחר לא רואה את ההזמנה');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq(corder_action(5001,'wsave','{"artist":"20000000-0000-0000-0000-000000000001","work":1,"wine":1,"shape":"rect","qty":6}'), 'sent', 'היקב שמר התאמה');
select t_eq((select total from customer_orders), 762::numeric, 'המחיר חושב מחדש לפי התאמת היקב');
select t_eq(corder_action(5001,'wsend',null,'התאמה'),'review','נשלח ללקוח');
select t_as('00000000-0000-0000-0000-0000000000f1');
select t_eq(corder_action(5001,'cok'),'approved','הלקוח אישר');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_fail($$select corder_action(5001,'wprint')$$, 'אין דפוס לפני תשלום');
select t_eq(corder_action(5001,'wpaid'),'approved','סומן ששולם');
select t_eq(corder_action(5001,'wprint'),'print','עבר לדפוס');

-- ---------- מנוע ----------
select t_as('00000000-0000-0000-0000-0000000000f1');
select t_eq(engine_take('text') >= 0, true, 'לקוח יכול לנתח');
select t_as('00000000-0000-0000-0000-0000000000e2');
select t_fail($$select engine_take('image')$$, 'משתמש שלא אושר לא משתמש במנוע');

-- ---------- מחיקת חשבון ----------
select t_as('00000000-0000-0000-0000-0000000000f1');
select delete_my_account();
reset role;
select t_eq((select count(*) from auth.users where email='new@t')::int, 0, 'החשבון נמחק');
select t_eq((select cust->>'n' from customer_orders where id=5001), 'לקוח שמחק את חשבונו', 'ההזמנה נשארה בלי שם');
select t_eq((select count(*) from audit_log where entity='works')::int > 0, true, 'שינויים ביצירות נרשמו ביומן אוטומטית');

select 'כל הבדיקות עברו' as result;
