-- Add persistent score columns to games
alter table games add column if not exists player1_score int not null default 0;
alter table games add column if not exists player2_score int not null default 0;

-- Add best word tracking to moves for stats
alter table moves add column if not exists best_word text;
alter table moves add column if not exists best_word_score int;
