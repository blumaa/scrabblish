import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Skeleton } from '../atoms/Skeleton';
import { Spinner } from '../atoms/Spinner';
import { FriendRow } from '../molecules/FriendRow';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useGameManager } from '../../hooks/useGameManager';
import { useFriends } from '../../hooks/useFriends';
import './HomeScreen.css';

export function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);
  const { games, invitations, loading, acceptInvitation, declineInvitation } = useGameManager(user?.id ?? null);
  const { friends } = useFriends(user?.id ?? null);

  const username = profile?.username || user?.email?.split('@')[0] || 'player';
  const avatarIcon = profile?.avatarUrl ?? null;
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (gameId: string) => {
    setAcceptingId(gameId);
    const id = await acceptInvitation(gameId);
    setAcceptingId(null);
    if (id) navigate(`/game/${id}`);
  };

  const userId = user?.id ?? '';
  const myTurnGames = games.filter((g) => g.status === 'active' && g.currentTurn === userId);
  const theirTurnGames = games.filter((g) => g.status === 'active' && g.currentTurn !== userId);
  const waitingGames = games.filter((g) => g.status === 'waiting' && g.player1Id === userId);
  const finishedGames = games.filter((g) => g.status === 'finished').slice(0, 5);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="home-title">Scrabblish</h1>
        <div className="home-header-actions">
          <Link to="/stats" className="home-stats-btn" title="Stats">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="10" width="4" height="8" rx="1" fill="currentColor" />
              <rect x="8" y="6" width="4" height="12" rx="1" fill="currentColor" />
              <rect x="14" y="2" width="4" height="16" rx="1" fill="currentColor" />
            </svg>
          </Link>
          <Avatar name={username} icon={avatarIcon} size="md" onClick={() => navigate('/profile')} />
        </div>
      </header>

      {loading && (
        <div className="home-loading">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      )}

      {invitations.length > 0 && (
        <Card padding="sm" className="home-section">
          <h3 className="home-section-title">Invitations ({invitations.length})</h3>
          {invitations.map((inv) => (
            <div key={inv.id} className="home-invitation-row">
              <div className="home-invitation-info">
                <span className="home-invitation-from">{inv.creatorName} wants to play</span>
                <span className="home-game-langs">{inv.languages.map((l) => l.toUpperCase()).join(' + ')}</span>
              </div>
              <div className="home-invitation-actions">
                <Button variant="primary" size="sm" onClick={() => handleAccept(inv.id)} disabled={acceptingId === inv.id}>
                  {acceptingId === inv.id ? <Spinner size="sm" /> : 'Accept'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => declineInvitation(inv.id)}>✕</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {myTurnGames.length > 0 && (
        <Card padding="sm" className="home-section">
          <h3 className="home-section-title">Your Turn ({myTurnGames.length})</h3>
          {myTurnGames.map((game) => {
            const opponentName = game.player1Id === userId ? game.player2Name : game.player1Name;
            return (
              <button key={game.id} className="home-game-row home-game-my-turn" onClick={() => navigate(`/game/${game.id}`)}>
                <div className="home-game-player">
                  <Avatar name={opponentName ?? '?'} icon={game.opponentAvatarIcon} size="sm" />
                  <div className="home-game-info">
                    <span className="home-game-score">
                      <span className="home-game-me">you</span> {game.myScore} - {game.opponentScore} <span className="home-game-them">{opponentName}</span>
                    </span>
                  </div>
                </div>
                <span className="home-game-your-turn">Your turn</span>
              </button>
            );
          })}
        </Card>
      )}

      {theirTurnGames.length > 0 && (
        <Card padding="sm" className="home-section">
          <h3 className="home-section-title">Their Turn ({theirTurnGames.length})</h3>
          {theirTurnGames.map((game) => {
            const opponentName = game.player1Id === userId ? game.player2Name : game.player1Name;
            return (
              <button key={game.id} className="home-game-row" onClick={() => navigate(`/game/${game.id}`)}>
                <div className="home-game-player">
                  <Avatar name={opponentName ?? '?'} icon={game.opponentAvatarIcon} size="sm" />
                  <div className="home-game-info">
                    <span className="home-game-score">
                      <span className="home-game-me">you</span> {game.myScore} - {game.opponentScore} <span className="home-game-them">{opponentName}</span>
                    </span>
                  </div>
                </div>
                <span className="home-game-their-turn">Waiting...</span>
              </button>
            );
          })}
        </Card>
      )}

      {waitingGames.length > 0 && (
        <Card padding="sm" className="home-section">
          <h3 className="home-section-title">Pending ({waitingGames.length})</h3>
          {waitingGames.map((game) => (
            <div key={game.id} className="home-game-row">
              <span className="home-game-opponent">Waiting for opponent</span>
              <span className="home-game-waiting">Pending</span>
            </div>
          ))}
        </Card>
      )}

      {finishedGames.length > 0 && (
        <Card padding="sm" className="home-section">
          <h3 className="home-section-title">
            Recent Games
            <Link to="/stats" className="home-view-all">View All</Link>
          </h3>
          {finishedGames.map((game) => {
            const result = game.winnerId === userId ? 'W' : game.winnerId === null ? 'T' : 'L';
            const opponent = game.player1Id === userId ? game.player2Name : game.player1Name;
            return (
              <div key={game.id} className="home-game-row home-game-finished">
                <span className={`home-game-result home-game-result--${result}`}>{result}</span>
                <div className="home-game-info">
                  <span className="home-game-opponent">vs {opponent}</span>
                  <span className="home-game-score">{game.myScore} - {game.opponentScore}</span>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Card padding="sm" className="home-section">
        <h3 className="home-section-title">Friends</h3>
        {friends.length === 0 ? (
          <div className="home-empty-friends">
            <p>No friends yet</p>
            <Button variant="primary" onClick={() => navigate('/profile')}>Add Friends</Button>
          </div>
        ) : (
          friends.map((friend) => (
            <FriendRow
              key={friend.userId}
              username={friend.username}
              avatarIcon={friend.avatarUrl}
              action={<Button variant="primary" size="sm" onClick={() => navigate(`/game/new/${friend.userId}`)}>Play</Button>}
            />
          ))
        )}
      </Card>

      {games.length === 0 && invitations.length === 0 && friends.length === 0 && !loading && (
        <Card className="home-empty-state">
          <div className="home-tile-icon">S</div>
          <h2 className="home-empty-title">Play words in any language</h2>
          <p className="home-empty-text">Add a friend to start playing! Tap your profile icon to search by username.</p>
        </Card>
      )}
    </div>
  );
}
