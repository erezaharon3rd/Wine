\set c random(1, 2000)
\set w random(1, 12)
\set q random(1, 120)
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0001-' || lpad(:c::text, 12, '0'), true);
insert into customer_orders (winery_id, cust, design)
select org_id, '{"n":"לקוח"}', jsonb_build_object('work', (select min(id) + :w - 1 from works), 'wine', (select id from wines where winery_id = p.org_id), 'artist', '00000000-0000-0000-0006-000000000001', 'shape', 'oval', 'qty', :q)
from profiles p where id = auth.uid();
commit;
