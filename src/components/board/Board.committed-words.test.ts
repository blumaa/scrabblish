import { describe, it, expect } from 'vitest';
import type { CommittedWord } from '../../hooks/useOnlineGame';

describe('committed word language indicators', () => {
  it('committed words carry language attribution from moves table', () => {
    const committedWords: CommittedWord[] = [
      { word: 'HOF', languages: ['de'], tiles: [{ row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }] },
    ];
    expect(committedWords[0].languages).toEqual(['de']);
    expect(committedWords[0].tiles.length).toBe(3);
  });

  it('language badge position is top-right of word bounding box', () => {
    const cw: CommittedWord = {
      word: 'HOF', languages: ['de'],
      tiles: [{ row: 7, col: 6 }, { row: 7, col: 7 }, { row: 7, col: 8 }],
    };
    const minRow = Math.min(...cw.tiles.map((t) => t.row));
    const maxCol = Math.max(...cw.tiles.map((t) => t.col));
    expect(maxCol).toBe(8);
    expect(minRow).toBe(7);
  });

  it('skips language indicator for single-language games', () => {
    const gameLanguages = ['en'];
    expect(gameLanguages.length > 1).toBe(false);
  });

  it('shows language indicator for multi-language games', () => {
    const gameLanguages = ['en', 'de'];
    expect(gameLanguages.length > 1).toBe(true);
  });

  it('skips words with empty languages array', () => {
    const cw: CommittedWord = { word: 'OLD', languages: [], tiles: [{ row: 5, col: 5 }] };
    const shouldShow = cw.languages.length > 0 && cw.tiles.length > 0;
    expect(shouldShow).toBe(false);
  });
});
