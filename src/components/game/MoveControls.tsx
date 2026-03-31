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
  showConfirmOverride?: boolean;
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
  showConfirmOverride,
}: MoveControlsProps) {
  const [showConfirmState, setShowConfirm] = useState(showConfirmOverride ?? false);
  const showConfirm = showConfirmState && swapMode;

  if (!isMyTurn) {
    return (
      <div className="controls">
        <div className="controls-hint">Waiting for opponent...</div>
        <div className="controls-btn-spacer" />
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="controls controls-confirm">
        <div className="controls-hint">
          Swap {swapCount} tile{swapCount !== 1 ? 's' : ''}?
        </div>
        <button
          className="ctrl-btn ctrl-btn-danger"
          onClick={onConfirmSwap}
          disabled={syncing}
        >
          {syncing ? <Spinner size="sm" /> : 'Confirm'}
        </button>
        <button
          className="ctrl-btn ctrl-btn-secondary"
          onClick={() => {
            setShowConfirm(false);
            onCancelSwap();
          }}
          disabled={syncing}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (swapMode) {
    return (
      <div className="controls">
        <div className="controls-hint">Tap tiles to select for swap</div>
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

  return (
    <div className="controls">
      <div className="controls-hint-spacer" />
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
