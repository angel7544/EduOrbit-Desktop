-- Add 'code' column to offers table
alter table offers add column code text;

-- Add 'coupon_code' column to purchases table (to track which coupon was used)
alter table purchases add column coupon_code text;