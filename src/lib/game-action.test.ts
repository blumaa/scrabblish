import { describe, it, expect } from 'vitest';
import { generateJoinCode, isValidJoinCode } from './game-action';

describe('game-action utilities', () => {
  describe('generateJoinCode', () => {
    it('generates an 8-character code', () => {
      const code = generateJoinCode();
      expect(code.length).toBe(8);
    });

    it('uses only non-confusable alphanumeric characters', () => {
      const code = generateJoinCode();
      const validChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    });

    it('does not contain confusable characters (0, O, 1, I, L)', () => {
      // Generate many codes to check
      for (let i = 0; i < 100; i++) {
        const code = generateJoinCode();
        expect(code).not.toMatch(/[0OoIiLl1]/);
      }
    });

    it('generates unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateJoinCode());
      }
      // With 30^8 possibilities, 100 should all be unique
      expect(codes.size).toBe(100);
    });
  });

  describe('isValidJoinCode', () => {
    it('accepts valid 8-char code', () => {
      expect(isValidJoinCode('ABCD2345')).toBe(true);
    });

    it('rejects too short', () => {
      expect(isValidJoinCode('ABC')).toBe(false);
    });

    it('rejects too long', () => {
      expect(isValidJoinCode('ABCDEFGH9')).toBe(false);
    });

    it('rejects confusable characters', () => {
      expect(isValidJoinCode('ABCD0ILO')).toBe(false);
    });

    it('accepts case-insensitively (uppercases)', () => {
      expect(isValidJoinCode('abcd2345')).toBe(true);
    });
  });
});
