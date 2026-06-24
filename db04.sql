create or replace function public.update_course_purchases_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and NEW.status = 'success') then
    update public.courses
    set purchases_count = purchases_count + 1
    where id = NEW.course_id;
  elsif (tg_op = 'UPDATE') then
    -- pending -> success
    if (OLD.status <> 'success' and NEW.status = 'success') then
      update public.courses
      set purchases_count = purchases_count + 1
      where id = NEW.course_id;
    -- success -> non-success (rare)
    elsif (OLD.status = 'success' and NEW.status <> 'success') then
      update public.courses
      set purchases_count = greatest(purchases_count - 1, 0)
      where id = NEW.course_id;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists purchases_update_course_count on public.purchases;

create trigger purchases_update_course_count
after insert or update on public.purchases
for each row
execute function public.update_course_purchases_count();