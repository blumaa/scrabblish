export type AppContext = 'web' | 'pwa' | 'capacitor';

export function getAppContext(): AppContext {
  // Capacitor injects window.Capacitor
  if (typeof window !== 'undefined' && 'Capacitor' in window) {
    return 'capacitor';
  }

  // PWA installed to home screen (standalone mode)
  if (typeof window !== 'undefined') {
    const matchMedia = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
    const isStandalone =
      matchMedia ||
      ('standalone' in navigator && (navigator as Record<string, unknown>).standalone === true);
    if (isStandalone) return 'pwa';
  }

  return 'web';
}

export function supportsNotifications(): boolean {
  const context = getAppContext();
  return context === 'pwa' || context === 'capacitor';
}
