-- Add unique username to profiles
alter table profiles add column if not exists username text unique;
alter table profiles add constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20);
alter table profiles add constraint username_format check (username ~ '^[a-zA-Z0-9_]+$');

-- Friends table (bidirectional — if A adds B, both see each other)
create table friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, friend_id),
  check (user_id != friend_id)
);

create index idx_friends_user on friends(user_id);
create index idx_friends_friend on friends(friend_id);

-- RLS for friends
alter table friends enable row level security;

-- Users can see their own friendships
create policy "friends_select_own" on friends
  for select to authenticated
  using (auth.uid() in (user_id, friend_id));

-- Users can add friends
create policy "friends_insert_own" on friends
  for insert to authenticated
  with check (user_id = auth.uid());

-- Users can remove friends
create policy "friends_delete_own" on friends
  for delete to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

-- Allow profiles to be updated by owner (for setting username)
-- (policy already exists from 002, but adding username-specific)

-- Allow searching profiles by username (all authenticated users can search)
-- (select policy already allows all authenticated)
