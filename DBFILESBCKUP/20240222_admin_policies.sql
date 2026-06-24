-- Policy to allow admins to view all purchases
create policy "Admins can view all purchases"
on purchases for select
to authenticated
using (
  (select role from users where id = auth.uid()) = 'admin'
);

-- Policy to allow admins to view all users (if not already present)
create policy "Admins can view all users"
on users for select
to authenticated
using (
  (select role from users where id = auth.uid()) = 'admin'
);
