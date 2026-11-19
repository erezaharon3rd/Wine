-- סדנת התווית · הגדרת מנהל המערכת
-- מריצים פעם אחת, אחרי שנכנסת לאתר בפעם הראשונה עם המייל שלך.
-- המשתמש הראשון שנרשם הופך למנהל, ומקבל גם פרופיל אמן.

update profiles set role = 'admin', status = 'active',
  org_id = (select id from organizations where kind = 'admin' order by created_at limit 1),
  full_name = coalesce(full_name, 'ארז אהרון')
where id = (select id from profiles order by created_at limit 1);

insert into organizations (kind, name)
select 'gallery', 'הגלריה'
where not exists (select 1 from organizations where kind = 'gallery');

insert into artists (user_id, gallery_id, name, floor_price)
select p.id, (select id from organizations where kind = 'gallery' order by created_at limit 1), 'ארז אהרון', 2500
from profiles p
where p.role = 'admin' and not exists (select 1 from artists where user_id = p.id)
limit 1;

select email, role, status from profiles;
