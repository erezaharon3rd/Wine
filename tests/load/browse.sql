\set c random(1, 2000)
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0001-' || lpad(:c::text, 12, '0'), true);
select count(*) from works;
select count(*) from wines;
select count(*) from customer_orders;
commit;
