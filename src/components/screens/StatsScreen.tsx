import { useNavigate } from 'react-router';
import { BackButton } from '../atoms/BackButton';
import { Card } from '../atoms/Card';
import { Spinner } from '../atoms/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useStats } from '../../hooks/useStats';
import { useGameManager } from '../../hooks/useGameManager';
import type { PlayerStats, GameHistoryItem } from '../../types/stats';
import './StatsScreen.css';

function getWinRate(stats: PlayerStats): number {
  return stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
}

function getAvgScore(stats: PlayerStats): number {
  return stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;
}

function getGameResult(game: GameHistoryItem, userId: string): 'W' | 'L' | 'T' {
  if (game.winnerId === userId) return 'W';
  if (game.winnerId === null) return 'T';
  return 'L';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function StatsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { stats, languageStats, loading } = useStats(userId || null);
  const { games } = useGameManager(userId || null);

  const gameHistory: GameHistoryItem[] = games
    .filter((g) => g.status === 'finished')
    .map((g) => ({
      id: g.id,
      languages: g.languages,
      myScore: g.myScore,
      opponentScore: g.opponentScore,
      opponentName: (g.player1Id === userId ? g.player2Name : g.player1Name) ?? 'Unknown',
      winnerId: g.winnerId,
      finishedAt: g.updatedAt,
    }));

  const sorted = [...gameHistory].sort(
    (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
  );

  return (
    <div className="stats-container">
      <BackButton onClick={() => navigate('/')} />

      {loading && <Spinner size="lg" block />}

      {!loading && !stats && (
        <div className="stats-empty">No stats yet. Play a game to see your stats!</div>
      )}

      {!loading && stats && (
        <>
          <div className="stats-section">
            <h2 className="stats-section-title">Overall</h2>
            <Card padding="md">
              <div className="stats-grid">
                <div className="stats-item">
                  <div className="stats-value">{stats.gamesPlayed}</div>
                  <div className="stats-label">Games</div>
                </div>
                <div className="stats-item">
                  <div className="stats-value">{stats.wins}</div>
                  <div className="stats-label">Wins</div>
                </div>
                <div className="stats-item">
                  <div className="stats-value">{getWinRate(stats)}%</div>
                  <div className="stats-label">Win Rate</div>
                </div>
                <div className="stats-item">
                  <div className="stats-value">{getAvgScore(stats)}</div>
                  <div className="stats-label">Avg Score</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="stats-section">
            <h2 className="stats-section-title">Records</h2>
            <Card padding="md">
              {stats.bestWord && (
                <div className="stats-word-item">
                  <span className="stats-word-label">Best Word</span>
                  <span className="stats-word-value">
                    {stats.bestWord}
                    <span className="stats-word-score">{stats.bestWordScore} pts</span>
                  </span>
                </div>
              )}
              {stats.longestWord && (
                <div className="stats-word-item">
                  <span className="stats-word-label">Longest Word</span>
                  <span className="stats-word-value">{stats.longestWord}</span>
                </div>
              )}
              <div className="stats-word-item">
                <span className="stats-word-label">Total Score</span>
                <span className="stats-word-value">{stats.totalScore.toLocaleString()}</span>
              </div>
              <div className="stats-word-item">
                <span className="stats-word-label">Current Streak</span>
                <span className="stats-word-value">{stats.currentWinStreak}</span>
              </div>
              <div className="stats-word-item">
                <span className="stats-word-label">Best Streak</span>
                <span className="stats-word-value">{stats.bestWinStreak}</span>
              </div>
            </Card>
          </div>

          {languageStats.length > 0 && (
            <div className="stats-section">
              <h2 className="stats-section-title">Languages</h2>
              <Card padding="md">
                {languageStats.map((ls) => (
                  <div key={ls.language} className="stats-lang-row">
                    <span className="stats-lang-code">{ls.language}</span>
                    <span className="stats-lang-count">{ls.wordsPlayed} words</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </>
      )}

      {sorted.length > 0 && (
        <div className="stats-section">
          <h2 className="stats-section-title">Game History</h2>
          <Card padding="sm">
            {sorted.map((game) => {
              const result = getGameResult(game, userId);
              return (
                <div key={game.id} className="stats-game-row">
                  <span className={`stats-game-result stats-game-result--${result}`}>{result}</span>
                  <div className="stats-game-info">
                    <div className="stats-game-opponent">vs {game.opponentName}</div>
                    <div className="stats-game-detail">
                      {game.languages.map((l) => l.toUpperCase()).join(' + ')} · {formatDate(game.finishedAt)}
                    </div>
                  </div>
                  <div className="stats-game-scores">{game.myScore}–{game.opponentScore}</div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}
