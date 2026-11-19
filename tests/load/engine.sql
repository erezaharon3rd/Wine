\set w random(1, 50)
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0002-' || lpad(:w::text, 12, '0'), true);
select engine_take('image');
select engine_report(true);
commit;
