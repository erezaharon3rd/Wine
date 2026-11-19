-- נתונים לבדיקת עומס: 50 יקבים, 2,000 לקוחות, 12 יצירות
insert into auth.users (id, email) select ('00000000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'c' || g || '@load' from generate_series(1, 2000) g;
insert into auth.users (id, email) select ('00000000-0000-0000-0002-' || lpad(g::text, 12, '0'))::uuid, 'w' || g || '@load' from generate_series(1, 50) g;
insert into auth.users (id, email) values ('00000000-0000-0000-0003-000000000001', 'art@load');
insert into organizations (id, kind, name, slug, pricing)
select ('00000000-0000-0000-0004-' || lpad(g::text, 12, '0'))::uuid, 'winery', 'יקב ' || g, 'w' || g, '{"prices":{}}' from generate_series(1, 50) g;
insert into organizations (id, kind, name) values ('00000000-0000-0000-0005-000000000001', 'gallery', 'גלריה');
update profiles set role = 'winery', status = 'active', org_id = ('00000000-0000-0000-0004-' || right(id::text, 12))::uuid where email like 'w%@load';
update profiles set role = 'customer', status = 'active', org_id = ('00000000-0000-0000-0004-' || lpad((1 + (right(id::text, 12))::int % 50)::text, 12, '0'))::uuid where email like 'c%@load';
insert into artists (id, user_id, gallery_id, name, floor_price) values ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0005-000000000001', 'אמן', 2500);
insert into works (artist_id, title, status) select '00000000-0000-0000-0006-000000000001', 'יצירה ' || g, 'live' from generate_series(1, 12) g;
insert into wines (winery_id, name, type) select id, 'אדום', 'red' from organizations where kind = 'winery';
update settings set render_quota = 100000, customer_render_quota = 100000, engine_budget = 1e9, engine_daily_cap = 1000000, engine_per_minute = 100000, text_daily_quota = 100000;
