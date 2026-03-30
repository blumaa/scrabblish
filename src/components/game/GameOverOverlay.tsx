import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import type { PlayerState } from '../../types/game';
import './GameOverOverlay.css';

interface GameOverOverlayProps {
  player1: PlayerState;
  player2: PlayerState;
  myPlayerId: string | null;
  onRematch: () => void;
}

const CONFETTI_COLORS = ['#d4a854', '#6dbf7a', '#5a7a9e', '#e2dfd8', '#6b5a9e'];
const CONFETTI_COUNT = 40;

function fireConfetti(container: HTMLElement) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    particle.style.width = `${6 + Math.random() * 6}px`;
    particle.style.height = `${4 + Math.random() * 8}px`;
    container.appendChild(particle);

    const startX = container.clientWidth * (0.2 + Math.random() * 0.6);
    const startY = container.clientHeight * 0.5;

    gsap.set(particle, { x: startX, y: startY, rotation: Math.random() * 360 });
    gsap.to(particle, {
      x: startX + (Math.random() - 0.5) * 300,
      y: startY - 200 - Math.random() * 200,
      rotation: Math.random() * 720 - 360,
      opacity: 0,
      duration: 1.2 + Math.random() * 0.8,
      ease: 'power2.out',
      delay: Math.random() * 0.3,
      onComplete: () => particle.remove(),
    });
  }
}

export function GameOverOverlay({ player1, player2, myPlayerId, onRematch }: GameOverOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const p1ScoreRef = useRef<HTMLSpanElement>(null);
  const p2ScoreRef = useRef<HTMLSpanElement>(null);

  const winnerId = player1.score > player2.score ? player1.id
    : player2.score > player1.score ? player2.id
    : null;

  const iWon = winnerId === myPlayerId;
  const isTie = winnerId === null;
  const winner = winnerId === player1.id ? player1 : player2;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) return;

      // Card entrance
      if (cardRef.current) {
        gsap.from(cardRef.current, {
          scale: 0.8,
          opacity: 0,
          duration: 0.4,
          ease: iWon ? 'back.out(1.7)' : 'power2.out',
        });
      }

      // Score count-up
      const countUp = (el: HTMLSpanElement | null, target: number) => {
        if (!el || target === 0) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.0,
          ease: 'power2.out',
          delay: 0.3,
          onUpdate: () => { el.textContent = String(Math.round(obj.val)); },
        });
      };

      countUp(p1ScoreRef.current, player1.score);
      countUp(p2ScoreRef.current, player2.score);

      // Confetti for winner
      if ((iWon || isTie) && overlayRef.current) {
        fireConfetti(overlayRef.current);
      }
    });

    return () => ctx.revert();
  }, [iWon, isTie, player1.score, player2.score]);

  return (
    <div className="game-over-overlay" ref={overlayRef}>
      <div className="game-over-card" ref={cardRef}>
        <h2 className="game-over-title">
          {isTie ? "It's a tie!" : iWon ? 'You won!' : `${winner.displayName} wins!`}
        </h2>

        <div className="game-over-scores">
          <div className={`game-over-player ${winnerId === player1.id ? 'game-over-winner' : ''}`}>
            <span className="game-over-name">{player1.displayName}</span>
            <span className="game-over-score" ref={p1ScoreRef}>0</span>
          </div>
          <div className="game-over-vs">vs</div>
          <div className={`game-over-player ${winnerId === player2.id ? 'game-over-winner' : ''}`}>
            <span className="game-over-name">{player2.displayName}</span>
            <span className="game-over-score" ref={p2ScoreRef}>0</span>
          </div>
        </div>

        <button className="game-over-rematch" onClick={onRematch}>
          Rematch
        </button>
      </div>
    </div>
  );
}
