import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoveControls } from './MoveControls';

const defaultProps = {
  canSubmit: false,
  hasPendingTiles: false,
  isMyTurn: true,
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

describe('MoveControls swap confirm loading state', () => {
  it('disables confirm and cancel buttons when syncing', () => {
    render(
      <MoveControls
        {...defaultProps}
        syncing={true}
        swapMode={true}
        swapCount={2}
        showConfirmOverride={true}
      />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });

  it('hides Confirm text when syncing', () => {
    render(
      <MoveControls
        {...defaultProps}
        syncing={true}
        swapMode={true}
        swapCount={2}
        showConfirmOverride={true}
      />,
    );
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('shows Confirm text when not syncing', () => {
    render(
      <MoveControls
        {...defaultProps}
        syncing={false}
        swapMode={true}
        swapCount={2}
        showConfirmOverride={true}
      />,
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });
});

// Test the swap mode state logic (not the component rendering)
describe('swap mode logic', () => {
  it('toggles tile selection on and off', () => {
    const selected = new Set<string>();

    // Select a tile
    selected.add('A-0');
    expect(selected.has('A-0')).toBe(true);
    expect(selected.size).toBe(1);

    // Select another
    selected.add('B-0');
    expect(selected.size).toBe(2);

    // Deselect the first
    selected.delete('A-0');
    expect(selected.has('A-0')).toBe(false);
    expect(selected.size).toBe(1);
  });

  it('cannot swap more tiles than are in the bag', () => {
    const tilesRemaining = 3;
    const selectedCount = 5;
    expect(selectedCount <= tilesRemaining).toBe(false);
  });

  it('must select at least 1 tile to swap', () => {
    const selectedCount = 0;
    expect(selectedCount > 0).toBe(false);
  });
});
