-- Enable RLS on all tables
alter table profiles enable row level security;
alter table games enable row level security;
alter table moves enable row level security;
alter table game_secrets enable row level security;
alter table player_stats enable row level security;
alter table player_language_stats enable row level security;
alter table push_tokens enable row level security;

-- ============================================================
-- PROFILES: authenticated can read all, write own only
-- ============================================================
create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on profiles for delete
  to authenticated
  using (id = auth.uid());

-- ============================================================
-- GAMES: participants can read, all writes via Edge Functions
-- ============================================================
create policy "games_select_participants"
  on games for select
  to authenticated
  using (auth.uid() in (player1_id, player2_id));

-- No INSERT/UPDATE/DELETE for authenticated users.
-- All mutations go through Edge Functions using service_role.

-- ============================================================
-- MOVES: participants of parent game can read
-- ============================================================
create policy "moves_select_participants"
  on moves for select
  to authenticated
  using (
    exists (
      select 1 from games
      where games.id = moves.game_id
      and auth.uid() in (games.player1_id, games.player2_id)
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated users.

-- ============================================================
-- GAME_SECRETS: DENY ALL (service-role only)
-- ============================================================
-- No policies = deny all for anon and authenticated.
-- Only service_role (Edge Functions) can access.

-- ============================================================
-- PLAYER_STATS: authenticated can read all, writes via Edge Functions
-- ============================================================
create policy "player_stats_select_authenticated"
  on player_stats for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE for authenticated users.

-- ============================================================
-- PLAYER_LANGUAGE_STATS: authenticated can read all
-- ============================================================
create policy "player_language_stats_select_authenticated"
  on player_language_stats for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE for authenticated users.

-- ============================================================
-- PUSH_TOKENS: users manage own tokens, no reads (service-role only for reads)
-- ============================================================
create policy "push_tokens_insert_own"
  on push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_tokens_update_own"
  on push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_tokens_delete_own"
  on push_tokens for delete
  to authenticated
  using (user_id = auth.uid());

-- No SELECT for authenticated — tokens only read by Edge Functions via service_role.
