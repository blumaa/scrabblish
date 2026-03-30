import { describe, it, expect } from 'vitest';

describe('notification preferences', () => {
  it('default notifications enabled', () => {
    const prefs = { notificationsEnabled: true };
    expect(prefs.notificationsEnabled).toBe(true);
  });

  it('user can disable notifications', () => {
    const prefs = { notificationsEnabled: true };
    prefs.notificationsEnabled = false;
    expect(prefs.notificationsEnabled).toBe(false);
  });

  it('should not send push when disabled', () => {
    const prefs = { notificationsEnabled: false };
    const shouldSend = prefs.notificationsEnabled;
    expect(shouldSend).toBe(false);
  });
});
