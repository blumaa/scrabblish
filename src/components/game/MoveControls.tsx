import { useState } from 'react';
import { Spinner } from '../atoms/Spinner';
import './MoveControls.css';

interface MoveControlsProps {
  canSubmit: boolean;
  hasPendingTiles: boolean;
  isMyTurn: boolean;
  syncing: boolean;
  swapMode: boolean;
  swapCount: number;
  tilesRemaining: number;
  onSubmit: () => void;
  onRecallAll: () => void;
  onShuffle: () => void;
  onEnterSwapMode: () => void;
  onConfirmSwap: () => void;
  onCancelSwap: () => void;
}

export function MoveControls({
  canSubmit,
  hasPendingTiles,
  isMyTurn,
  syncing,
  swapMode,
  swapCount,
  tilesRemaining,
  onSubmit,
  onRecallAll,
  onShuffle,
  onEnterSwapMode,
  onConfirmSwap,
  onCancelSwap,
}: MoveControlsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isMyTurn) {
    return (
      <div className="controls">
        <div className="controls-waiting">Waiting for opponent...</div>
      </div>
    );
  }

  // Confirmation modal
  if (showConfirm) {
    return (
      <div className="controls controls-confirm">
        <div className="controls-confirm-text">
          Swap {swapCount} tile{swapCount !== 1 ? 's' : ''}? You will lose your turn.
        </div>
        <button
          className="ctrl-btn ctrl-btn-primary"
          onClick={() => {
            setShowConfirm(false);
            onConfirmSwap();
          }}
        >
          Confirm
        </button>
        <button
          className="ctrl-btn ctrl-btn-secondary"
          onClick={() => {
            setShowConfirm(false);
            onCancelSwap();
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Swap mode: selecting tiles
  if (swapMode) {
    return (
      <div className="controls">
        <div className="controls-swap-hint">Tap tiles to select for swap</div>
        <button
          className="ctrl-btn ctrl-btn-primary"
          onClick={() => setShowConfirm(true)}
          disabled={swapCount === 0 || swapCount > tilesRemaining}
        >
          Swap{swapCount > 0 ? ` (${swapCount})` : ''}
        </button>
        <button
          className="ctrl-btn ctrl-btn-secondary"
          onClick={onCancelSwap}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Normal mode
  return (
    <div className="controls">
      <button
        className="ctrl-btn ctrl-btn-primary"
        onClick={onSubmit}
        disabled={!canSubmit || syncing}
      >
        {syncing ? <Spinner size="sm" /> : 'Submit'}
      </button>
      <button
        className="ctrl-btn ctrl-btn-secondary"
        onClick={onRecallAll}
        disabled={!hasPendingTiles}
      >
        Recall
      </button>
      <button
        className="ctrl-btn ctrl-btn-secondary"
        onClick={onShuffle}
      >
        Shuffle
      </button>
      <button
        className="ctrl-btn ctrl-btn-secondary"
        onClick={onEnterSwapMode}
      >
        Swap
      </button>
    </div>
  );
}
