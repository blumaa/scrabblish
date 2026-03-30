-- Add invited_user_id to games for direct invitations
alter table games add column if not exists invited_user_id uuid references auth.users(id);

-- Update RLS: invited player can see waiting games targeted at them
drop policy if exists "games_select_participants" on games;
create policy "games_select_participants" on games
  for select to authenticated
  using (
    auth.uid() in (player1_id, player2_id)
    or (invited_user_id = auth.uid() and status = 'waiting')
  );
