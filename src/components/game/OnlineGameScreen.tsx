import { useRef, useState, useMemo } from 'react';
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
import type { Tile, PlacedTile } from '../../types/game';
import './GameScreen.css';

interface OnlineGameScreenProps {
  gameId: string;
  userId: string;
  callEdgeFunction: (name: string, body: Record<string, unknown>) => Promise<unknown>;
  onBack: () => void;
}

export function OnlineGameScreen({ gameId, userId, callEdgeFunction, onBack }: OnlineGameScreenProps) {
  const {
    gameState: serverState,
    loading,
    error: onlineError,
    myHand,
    submitMove: serverSubmitMove,
    exchangeTiles: serverExchangeTiles,
  } = useOnlineGame(gameId, userId, callEdgeFunction);

  const [pendingTiles, setPendingTiles] = useState<PlacedTile[]>([]);
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [lastPlay, setLastPlay] = useState<{ playerName: string; words: string[]; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [shuffledRack, setShuffledRack] = useState<Tile[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const rack = useMemo(() => {
    const pendingIds = new Set(pendingTiles.map((t) => t.id));
    return myHand.filter((t) => !pendingIds.has(t.id));
  }, [myHand, pendingTiles]);

  const languages = serverState?.languages ?? ['en', 'de'];
  const { loaded: dictLoaded, loading: dictLoading, dicts, progress: dictProgress } = useDictionary(languages);
  const displayRack = (shuffledRack && shuffledRack.length === rack.length) ? shuffledRack : rack;

  const myTurn = serverState?.currentTurnPlayerId === userId;
  const firstMove = serverState?.moveNumber === 0;
  const me = serverState?.myPlayerId === serverState?.player1.id ? serverState?.player1 : serverState?.player2;

  const interaction = useGameInteraction({
    board: serverState?.board ?? [],
    pendingTiles,
    isFirstMove: firstMove ?? true,
    dicts,
    onPlaceTile: (tile, row, col) => {
      if (rackOrder.length === 0) setRackOrder(rack.map((t) => t.id));
      setPendingTiles((prev) => [...prev, { ...tile, row, col }]);
    },
    onRecallTile: (tileId) => setPendingTiles((prev) => prev.filter((t) => t.id !== tileId)),
    onRecallAll: () => { setPendingTiles([]); setRackOrder([]); },
    onMovePendingTile: (tileId, row, col) => {
      setPendingTiles((prev) => prev.map((t) => (t.id === tileId ? { ...t, row, col } : t)));
    },
    onShuffle: () => { setShuffledRack([...rack].sort(() => Math.random() - 0.5)); setRackOrder([]); },
    onSubmitValidated: async (score, words) => {
      setSyncing(true);
      const success = await serverSubmitMove(pendingTiles, score, words);
      setSyncing(false);
      if (success && me) {
        setLastPlay({ playerName: me.displayName, words, score });
        setPendingTiles([]);
        setRackOrder([]);
        setError(null);
      }
    },
    onError: setError,
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
        <div className="game-dict-loading"><Spinner size="sm" /> {dictProgress || 'Loading dictionaries...'}</div>
      )}

      <div className="game-board-area">
        <Board
          svgRef={svgRef}
          board={serverState.board}
          pendingTiles={pendingTiles}
          rackTiles={displayRack}
          rackOrder={rackOrder}
          onPlaceTile={interaction.swapMode ? undefined : interaction.handlePlaceTile}
          onRecallTile={interaction.swapMode ? undefined : interaction.handleRecallTile}
          onMovePendingTile={interaction.swapMode ? undefined : interaction.handleMovePendingTile}
          swapMode={interaction.swapMode}
          swapSelected={interaction.swapSelected}
          onToggleSwapTile={interaction.handleToggleSwapTile}
          validatedWords={interaction.validatedWords}
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
