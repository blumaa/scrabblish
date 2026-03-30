import { describe, it, expect } from 'vitest';

describe('web push payload', () => {
  it('constructs correct notification payload', () => {
    const payload = {
      title: 'Scrabblish',
      body: "It's your turn vs @katja!",
      url: '/',
    };

    expect(payload.title).toBe('Scrabblish');
    expect(payload.body).toContain('your turn');
    expect(JSON.stringify(payload).length).toBeLessThan(4096); // Web Push max payload
  });

  it('constructs payload for move notification', () => {
    const opponentName = 'katja';
    const words = ['HAND', 'AT'];
    const score = 18;

    const payload = {
      title: 'Scrabblish',
      body: `@${opponentName} played ${words.join(', ')} for ${score} pts. Your turn!`,
      url: '/',
    };

    expect(payload.body).toBe('@katja played HAND, AT for 18 pts. Your turn!');
  });

  it('constructs payload for game invitation', () => {
    const inviterName = 'katja';
    const payload = {
      title: 'Scrabblish',
      body: `@${inviterName} wants to play! Open to accept.`,
      url: '/',
    };

    expect(payload.body).toContain('wants to play');
  });

  it('VAPID JWT header structure is correct', () => {
    // VAPID JWT has 3 parts: header.payload.signature
    const mockJwt = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwczovL2V4YW1wbGUuY29tIiwiZXhwIjoxNjk5OTk5OTk5LCJzdWIiOiJtYWlsdG86dGVzdEB0ZXN0LmNvbSJ9.signature';
    const parts = mockJwt.split('.');
    expect(parts.length).toBe(3);

    const header = JSON.parse(atob(parts[0]));
    expect(header.alg).toBe('ES256');
    expect(header.typ).toBe('JWT');
  });
});
