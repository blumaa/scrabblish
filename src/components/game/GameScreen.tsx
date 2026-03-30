import { useReducer, useRef } from 'react';
import { Board } from '../board/Board';
import { ScoreBar } from './ScoreBar';
import { MoveControls } from './MoveControls';
import { LastPlay } from './LastPlay';
import { GameOverOverlay } from './GameOverOverlay';
import { BlankTileSelector } from './BlankTileSelector';
import { TurnBanner } from './TurnBanner';
import { gameReducer, initialGameState, isMyTurn, isFirstMove } from '../../context/game-reducer';
import { createMergedBag, drawTiles } from '../../lib/tile-bag';
import { useDictionary } from '../../hooks/useDictionary';
import { useGameInteraction } from '../../hooks/useGameInteraction';
import type { GameState, Tile } from '../../types/game';
import './GameScreen.css';

export function GameScreen() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initLocalGame);
  const svgRef = useRef<SVGSVGElement>(null);
  const tileBagRef = useRef<Tile[]>(getInitBag());

  const myTurn = isMyTurn(state);
  const firstMove = isFirstMove(state);

  // Turn banner
  const showTurnBanner = myTurn && state.moveNumber > 0;

  const { loaded: dictLoaded, loading: dictLoading, dicts, progress: dictProgress } = useDictionary(state.languages);

  const me = state.myPlayerId === state.player1.id ? state.player1 : state.player2;

  const interaction = useGameInteraction({
    board: state.board,
    pendingTiles: state.pendingTiles,
    isFirstMove: firstMove,
    dicts,
    onPlaceTile: (tile, row, col) => dispatch({ type: 'PLACE_TILE', tile, position: { row, col } }),
    onRecallTile: (tileId) => dispatch({ type: 'RECALL_TILE', tileId }),
    onRecallAll: () => dispatch({ type: 'RECALL_ALL_TILES' }),
    onMovePendingTile: (tileId, row, col) => dispatch({ type: 'MOVE_PENDING_TILE', tileId, position: { row, col } }),
    onShuffle: () => dispatch({ type: 'SHUFFLE_RACK' }),
    onSubmitValidated: (score, wordStrings) => {
      const newBoard = state.board.map((row) => [...row]);
      for (const t of state.pendingTiles) {
        newBoard[t.row][t.col] = t;
      }

      const { drawn, remaining } = drawTiles(tileBagRef.current, state.pendingTiles.length);
      tileBagRef.current = remaining;

      const newHand = [...me.rack, ...drawn];
      const isP1 = state.myPlayerId === state.player1.id;

      const gameFinished = tileBagRef.current.length === 0 && newHand.length === 0;
      const p1Score = state.player1.score + (isP1 ? score : 0);
      const p2Score = state.player2.score + (isP1 ? 0 : score);
      const winnerId = gameFinished
        ? (p1Score > p2Score ? state.player1.id : p2Score > p1Score ? state.player2.id : null)
        : null;

      dispatch({
        type: 'SYNC_STATE',
        board: newBoard,
        moveNumber: state.moveNumber + 1,
        currentTurn: gameFinished ? null : (isP1 ? state.player2.id : state.player1.id),
        player1Score: p1Score,
        player2Score: p2Score,
        tilesRemaining: tileBagRef.current.length,
        winnerId,
        status: gameFinished ? 'finished' : 'active',
      });
      dispatch({ type: 'MOVE_SUBMITTED', updatedHand: newHand, moveNumber: state.moveNumber + 1 });

      const currentPlayerName = isP1 ? state.player1.displayName : state.player2.displayName;
      dispatch({ type: 'SET_LAST_PLAY', playerName: currentPlayerName, words: wordStrings, score });
      dispatch({ type: 'SET_MY_PLAYER', playerId: isP1 ? state.player2.id : state.player1.id });
    },
    onError: (error) => dispatch({ type: 'MOVE_ERROR', error }),
  });

  const handleConfirmSwap = () => {
    const isP1 = state.myPlayerId === state.player1.id;
    const tilesToSwap = me.rack.filter((t) => interaction.swapSelected.has(t.id));
    const tilesToKeep = me.rack.filter((t) => !interaction.swapSelected.has(t.id));

    const returnedBag = [...tileBagRef.current, ...tilesToSwap];
    const shuffled = returnedBag.sort(() => Math.random() - 0.5);
    const { drawn, remaining } = drawTiles(shuffled, tilesToSwap.length);
    tileBagRef.current = remaining;

    const newHand = [...tilesToKeep, ...drawn];

    dispatch({
      type: 'SYNC_STATE',
      board: state.board,
      moveNumber: state.moveNumber + 1,
      currentTurn: isP1 ? state.player2.id : state.player1.id,
      player1Score: state.player1.score,
      player2Score: state.player2.score,
      tilesRemaining: tileBagRef.current.length,
      winnerId: null,
      status: 'active',
    });
    dispatch({ type: 'MOVE_SUBMITTED', updatedHand: newHand, moveNumber: state.moveNumber + 1 });
    dispatch({ type: 'SET_MY_PLAYER', playerId: isP1 ? state.player2.id : state.player1.id });

    interaction.resetSwap();
  };

  const canSubmit = state.pendingTiles.length > 0 && myTurn && dictLoaded;

  return (
    <div className="game-screen">
      <TurnBanner key={state.moveNumber} visible={showTurnBanner} />
      <ScoreBar
        player1={state.player1}
        player2={state.player2}
        currentTurnPlayerId={state.currentTurnPlayerId}
        myPlayerId={state.myPlayerId}
        tilesRemaining={state.tilesRemaining}
      />

      {state.lastPlay ? (
        <LastPlay
          playerName={state.lastPlay.playerName}
          words={state.lastPlay.words}
          score={state.lastPlay.score}
        />
      ) : (
        <div className="last-play" />
      )}

      <div className="game-board-area">
        <Board
          svgRef={svgRef}
          board={state.board}
          pendingTiles={state.pendingTiles}
          rackTiles={me.rack}
          rackOrder={state.rackOrder}
          onPlaceTile={interaction.swapMode ? undefined : interaction.handlePlaceTile}
          onRecallTile={interaction.swapMode ? undefined : interaction.handleRecallTile}
          onMovePendingTile={interaction.swapMode ? undefined : interaction.handleMovePendingTile}
          swapMode={interaction.swapMode}
          swapSelected={interaction.swapSelected}
          onToggleSwapTile={interaction.handleToggleSwapTile}
          validatedWords={interaction.validatedWords}
        />
      </div>

      {dictLoading && (
        <div className="game-dict-loading">{dictProgress || 'Loading dictionaries...'}</div>
      )}

      {state.error && (
        <div className="game-error" onClick={() => dispatch({ type: 'CLEAR_ERROR' })}>
          {state.error}
        </div>
      )}

      <MoveControls
        canSubmit={canSubmit}
        hasPendingTiles={state.pendingTiles.length > 0}
        isMyTurn={myTurn}
        syncing={state.syncing}
        swapMode={interaction.swapMode}
        swapCount={interaction.swapSelected.size}
        tilesRemaining={state.tilesRemaining}
        onSubmit={interaction.handleSubmit}
        onRecallAll={interaction.handleRecallAll}
        onShuffle={interaction.handleShuffle}
        onEnterSwapMode={interaction.handleEnterSwapMode}
        onConfirmSwap={handleConfirmSwap}
        onCancelSwap={interaction.handleCancelSwap}
      />

      {interaction.blankPending && (
        <BlankTileSelector
          languages={state.languages}
          onSelect={interaction.handleBlankLetterSelected}
          onCancel={interaction.handleBlankCancelled}
        />
      )}

      {state.status === 'finished' && (
        <GameOverOverlay
          player1={state.player1}
          player2={state.player2}
          myPlayerId={state.myPlayerId}
          onRematch={() => window.location.reload()}
        />
      )}
    </div>
  );
}

function initLocalGame(): GameState {
  const bag = createMergedBag(['en', 'de']);
  const { drawn: hand1, remaining: afterHand1 } = drawTiles(bag, 7);
  const { drawn: hand2, remaining: afterHand2 } = drawTiles(afterHand1, 7);

  _initBag = afterHand2;

  return {
    ...initialGameState,
    gameId: 'local',
    joinCode: null,
    languages: ['en', 'de'],
    status: 'active',
    myPlayerId: 'p1',
    player1: { id: 'p1', displayName: 'Player 1', rack: hand1, score: 0 },
    player2: { id: 'p2', displayName: 'Player 2', rack: hand2, score: 0 },
    currentTurnPlayerId: 'p1',
    tilesRemaining: afterHand2.length,
  };
}

let _initBag: Tile[] = [];

function getInitBag(): Tile[] {
  const bag = _initBag;
  _initBag = [];
  return bag;
}
