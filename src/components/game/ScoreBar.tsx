import { useRef, useEffect } from "react";
import gsap from "gsap";
import type { PlayerState, Language, GameStatus } from "../../types/game";
import "./ScoreBar.css";

interface ScoreBarProps {
  player1: PlayerState;
  player2: PlayerState;
  currentTurnPlayerId: string | null;
  myPlayerId: string | null;
  tilesRemaining: number;
  totalTiles?: number;
  languages?: Language[];
  gameStatus?: GameStatus;
  onBack?: () => void;
}

export function ScoreBar({
  player1,
  player2,
  currentTurnPlayerId,
  myPlayerId,
  tilesRemaining,
  totalTiles,
  languages,
  gameStatus,
  onBack,
}: ScoreBarProps) {
  return (
    <div className="score-bar">
      {onBack && (
        <button
          className="score-bar-back"
          onClick={onBack}
          aria-label="Back to home"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M13 4L7 10L13 16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div className="scores">
        <PlayerScore
          player={player1}
          isCurrentTurn={currentTurnPlayerId === player1.id}
          isMe={myPlayerId === player1.id}
          tilesRemaining={tilesRemaining}
          gameStatus={gameStatus}
        />
        <div className="score-bar-center">
          {totalTiles ? (
            <div className="tile-ring-wrapper">
              <svg className="tile-ring" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border-default)" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - tilesRemaining / totalTiles)}
                  transform="rotate(-90 24 24)"
                />
              </svg>
              <span className="tile-ring-count">{tilesRemaining}</span>
            </div>
          ) : (
            <span className="tiles-remaining">{tilesRemaining}</span>
          )}
          <span className="tiles-remaining-label">tiles</span>
          {languages && languages.length > 0 && (
            <span className="score-bar-languages">{languages.join(' | ')}</span>
          )}
        </div>
        <PlayerScore
          player={player2}
          isCurrentTurn={currentTurnPlayerId === player2.id}
          isMe={myPlayerId === player2.id}
          tilesRemaining={tilesRemaining}
          gameStatus={gameStatus}
        />
      </div>
    </div>
  );
}

function PlayerScore({
  player,
  isCurrentTurn,
  isMe,
  tilesRemaining,
  gameStatus,
}: {
  player: PlayerState;
  isCurrentTurn: boolean;
  isMe: boolean;
  tilesRemaining: number;
  gameStatus?: GameStatus;
}) {
  const isLastRound = tilesRemaining === 0 && gameStatus !== 'finished';
  const bannerText = isLastRound ? (isCurrentTurn ? 'Last turn' : 'Done') : null;
  const scoreRef = useRef<HTMLSpanElement>(null);
  const prevScoreRef = useRef(player.score);

  useEffect(() => {
    if (player.score !== prevScoreRef.current && scoreRef.current) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!prefersReducedMotion) {
        // Tween the number
        const obj = { val: prevScoreRef.current };
        gsap.to(obj, {
          val: player.score,
          duration: 0.6,
          ease: "power2.out",
          onUpdate: () => {
            if (scoreRef.current)
              scoreRef.current.textContent = String(Math.round(obj.val));
          },
        });

        // Brief scale pulse
        gsap.fromTo(
          scoreRef.current,
          { scale: 1 },
          {
            scale: 1.15,
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut",
          },
        );
      }

      prevScoreRef.current = player.score;
    }
  }, [player.score]);

  return (
    <div
      className={`player-score ${isCurrentTurn ? "player-score-active" : ""}`}
    >
      <span className="player-name">
        {player.displayName || "Player"}
        {isMe && <span className="player-me"> (you)</span>}
      </span>
      {bannerText ? (
        <span className={`player-banner ${bannerText === 'Last turn' ? 'player-banner-last' : 'player-banner-done'}`}>
          {bannerText}
        </span>
      ) : (
        <div className="player-banner-spacer" />
      )}
      <span className="player-points" ref={scoreRef}>
        {player.score}
      </span>
    </div>
  );
}
