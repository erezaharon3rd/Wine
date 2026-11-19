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
update works set status='live' where id=2;
select t_eq((select status::text from works where id=2), 'live', 'אישור הגלריה מפרסם ישר למאגר');
reset role; update works set status='pending' where id=2; set role authenticated;

-- בדיקת קובץ אוטומטית בהעלאה
select t_as('00000000-0000-0000-0000-0000000000d1');
select t_fail($$insert into works (artist_id, title, px_w, px_h) values ('20000000-0000-0000-0000-000000000001','קטן',800,600)$$, 'קובץ ברזולוציה נמוכה נחסם');
select t_fail($$insert into works (artist_id, title) values ('20000000-0000-0000-0000-000000000001','בלי נתונים')$$, 'קובץ בלי מידות נחסם');
insert into works (artist_id, title, px_w, px_h, phash) values ('20000000-0000-0000-0000-000000000001','גדול',2400,3000,'a5a5a5a5a5a5a5a5');
select t_eq((select status::text from works where title='גדול'), 'pending', 'יצירה של אמן מחכה לאישור הגלריה');
select t_fail($$insert into works (artist_id, title, px_w, px_h, phash) values ('20000000-0000-0000-0000-000000000001','שוב',2400,3000,'a5a5a5a5a5a5a5a4')$$, 'אותה תמונה פעמיים נחסמת');
select t_as('00000000-0000-0000-0000-0000000000c1');
insert into works (artist_id, title, px_w, px_h, phash) values ('20000000-0000-0000-0000-000000000001','של הגלריה',3000,4000,'0f0f0f0f0f0f0f0f');
select t_eq((select status::text from works where title='של הגלריה'), 'live', 'העלאה של הגלריה עולה ישר למאגר');
reset role; delete from works where title in ('גדול','של הגלריה'); set role authenticated;

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
select t_fail($$select advance_deal(1000,'sign')$$, 'אי אפשר לחתום לפני ששני הצדדים אישרו את התווית');
select label_action('deal',1000,'approve');
select t_as('00000000-0000-0000-0000-0000000000d1');
select t_fail($$select label_action('deal',1000,'change')$$, 'בקשת שינוי בלי הסבר נחסמת');
select label_action('deal',1000,'change','להגדיל את הציור');
select t_eq((select label_round||':'||coalesce(label_ok_w,0) from deals where id=1000), '2:0', 'בקשת שינוי פותחת סבב חדש ומאפסת את האישור של היינן');
select label_action('deal',1000,'comment','עדיף רקע בהיר');
select label_action('deal',1000,'approve');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_fail($$select advance_deal(1000,'sign')$$, 'עדיין חסר אישור היינן בסבב החדש');
select label_action('deal',1000,'approve');
select t_eq((select count(*) from label_notes where entity='deal' and entity_id=1000)::int >= 5, true, 'כל הסבב שמור בשיחה');
select t_as('00000000-0000-0000-0000-0000000000b2');
select t_fail($$select label_action('deal',1000,'comment','שלום')$$, 'יקב אחר לא משתתף בסבב');
select t_eq((select count(*) from label_notes where entity_id=1000)::int, 0, 'יקב אחר לא רואה את ההערות');
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

-- רישיון בלעדי פעיל נועל את היצירה מיד
select t_as('00000000-0000-0000-0000-0000000000b2');
select t_fail($$select request_license(1,2,null,'x','one','a',false)$$, 'יקב אחר לא יכול לבקש יצירה בבלעדיות');
reset role; update deals set exclusive = false where id = 1000; select work_refresh_available(1); update deals set exclusive = true where id = 1000; set role authenticated;
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
select t_eq(corder_action(5001,'cok'),'label','הלקוח אישר, והתווית עברה לאישור האמן');
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_eq((select count(*) from customer_orders where id=5001)::int, 1, 'הגלריה רואה את התווית שמחכה לה');
select label_action('corder',5001,'change','השם על התווית ארוך מדי');
select t_eq((select status from customer_orders where id=5001), 'sent', 'בקשת שינוי מהגלריה מחזירה ליקב');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq(corder_action(5001,'wok'),'label','היקב תיקן ואישר, חזרה לאמן');
select t_as('00000000-0000-0000-0000-0000000000f1');
select label_action('corder',5001,'comment','תודה!');
select t_fail($$select label_action('corder',5001,'approve')$$, 'הלקוח לא מאשר את התווית הסופית');
select t_as('00000000-0000-0000-0000-0000000000d1');
select label_action('corder',5001,'approve');
select t_eq((select status from customer_orders where id=5001), 'approved', 'אחרי אישור האמן ההזמנה אושרה');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_fail($$select corder_action(5001,'wprint')$$, 'אין דפוס לפני תשלום');
reset role; update organizations set auto_print = false where id='10000000-0000-0000-0000-0000000000b1'; set role authenticated; select t_as('00000000-0000-0000-0000-0000000000b1');
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


-- ---------- מנוע: תקציב, מכסה לפי ארגון, מפסק בטיחות ----------
reset role;
update settings set render_quota = 2, customer_render_quota = 1, engine_budget = 100, cost_image = 1, breaker_fails = 3;
delete from engine_usage;
set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq(render_quota_left(), 2, 'מכסה של יקב');
select engine_take('image'); select engine_report(true);
select t_as('00000000-0000-0000-0000-0000000000f2');            -- איש צוות נוסף באותו יקב
select t_eq(render_quota_left(), 1, 'המכסה משותפת לכל אנשי היקב');
select engine_take('image'); select engine_report(false);
select t_eq(render_quota_left(), 1, 'צילום שנכשל לא נספר');
select engine_take('image'); select engine_report(true);
select t_fail($$select engine_take('image')$$, 'המכסה של היקב נגמרה');
reset role; update organizations set render_quota = 5 where id = '10000000-0000-0000-0000-0000000000b1'; set role authenticated;
select t_eq(render_quota_left(), 3, 'מכסה מיוחדת ליקב');
reset role; update settings set engine_budget = 2.5; set role authenticated;
select t_fail($$select engine_take('image')$$, 'התקציב החודשי נוצל');
reset role; update settings set engine_budget = 100; delete from engine_usage;
insert into engine_usage (user_id, kind, state, created_at) select '00000000-0000-0000-0000-0000000000b1','image','failed', now() from generate_series(1,3);
set role authenticated;
select t_fail($$select engine_take('text')$$, 'מפסק הבטיחות משבית את המנוע אחרי כשלים');
reset role; delete from engine_usage; set role authenticated;
select t_eq(engine_take('text') >= 0, true, 'המנוע חוזר לעבוד');
select t_fail($$select engine_status()$$, 'רק מנהל רואה את מצב המנוע');
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_eq((engine_status()->>'budget')::numeric, 100::numeric, 'מנהל רואה תקציב');

-- ---------- תור עבודות ----------
reset role;
insert into jobs (kind, payload) values ('render', '{"x":1}');
select t_eq((job_claim(array['render'])).attempts, 1, 'המעבד לקח עבודה');
select t_eq((job_claim(array['render'])).id, null::bigint, 'אותה עבודה לא נלקחת פעמיים');
select t_eq(job_finish((select id from jobs limit 1), false, null, 'timeout'), 'queued', 'כישלון ראשון חוזר לתור');
update jobs set run_after = now();
select job_claim(array['render']); select job_finish((select id from jobs limit 1), false, null, 'x');
update jobs set run_after = now();
select job_claim(array['render']);
select t_eq(job_finish((select id from jobs limit 1), false, null, 'x'), 'dead', 'אחרי שלושה ניסיונות העבודה עוברת לרשימת הכשלים');
set role authenticated;
select t_fail($$select job_claim(array['render'])$$, 'הדפדפן לא לוקח עבודות');

-- ---------- הצטרפות עצמית ----------
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f3','gal2@t'),('00000000-0000-0000-0000-0000000000f4','art2@t');
set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000f3');
insert into applications (kind, name, details, site) values ('gallery', 'גלריה חדשה', 'אמנות עכשווית', 'x.co.il');
select t_fail($$insert into applications (kind, name) values ('gallery','שוב')$$, 'בקשה פתוחה אחת בכל פעם');
select t_fail($$insert into applications (kind, name) values ('admin','אני מנהל')$$, 'אי אפשר לבקש להיות מנהל');
select t_fail($$select application_decide((select id from applications limit 1), true)$$, 'מבקש לא מאשר את עצמו');
select t_as('00000000-0000-0000-0000-0000000000f4');
insert into applications (kind, name) values ('artist', 'אמנית חדשה');
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_eq(application_decide((select id from applications where name='גלריה חדשה'), true), 'approved', 'מנהל אישר גלריה');
select t_eq(application_decide((select id from applications where name='אמנית חדשה'), true, '10000000-0000-0000-0000-0000000000c1'), 'approved', 'מנהל אישר אמנית');
reset role;
select t_eq((select p.role::text || ':' || o.name from profiles p join organizations o on o.id = p.org_id where p.email='gal2@t'), 'gallery:גלריה חדשה', 'נוצר ארגון והמבקש שויך');
select t_eq((select gallery_id::text from artists where user_id = '00000000-0000-0000-0000-0000000000f4'), '10000000-0000-0000-0000-0000000000c1', 'האמנית שויכה לגלריה');
set role authenticated;

-- ---------- מדידה ובדיקת תקינות ----------
select track('open_app'); select track('open_app'); select track('BAD event');
reset role;
select t_eq((select sum(n)::int from usage_daily), 2, 'נספרו רק אירועים תקינים, בלי מזהה משתמש');
set role anon;
select t_eq((health()->>'db')::boolean, true, 'בדיקת תקינות זמינה בלי כניסה');
reset role;

-- ---------- סקירת הרשאות אוטומטית ----------
select t_eq((select string_agg(relname, ',') from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), null, 'לכל טבלה יש הרשאות לפי שורה');
select t_eq((select string_agg(p.proname, ',') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
            null, 'כל פונקציה עם הרשאות מוגברות קובעת search_path');
set role anon;
select t_eq((select count(*) from organizations)::int + (select count(*) from works)::int + (select count(*) from profiles)::int
            + (select count(*) from deals)::int + (select count(*) from customer_orders)::int, 0, 'אורח בלי כניסה לא רואה כלום');
reset role;

-- ---------- ניטור שגיאות ----------
set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000b1');
select log_error('TypeError at x for dana@mail.com id 00000000-0000-0000-0000-0000000000b1 phone 0501234567', '/Portal/?y=abc#deal-5');
select log_error('TypeError at x for other@mail.com id 00000000-0000-0000-0000-0000000000b2 phone 0529999999', '/Portal/?y=zzz#deal-5');
select t_eq((select count(*) from client_errors)::int, 0, 'יקב לא קורא את רשימת השגיאות');
reset role;
select t_eq((select n from client_errors), 2, 'אותה שגיאה נספרת פעם אחת, בלי פרטים אישיים');
select t_eq((select message from client_errors), 'TypeError at x for <email> id <id> phone <n>', 'מייל, מזהה ומספר הוסרו');
select t_eq((health()->>'client_errors_1h')::int, 2, 'בדיקת התקינות רואה את השגיאות');

-- ---------- אוטומציות ----------
reset role;
select t_eq((select number from invoices where deal_id=1000) ~ '^INV-\d{4}-\d{4}$' or (select number from invoices where deal_id=1000)='INV-1', true, 'לחשבונית יש מספר');
-- בלעדיות: עסקה 1000 פעילה ובלעדית, אז היצירה לא זמינה ליקבים אחרים
select t_eq((select count(*) from print_orders where deal_id=1000)::int, 1, 'הזמנת הדפוס נפתחה אוטומטית אחרי התשלום');
-- תמחור אוטומטי + הסכמה מראש: בקשה קטנה עוברת ישר לחתימה בלי אף אדם
update organizations set auto_price = true where id='10000000-0000-0000-0000-0000000000c1';
update works set available = true, excl_lock = false where id=1;
set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000b1');
select request_license(1,1,null,'אדום','one','a',false);
select t_eq((select status::text from deals order by id desc limit 1), 'sign', 'בקשה קטנה תומחרה ואושרה אוטומטית');
reset role;
update artists set pre_consent = false;
set role authenticated; select t_as('00000000-0000-0000-0000-0000000000b1');
select request_license(1,1,null,'אדום','one','b',false);
select t_eq((select status::text from deals order by id desc limit 1), 'priced', 'בקשה גדולה תומחרה אוטומטית וממתינה לאמן');
reset role;
select t_eq((select note from deals order by id desc limit 1), 'תומחר אוטומטית לפי הנוסחה', 'רשום שהתמחור אוטומטי');
update organizations set auto_price = false;
update works set available = true, excl_lock = false where id=1;
-- הזמנת לקוח: אישור מיד, ודפוס מיד אחרי תשלום
select set_config('request.jwt.claim.sub','',false);
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e9','c9@t');
update profiles set role='customer', status='active', org_id='10000000-0000-0000-0000-0000000000b1' where email='c9@t';
update organizations set auto_approve = true, auto_print = true where id='10000000-0000-0000-0000-0000000000b1';
set role authenticated; select t_as('00000000-0000-0000-0000-0000000000e9');
insert into customer_orders (winery_id, cust, design) values ('10000000-0000-0000-0000-0000000000b1','{"n":"רון"}','{"artist":"20000000-0000-0000-0000-000000000001","work":1,"wine":1,"qty":6}');
select t_eq((select status::text from customer_orders where cust->>'n'='רון'), 'sent', 'אין אישור אוטומטי לתווית');
select t_as('00000000-0000-0000-0000-0000000000b1');
select corder_action((select id from customer_orders where cust->>'n'='רון'),'wok');
select t_as('00000000-0000-0000-0000-0000000000d1');
select label_action('corder',(select id from customer_orders where cust->>'n'='רון'),'approve');
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_eq(corder_action((select id from customer_orders where cust->>'n'='רון'),'wpaid'), 'print', 'אחרי סימון תשלום ההזמנה עברה לדפוס לבד');
reset role;
update organizations set auto_approve = false;
-- העבודה היומית: תזכורת, סגירה, סוף רישיון (רצה בשרת, בלי משתמש מחובר)
select set_config('request.jwt.claim.sub','',false);
update deals set updated_at = now() - interval '5 days' where status = 'priced';
select daily_maintenance();
select t_eq((select count(*) from reminders where kind = 'stale:priced')::int >= 1, true, 'נשלחה תזכורת לבקשה שמחכה');
select t_eq((daily_maintenance()->>'reminders')::int, 0, 'אותה תזכורת לא נשלחת פעמיים באותו יום');
update deals set updated_at = now() - interval '40 days' where status = 'priced';
select daily_maintenance();
select t_eq((select count(*) from deals where status='priced')::int, 0, 'בקשה שתקועה 40 יום נסגרה');
update deals set ends_at = current_date + 20 where id = 1000;
select daily_maintenance();
select t_eq((select count(*) from reminders where entity_id=1000 and kind='end30')::int, 1, 'התראה חודש לפני סוף הרישיון');
update deals set ends_at = current_date - 1 where id = 1000;
update works set available = false, excl_lock = true where id = 1;
select daily_maintenance();
select t_eq((select available from works where id=1), true, 'אחרי סוף רישיון בלעדי היצירה חוזרת להיות זמינה');
select t_eq((select pick_rank from works where id=1) is not null, true, 'יצירה פופולרית נכנסה להמלצות');
-- דוח חודשי
set role authenticated; select t_as('00000000-0000-0000-0000-0000000000c1');
select t_eq((select count(*) from monthly_statement(current_date))::int >= 1, true, 'הגלריה רואה את הדוח החודשי שלה');
select t_as('00000000-0000-0000-0000-0000000000b2');
select t_eq((select count(*) from monthly_statement(current_date))::int, 0, 'יקב לא רואה דוח של גלריה');
reset role;

select 'כל הבדיקות עברו' as result;
