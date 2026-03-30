-- Add notification preference to profiles
alter table profiles add column if not exists notifications_enabled boolean not null default true;
