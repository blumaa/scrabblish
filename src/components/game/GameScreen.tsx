import { useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import gsap from 'gsap';
import { Board } from '../board/Board';
import { ScoreBar } from './ScoreBar';
import { MoveControls } from './MoveControls';
import { LastPlay } from './LastPlay';
import { GameOverOverlay } from './GameOverOverlay';
import { BlankTileSelector } from './BlankTileSelector';
import { Skeleton } from '../atoms/Skeleton';
import { Spinner } from '../atoms/Spinner';
import { useDictionary } from '../../hooks/useDictionary';
import { useOnlineGame } from '../../hooks/useOnlineGame';
import { useGameInteraction } from '../../hooks/useGameInteraction';
import { useRack } from '../../hooks/useRack';
import { useLastPlayAnimation } from '../../hooks/useLastPlayAnimation';
import { useAuth } from '../../hooks/useAuth';
import { callEdgeFunction } from '../../lib/edge-client';
import type { PlacedTile } from '../../types/game';
import './GameScreen.css';

export function GameScreen() {
  const { id: gameId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const onBack = () => navigate('/');
  const {
    gameState: serverState,
    loading,
    error: onlineError,
    myHand,
    submitMove: serverSubmitMove,
    exchangeTiles: serverExchangeTiles,
    totalTiles,
    committedWords,
  } = useOnlineGame(gameId ?? '', userId, callEdgeFunction);

  const [pendingTiles, setPendingTiles] = useState<PlacedTile[]>([]);
  const [lastPlay, setLastPlay] = useState<{ playerName: string; words: string[]; score: number; tiles: { row: number; col: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pendingShakeRef = useRef<SVGGElement>(null);

  const { animatingTileKeys } = useLastPlayAnimation({ svgRef, loading, serverState });

  const shakePendingTiles = useCallback(() => {
    if (!pendingShakeRef.current) return;
    gsap.to(pendingShakeRef.current, {
      attr: { transform: 'translate(4, 0)' },
      duration: 0.06,
      repeat: 5,
      yoyo: true,
      onComplete: () => { gsap.set(pendingShakeRef.current, { attr: { transform: '' } }); },
    });
  }, []);

  const pendingTileIds = useMemo(
    () => new Set(pendingTiles.map((t) => t.id)),
    [pendingTiles]
  );

  const rack = useRack({ tiles: myHand, pendingTileIds });

  const languages = serverState?.languages ?? ['en', 'de'];
  const { loaded: dictLoaded, loading: dictLoading, dicts } = useDictionary(languages);

  const myTurn = serverState?.currentTurnPlayerId === userId;
  const firstMove = serverState?.board.every((row) => row.every((cell) => cell === null)) ?? true;
  const me = serverState?.myPlayerId === serverState?.player1.id ? serverState?.player1 : serverState?.player2;

  const interaction = useGameInteraction({
    board: serverState?.board ?? [],
    pendingTiles,
    isFirstMove: firstMove ?? true,
    dicts,
    onPlaceTile: (tile, row, col) => {
      rack.snapshotOrder();
      setPendingTiles((prev) => [...prev, { ...tile, row, col }]);
    },
    onRecallTile: (tileId) => setPendingTiles((prev) => prev.filter((t) => t.id !== tileId)),
    onRecallAll: () => setPendingTiles([]),
    onMovePendingTile: (tileId, row, col) => {
      setPendingTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, row, col } : t)));
    },
    onShuffle: () => rack.shuffle(),
    onSubmitValidated: async (score, wordsWithLangs) => {
      setSyncing(true);
      const tilesToAnimate = pendingTiles.map((t) => ({ row: t.row, col: t.col }));
      const success = await serverSubmitMove(pendingTiles, score, wordsWithLangs);
      setSyncing(false);
      if (success && me) {
        setLastPlay({ playerName: me.displayName, words: wordsWithLangs.map((w) => w.word), score, tiles: tilesToAnimate });
        setPendingTiles([]);
        setError(null);
      } else {
        shakePendingTiles();
      }
    },
    onError: setError,
    swapMode: rack.swapMode,
    swapSelected: rack.swapSelected,
    enterSwapMode: rack.enterSwapMode,
    cancelSwapMode: rack.cancelSwapMode,
    toggleSwapTile: rack.toggleSwapTile,
    resetSwap: rack.resetSwap,
  });

  const handleConfirmSwap = async () => {
    setSyncing(true);
    const success = await serverExchangeTiles([...interaction.swapSelected]);
    setSyncing(false);
    if (success) {
      interaction.resetSwap();
      setError(null);
    }
  };

  if (loading) {
    return (
      <div className="game-screen">
        <div className="game-board-area"><Skeleton variant="board" /></div>
      </div>
    );
  }

  if (!serverState) {
    return (
      <div className="game-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-error)', padding: 'var(--space-4)' }}>
          {onlineError || 'Failed to load game'}
        </div>
        <button className="score-bar-back" onClick={onBack} style={{ color: 'var(--text-primary)' }}>Back</button>
      </div>
    );
  }

  const canSubmit = pendingTiles.length > 0 && myTurn && dictLoaded;

  return (
    <div className="game-screen">
      <ScoreBar
        player1={serverState.player1}
        player2={serverState.player2}
        currentTurnPlayerId={serverState.currentTurnPlayerId}
        myPlayerId={userId}
        tilesRemaining={serverState.tilesRemaining}
        totalTiles={totalTiles}
        languages={serverState.languages}
        gameStatus={serverState.status}
        onBack={onBack}
      />

      {(lastPlay || serverState.lastPlay) ? (
        <LastPlay
          playerName={(lastPlay ?? serverState.lastPlay)!.playerName}
          words={(lastPlay ?? serverState.lastPlay)!.words}
          score={(lastPlay ?? serverState.lastPlay)!.score}
        />
      ) : (
        <div className="last-play" />
      )}

      {dictLoading && (
        <div className="game-dict-loading"><Spinner size="sm" /></div>
      )}

      <div className="game-board-area">
        <Board
          svgRef={svgRef}
          pendingShakeRef={pendingShakeRef}
          board={serverState.board}
          pendingTiles={pendingTiles}
          rackTiles={rack.displayTiles}
          rackOrder={rack.slotContents.map((t) => t?.id ?? '')}
          onPlaceTile={interaction.swapMode ? undefined : interaction.handlePlaceTile}
          onRecallTile={interaction.swapMode ? undefined : interaction.handleRecallTile}
          onMovePendingTile={interaction.swapMode ? undefined : interaction.handleMovePendingTile}
          swapMode={interaction.swapMode}
          swapSelected={interaction.swapSelected}
          onToggleSwapTile={interaction.handleToggleSwapTile}
          onReorderTile={rack.reorderTile}
          validatedWords={interaction.validatedWords}
          committedWords={committedWords}
          gameLanguages={serverState.languages}
          animatingTileKeys={animatingTileKeys}
        />
      </div>

      {(error || onlineError) && (
        <div className="game-error" onClick={() => setError(null)}>
          {error || onlineError}
        </div>
      )}

      <MoveControls
        canSubmit={canSubmit}
        hasPendingTiles={pendingTiles.length > 0}
        isMyTurn={myTurn}
        syncing={syncing}
        gameStatus={serverState.status}
        swapMode={interaction.swapMode}
        swapCount={interaction.swapSelected.size}
        tilesRemaining={serverState.tilesRemaining}
        onSubmit={interaction.handleSubmit}
        onRecallAll={interaction.handleRecallAll}
        onShuffle={interaction.handleShuffle}
        onEnterSwapMode={interaction.handleEnterSwapMode}
        onConfirmSwap={handleConfirmSwap}
        onCancelSwap={interaction.handleCancelSwap}
      />

      {interaction.blankPending && (
        <BlankTileSelector
          languages={languages}
          onSelect={interaction.handleBlankLetterSelected}
          onCancel={interaction.handleBlankCancelled}
        />
      )}

      {serverState.status === 'finished' && (
        <GameOverOverlay
          player1={serverState.player1}
          player2={serverState.player2}
          myPlayerId={userId}
          onRematch={onBack}
        />
      )}
    </div>
  );
}
