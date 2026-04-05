import { describe, it, expect, vi, beforeEach } from 'vitest';
import { animateTilesFalling, type AnimTile } from './tile-animations';
import type { Board } from '../types/game';

vi.mock('gsap', () => ({
  default: {
    set: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
    killTweensOf: vi.fn(),
  },
}));

function emptyBoard(): Board {
  return Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
}

function boardWith(tiles: { row: number; col: number; letter: string; points: number }[]): Board {
  const board = emptyBoard();
  for (const t of tiles) {
    board[t.row][t.col] = { id: `${t.letter}-0`, letter: t.letter, points: t.points, isBlank: false, row: t.row, col: t.col };
  }
  return board;
}

function createSvgWithCommittedTiles(tiles: { row: number; col: number }[]): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const committedGroup = document.createElementNS(ns, 'g');
  committedGroup.setAttribute('id', 'committed-tiles');

  for (const { row, col } of tiles) {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'placed-tile');
    g.setAttribute('transform', `translate(${col * 50}, ${row * 50})`);
    g.setAttribute('data-pos', `${row}-${col}`);
    committedGroup.appendChild(g);
  }

  svg.appendChild(committedGroup);
  document.body.appendChild(svg);
  return svg;
}

describe('animateTilesFalling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('returns immediately for no tiles', () => {
    const svg = createSvgWithCommittedTiles([]);
    const result = animateTilesFalling(svg, [], emptyBoard());
    expect(result.cleanup).toBeInstanceOf(Function);
  });

  describe('new tiles (isNew=true, hidden by React)', () => {
    it('finds and animates by data-pos', async () => {
      const gsap = await import('gsap');
      const svg = createSvgWithCommittedTiles([{ row: 7, col: 7 }, { row: 7, col: 8 }]);
      const board = boardWith([
        { row: 7, col: 7, letter: 'H', points: 4 },
        { row: 7, col: 8, letter: 'I', points: 1 },
      ]);
      const tiles: AnimTile[] = [
        { row: 7, col: 7, isNew: true },
        { row: 7, col: 8, isNew: true },
      ];

      animateTilesFalling(svg, tiles, board);

      expect(gsap.default.set).toHaveBeenCalledTimes(2);
      expect(gsap.default.to).toHaveBeenCalledTimes(2);
      // Border fade-in uses fromTo
      expect(gsap.default.fromTo).toHaveBeenCalledTimes(1);
    });

    it('sets visibility=visible so GSAP owns the tile', async () => {
      const gsap = await import('gsap');
      const svg = createSvgWithCommittedTiles([{ row: 3, col: 5 }]);
      const board = boardWith([{ row: 3, col: 5, letter: 'A', points: 1 }]);

      animateTilesFalling(svg, [{ row: 3, col: 5, isNew: true }], board);

      expect(gsap.default.set).toHaveBeenCalledWith(
        expect.anything(),
        { attr: { transform: 'translate(250, 80)', opacity: 0, visibility: 'visible' } }
      );
    });
  });

  describe('overlay tiles (isNew=false, intersections)', () => {
    it('creates temporary overlay elements', () => {
      const svg = createSvgWithCommittedTiles([{ row: 7, col: 7 }]);
      const board = boardWith([{ row: 7, col: 7, letter: 'C', points: 3 }]);

      animateTilesFalling(svg, [{ row: 7, col: 7, isNew: false }], board);

      expect(svg.querySelectorAll('.tile-fall-overlay')).toHaveLength(1);
    });

    it('overlay has correct letter and points', () => {
      const svg = createSvgWithCommittedTiles([{ row: 7, col: 7 }]);
      const board = boardWith([{ row: 7, col: 7, letter: 'Z', points: 10 }]);

      animateTilesFalling(svg, [{ row: 7, col: 7, isNew: false }], board);

      const overlay = svg.querySelector('.tile-fall-overlay')!;
      expect(overlay.querySelector('.tile-letter')?.textContent).toBe('Z');
      expect(overlay.querySelector('.tile-points')?.textContent).toBe('10');
    });
  });

  describe('word order is preserved', () => {
    it('animates tiles in the order provided, mixing new and overlay', async () => {
      const gsap = await import('gsap');
      // Word "CAT": C is overlay (intersection), A and T are new
      const svg = createSvgWithCommittedTiles([
        { row: 7, col: 7 }, { row: 7, col: 8 }, { row: 7, col: 9 },
      ]);
      const board = boardWith([
        { row: 7, col: 7, letter: 'C', points: 3 },
        { row: 7, col: 8, letter: 'A', points: 1 },
        { row: 7, col: 9, letter: 'T', points: 1 },
      ]);

      const tiles: AnimTile[] = [
        { row: 7, col: 7, isNew: false }, // C — overlay, first in word
        { row: 7, col: 8, isNew: true },  // A — new
        { row: 7, col: 9, isNew: true },  // T — new
      ];

      animateTilesFalling(svg, tiles, board);

      const calls = vi.mocked(gsap.default.to).mock.calls;
      // 3 tile animations (border uses fromTo separately)
      expect(calls).toHaveLength(3);
      // Stagger follows word order: C=0, A=0.1, T=0.2
      expect(calls[0][1]).toMatchObject({ delay: 0 });
      expect(calls[1][1]).toMatchObject({ delay: 0.1 });
      expect(calls[2][1]).toMatchObject({ delay: 0.2 });
    });
  });

  describe('cleanup', () => {
    it('restores new tiles and removes overlays', async () => {
      const gsap = await import('gsap');
      const svg = createSvgWithCommittedTiles([{ row: 7, col: 8 }]);
      const board = boardWith([
        { row: 7, col: 7, letter: 'C', points: 3 },
        { row: 7, col: 8, letter: 'A', points: 1 },
      ]);

      const tiles: AnimTile[] = [
        { row: 7, col: 7, isNew: false },
        { row: 7, col: 8, isNew: true },
      ];

      const { cleanup } = animateTilesFalling(svg, tiles, board);

      expect(svg.querySelectorAll('.tile-fall-overlay')).toHaveLength(1);
      cleanup();
      expect(svg.querySelectorAll('.tile-fall-overlay')).toHaveLength(0);
      expect(gsap.default.set).toHaveBeenLastCalledWith(
        expect.anything(),
        { attr: { transform: 'translate(400, 350)', opacity: 1 } }
      );
    });

    it('is idempotent', () => {
      const svg = createSvgWithCommittedTiles([{ row: 0, col: 0 }]);
      const board = boardWith([{ row: 0, col: 0, letter: 'A', points: 1 }]);
      const { cleanup } = animateTilesFalling(svg, [{ row: 0, col: 0, isNew: true }], board);
      cleanup();
      cleanup();
    });
  });
});
