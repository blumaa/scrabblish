const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate an 8-character join code using non-confusable characters.
 * Excludes 0/O, 1/I/L to prevent transcription errors.
 */
export function generateJoinCode(): string {
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => VALID_CHARS[v % VALID_CHARS.length]).join('');
}

/**
 * Validate a join code format.
 */
export function isValidJoinCode(code: string): boolean {
  const upper = code.toUpperCase();
  if (upper.length !== 8) return false;
  return [...upper].every((c) => VALID_CHARS.includes(c));
}
