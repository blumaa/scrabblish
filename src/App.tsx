import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useGameManager } from './hooks/useGameManager';
import { useProfile } from './hooks/useProfile';
import { useFriends } from './hooks/useFriends';
import { useNotifications } from './hooks/useNotifications';
import { useStats } from './hooks/useStats';
import { LoginScreen } from './components/screens/LoginScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { NewGameScreen } from './components/screens/NewGameScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { GameScreen } from './components/game/GameScreen';
import { OnlineGameScreen } from './components/game/OnlineGameScreen';
import { callEdgeFunction } from './lib/edge-client';
import { Spinner } from './components/atoms/Spinner';
import type { Language } from './types/game';

type Screen = 'home' | 'game' | 'local' | 'profile' | 'new-game' | 'stats';

export default function App() {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut, resetPassword, clearError } = useAuth();
  const { games, invitations, loading: gamesLoading, createGame, acceptInvitation, declineInvitation } = useGameManager(user?.id ?? null);
  const { profile, updateProfile } = useProfile(user?.id ?? null);
  const { friends, error: friendsError, searchUsers, addFriend, removeFriend } = useFriends(user?.id ?? null);
  const { enabled: notificationsEnabled, registerPush, unregisterPush } = useNotifications(user?.id ?? null);
  const { stats, languageStats, loading: statsLoading } = useStats(user?.id ?? null);
  const [screen, setScreen] = useState<Screen>(
    new URLSearchParams(window.location.search).get('mode') === 'local' ? 'local' : 'home'
  );
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [newGameFriendId, setNewGameFriendId] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (screen === 'local') {
    return <GameScreen />;
  }

  if (!user) {
    return (
      <LoginScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        error={authError}
        loading={authLoading}
        onClearError={clearError}
      />
    );
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        username={profile?.username ?? ''}
        avatarIcon={profile?.avatarUrl ?? null}
        onUpdateProfile={async (updates) => {
          return updateProfile(updates);
        }}
        friends={friends}
        onSearchUsers={searchUsers}
        onAddFriend={addFriend}
        onRemoveFriend={removeFriend}
        onSignOut={signOut}
        onStartGame={(friendUserId) => {
          setNewGameFriendId(friendUserId);
          setScreen('new-game');
        }}
        onBack={() => setScreen('home')}
        onOpenStats={() => setScreen('stats')}
        error={friendsError}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={async () => {
          if (notificationsEnabled) {
            await unregisterPush();
          } else {
            await registerPush();
          }
        }}
      />
    );
  }

  if (screen === 'stats' && user) {
    // Build game history from finished games
    const finishedGames = games
      .filter((g) => g.status === 'finished')
      .map((g) => ({
        id: g.id,
        languages: g.languages,
        myScore: g.myScore,
        opponentScore: g.opponentScore,
        opponentName: (g.player1Id === user.id ? g.player2Name : g.player1Name) ?? 'Unknown',
        winnerId: g.winnerId,
        finishedAt: g.updatedAt,
      }));

    return (
      <StatsScreen
        stats={stats}
        languageStats={languageStats}
        gameHistory={finishedGames}
        userId={user.id}
        loading={statsLoading}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'new-game' && newGameFriendId) {
    const friend = friends.find((f) => f.userId === newGameFriendId);
    return (
      <NewGameScreen
        friendName={friend?.username ?? 'Friend'}
        onCreateGame={async (languages: Language[]) => {
          const result = await createGame(languages, newGameFriendId ?? undefined);
          if (result) {
            setActiveGameId(result.id);
            setScreen('home');
          }
        }}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'game' && activeGameId && user) {
    return (
      <OnlineGameScreen
        gameId={activeGameId}
        userId={user.id}
        callEdgeFunction={callEdgeFunction}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <HomeScreen
      user={user}
      username={profile?.username ?? ''}
      avatarIcon={profile?.avatarUrl ?? null}
      friends={friends}
      games={games}
      invitations={invitations}
      loading={gamesLoading}
      onStartGame={(friendUserId) => {
        setNewGameFriendId(friendUserId);
        setScreen('new-game');
      }}
      onAcceptInvitation={async (gameId) => {
        const id = await acceptInvitation(gameId);
        if (id) {
          setActiveGameId(id);
          setScreen('game');
        }
      }}
      onDeclineInvitation={declineInvitation}
      onOpenGame={(id) => {
        setActiveGameId(id);
        setScreen('game');
      }}
      onOpenProfile={() => setScreen('profile')}
      onOpenStats={() => setScreen('stats')}
    />
  );
}
