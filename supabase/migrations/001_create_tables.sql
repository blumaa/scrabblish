-- Profiles for display and discovery
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) <= 30),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz not null default now()
);

-- Games: each game has its own language set
create table games (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null,
  languages text[] not null default '{en,de}',
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  player1_id uuid not null references auth.users(id),
  player2_id uuid references auth.users(id),
  current_turn uuid references auth.users(id),
  move_number int not null default 0,
  board_state jsonb not null default '[]'::jsonb,
  winner_id uuid references auth.users(id),
  stats_computed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_move_at timestamptz
);

create index idx_games_player1 on games(player1_id);
create index idx_games_player2 on games(player2_id);
create index idx_games_active on games(status) where status != 'finished';
create index idx_games_join_code on games(join_code) where status = 'waiting';

-- Moves: append-only, one row per turn
create table moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references auth.users(id),
  move_number int not null,
  move_type text not null check (move_type in ('place', 'exchange', 'pass')),
  tiles_placed jsonb,
  words_formed jsonb,
  score int not null default 0,
  tiles_exchanged_count int,
  created_at timestamptz not null default now(),
  unique(game_id, move_number)
);

create index idx_moves_game on moves(game_id);

-- Tile bag + hands: service-role only
create table game_secrets (
  game_id uuid primary key references games(id) on delete cascade,
  tile_bag jsonb not null,
  player1_hand jsonb not null default '[]'::jsonb,
  player2_hand jsonb not null default '[]'::jsonb
);

-- Player stats (language-agnostic)
create table player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_played int not null default 0,
  wins int not null default 0,
  total_score int not null default 0,
  best_word_score int not null default 0,
  best_word text,
  longest_word text,
  current_win_streak int not null default 0,
  best_win_streak int not null default 0,
  updated_at timestamptz not null default now()
);

-- Per-language word stats (scales without migration)
create table player_language_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null,
  words_played int not null default 0,
  primary key (user_id, language)
);

-- Push notification tokens
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('web', 'ios')),
  last_used_at timestamptz not null default now(),
  unique(user_id, token)
);
