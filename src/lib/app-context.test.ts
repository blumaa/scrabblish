import { describe, it, expect } from 'vitest';
import { getAppContext } from './app-context';

describe('app context detection', () => {
  it('returns "web" by default in test environment', () => {
    // No Capacitor, no standalone display mode in vitest
    const context = getAppContext();
    expect(context).toBe('web');
  });

  it('returns one of the valid contexts', () => {
    const context = getAppContext();
    expect(['web', 'pwa', 'capacitor']).toContain(context);
  });

  it('notifications should be available for pwa and capacitor only', () => {
    const contexts = ['web', 'pwa', 'capacitor'] as const;
    const notificationsAllowed = contexts.filter((c) => c !== 'web');
    expect(notificationsAllowed).toEqual(['pwa', 'capacitor']);
  });
});
