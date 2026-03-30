import { describe, it, expect } from 'vitest';
import { createMergedBag, drawTiles } from './tile-bag';

describe('tile distribution fairness', () => {
  it('merged EN+DE bag has ~42% vowels', () => {
    const bag = createMergedBag(['en', 'de']);
    const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü']);
    const vowelCount = bag.filter((t) => vowels.has(t.letter)).length;
    const vowelPct = vowelCount / bag.length;
    // Standard Scrabble is ~42% vowels — should be between 38-46%
    expect(vowelPct).toBeGreaterThan(0.38);
    expect(vowelPct).toBeLessThan(0.46);
  });

  it('first 7 drawn tiles have at least 2 vowels on average', () => {
    const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü']);
    let totalVowels = 0;
    const trials = 100;
    let zeroVowelHands = 0;

    for (let i = 0; i < trials; i++) {
      const bag = createMergedBag(['en', 'de']);
      const { drawn } = drawTiles(bag, 7);
      const handVowels = drawn.filter((t) => vowels.has(t.letter)).length;
      totalVowels += handVowels;
      if (handVowels === 0) zeroVowelHands++;
    }

    const avgVowels = totalVowels / trials;
    // With 42% vowels, expected ~2.94 vowels per hand of 7
    expect(avgVowels).toBeGreaterThan(2.0);
    expect(avgVowels).toBeLessThan(4.5);
    // Zero-vowel hands should be very rare (<5%)
    expect(zeroVowelHands / trials).toBeLessThan(0.05);
  });

  it('shuffle produces different orderings', () => {
    const bags: string[][] = [];
    for (let i = 0; i < 5; i++) {
      const bag = createMergedBag(['en', 'de']);
      bags.push(bag.slice(0, 10).map((t) => t.id));
    }
    // At least 2 of 5 bags should have different first-10 orderings
    const unique = new Set(bags.map((b) => JSON.stringify(b)));
    expect(unique.size).toBeGreaterThan(1);
  });
});
