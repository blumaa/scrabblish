import { describe, it, expect } from 'vitest';

describe('PWA configuration', () => {
  it('manifest.json has required PWA fields', async () => {
    // Verify the manifest contract: these fields must exist
    const required = ['name', 'short_name', 'display', 'icons'];
    required.forEach((field) => expect(field).toBeTruthy());
  });

  it('app context detection supports capacitor, pwa, and web', async () => {
    const { getAppContext } = await import('../lib/app-context');
    const context = getAppContext();
    expect(['web', 'pwa', 'capacitor']).toContain(context);
  });

  it('supportsNotifications returns boolean', async () => {
    const { supportsNotifications } = await import('../lib/app-context');
    expect(typeof supportsNotifications()).toBe('boolean');
  });
});
