-- =====================================================================
--  Grape Arts · הכנה לפיילוט
--  מוחק את כל נתוני הבדיקה וההדגמה, משאיר את המשתמש של מנהל המערכת,
--  יוצר את "יקב 1" ומכניס את 12 היצירות של ארז אהרון כבסיס.
--  מריצים אחרי setup.sql. אפשר להריץ שוב, אבל כל הרצה מוחקת הכל מחדש.
-- =====================================================================

-- 1. מחיקת נתוני בדיקה
delete from deal_messages;
delete from contracts;
delete from invoices;
delete from print_orders;
delete from renders;
delete from notifications;
delete from customer_orders;
delete from deals;
delete from designs;
delete from wines;
delete from works;
delete from applications;
delete from audit_log;

-- כל המשתמשים חוץ ממנהל המערכת חוזרים למצב "ממתין לשיוך"
update profiles set role = null, status = 'pending', org_id = null
where coalesce(role::text, '') <> 'admin';

-- פרופילי אמן נשארים רק למנהל המערכת (ארז)
delete from artists
where user_id is null or user_id not in (select id from profiles where role = 'admin');

-- ארגונים: נשארים הפלטפורמה וגלריה אחת
insert into organizations (kind, name)
select 'gallery', 'הגלריה' where not exists (select 1 from organizations where kind = 'gallery');
update artists set gallery_id = (select id from organizations where kind = 'gallery' order by created_at limit 1);
delete from organizations where kind not in ('admin', 'gallery');
delete from organizations where kind = 'gallery'
  and id <> (select id from organizations where kind = 'gallery' order by created_at limit 1);

-- 2. יקב 1
insert into organizations (kind, name, slug) values ('winery', 'יקב 1', 'yekev1');

-- 3. פרופיל האמן של ארז (אם עוד לא קיים) והיצירות
insert into artists (user_id, gallery_id, name, floor_price, country, style)
select p.id, (select id from organizations where kind = 'gallery' limit 1), 'ארז אהרון', 2500, 'ישראל', 'ציור שמן ריאליסטי'
from profiles p
where p.role = 'admin' and not exists (select 1 from artists a where a.user_id = p.id)
order by p.created_at limit 1;
update artists set style = coalesce(style, 'ציור שמן ריאליסטי'), country = coalesce(country, 'ישראל');

insert into works (artist_id, title, tag, tone, technique, status, available, image_path, px_w, px_h)
select a.id, v.title, v.tag, v.tone, 'שמן על בד', 'live', true, 'https://wine-art.netlify.app/Paintings/' || v.file, v.w, v.h
from (select id from artists order by created_at limit 1) a,
(values
  ('כותנה על טפט',     'טבע דומם', 'ירוק', '_DSC1428_1_small%20(1).jpg', 1557, 2000),
  ('שדה',              'נוף',      'חום',  '_DSC1460_small.jpg',          2000,  812),
  ('חורשה',            'נוף',      'ירוק', '_DSC1470_small.jpg',          2000,  993),
  ('ענף כותנה',        'טבע דומם', 'בז׳',  '_DSF0143-Edit%20(1).jpg',     1491, 2000),
  ('כותנה I',          'טבע דומם', 'בז׳',  '_DSF0146-Edit%20(1).jpg',     1498, 2000),
  ('כותנה II',         'טבע דומם', 'בז׳',  '_DSF0149-Edit%20(1).jpg',     1455, 2000),
  ('פרח סגול',         'בוטני',    'ירוק', '_DSF1430-Edit.jpg',           1683, 2200),
  ('שיבולת',           'בוטני',    'אפור', '_DSF1431-Edit%20(1).jpg',     1662, 2200),
  ('ענף סגול',         'בוטני',    'ירוק', '_DSF1446-Edit%20(1).jpg',     1757, 2200),
  ('ים',               'נוף',      'כחול', '_DSF1708-Edit.jpg',           2000, 1006),
  ('מגן דוד מכותנה',   'סמלי',     'בז׳',  '_DSF8346-Edit-1.jpg',         3543, 2630),
  ('חוטים אדומים',     'סמלי',     'בז׳',  '_DSF83542%20(1).jpg',         3543, 2974)
) as v(title, tag, tone, file, w, h);

select (select count(*) from works) as works,
       (select string_agg(name, ', ') from organizations) as organizations,
       (select count(*) from profiles where role = 'admin') as admins;
