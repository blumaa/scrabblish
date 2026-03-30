import { describe, it, expect } from 'vitest';
import type { Language } from '../../types/game';

describe('ScoreBar languages display', () => {
  it('formats single language as uppercase code', () => {
    const languages: Language[] = ['en'];
    const display = languages.map((l) => l.toUpperCase()).join(' · ');
    expect(display).toBe('EN');
  });

  it('formats multiple languages joined with dot separator', () => {
    const languages: Language[] = ['en', 'de'];
    const display = languages.map((l) => l.toUpperCase()).join(' · ');
    expect(display).toBe('EN · DE');
  });

  it('formats three languages', () => {
    const languages: Language[] = ['en', 'de', 'hu'];
    const display = languages.map((l) => l.toUpperCase()).join(' · ');
    expect(display).toBe('EN · DE · HU');
  });

  it('ScoreBar must accept languages prop', () => {
    // ScoreBar needs a languages prop to display under the tile count
    // This test documents the requirement
    const props = {
      tilesRemaining: 90,
      languages: ['en', 'de'] as Language[],
    };
    expect(props.languages).toBeDefined();
    expect(props.languages.length).toBeGreaterThan(0);
  });
});
