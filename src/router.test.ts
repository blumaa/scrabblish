import { describe, it, expect } from 'vitest';
import { ROUTE_PATHS } from './routes';

describe('route configuration', () => {
  it('defines all required paths', () => {
    expect(ROUTE_PATHS.HOME).toBe('/');
    expect(ROUTE_PATHS.LOGIN).toBe('/login');
    expect(ROUTE_PATHS.PROFILE).toBe('/profile');
    expect(ROUTE_PATHS.STATS).toBe('/stats');
    expect(ROUTE_PATHS.NEW_GAME).toBe('/game/new/:friendId');
    expect(ROUTE_PATHS.GAME).toBe('/game/:id');
  });

  it('has 6 routes total', () => {
    const paths = Object.values(ROUTE_PATHS);
    expect(paths.length).toBe(6);
  });

  it('all paths start with /', () => {
    for (const path of Object.values(ROUTE_PATHS)) {
      expect(path.startsWith('/')).toBe(true);
    }
  });

  it('game path includes :id param', () => {
    expect(ROUTE_PATHS.GAME).toContain(':id');
  });

  it('new game path includes :friendId param', () => {
    expect(ROUTE_PATHS.NEW_GAME).toContain(':friendId');
  });
});
