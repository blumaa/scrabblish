-- Update the profile trigger to include username from metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', lower(split_part(new.email, '@', 1)))
  );
  return new;
end;
$$ language plpgsql security definer;
