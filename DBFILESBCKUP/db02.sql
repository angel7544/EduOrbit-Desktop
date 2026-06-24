update public.courses c
set purchases_count = coalesce(sub.cnt, 0)
from (
  select course_id, count(*) as cnt
  from public.purchases
  where status = 'success'
  group by course_id
) as sub
where c.id = sub.course_id;

-- Ensure all other courses are at least 0
update public.courses
set purchases_count = 0
where purchases_count is null;