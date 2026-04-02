import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoveControls } from './MoveControls';

const defaultProps = {
  canSubmit: false,
  hasPendingTiles: false,
  isMyTurn: false,
  syncing: false,
  swapMode: false,
  swapCount: 0,
  tilesRemaining: 10,
  onSubmit: () => {},
  onRecallAll: () => {},
  onShuffle: () => {},
  onEnterSwapMode: () => {},
  onConfirmSwap: () => {},
  onCancelSwap: () => {},
};

describe('MoveControls waiting status messages', () => {
  it('shows "Waiting for opponent to accept..." when not my turn and game is waiting', () => {
    render(<MoveControls {...defaultProps} isMyTurn={false} gameStatus="waiting" />);
    expect(screen.getByText(/waiting for opponent to accept/i)).toBeInTheDocument();
  });

  it('shows "Waiting for opponent..." when not my turn and game is active', () => {
    render(<MoveControls {...defaultProps} isMyTurn={false} gameStatus="active" />);
    expect(screen.getByText('Waiting for opponent...')).toBeInTheDocument();
  });

  it('shows "Waiting for opponent..." when not my turn and no gameStatus provided', () => {
    render(<MoveControls {...defaultProps} isMyTurn={false} />);
    expect(screen.getByText('Waiting for opponent...')).toBeInTheDocument();
  });
});
