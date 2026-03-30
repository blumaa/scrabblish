-- Drop the strict constraints that block user creation
alter table profiles drop constraint if exists username_length;
alter table profiles drop constraint if exists username_format;

-- Make username nullable (users can set it later)
alter table profiles alter column username drop not null;

-- Update trigger to sanitize username (remove invalid chars, ensure min length)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
  clean_username text;
begin
  raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    lower(split_part(new.email, '@', 1))
  );

  -- Remove invalid characters and ensure min length
  clean_username := regexp_replace(lower(raw_username), '[^a-z0-9_]', '', 'g');
  if char_length(clean_username) < 3 then
    clean_username := clean_username || substr(md5(new.id::text), 1, 6);
  end if;
  clean_username := substr(clean_username, 1, 20);

  -- Handle uniqueness collision by appending random suffix
  begin
    insert into public.profiles (id, display_name, username)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      clean_username
    );
  exception when unique_violation then
    insert into public.profiles (id, display_name, username)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      clean_username || substr(md5(random()::text), 1, 4)
    );
  end;

  return new;
end;
$$ language plpgsql security definer;
