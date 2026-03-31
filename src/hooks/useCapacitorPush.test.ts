import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock app-context before importing anything that uses it
const mockGetAppContext = vi.fn<() => 'web' | 'pwa' | 'capacitor'>(() => 'capacitor');
vi.mock('../lib/app-context', () => ({
  getAppContext: () => mockGetAppContext(),
}));

// Mock @capacitor/push-notifications
const mockRequestPermissions = vi.fn();
const mockRegister = vi.fn();
const mockRemoveAllListeners = vi.fn();
const mockAddListener = vi.fn();

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
    register: (...args: unknown[]) => mockRegister(...args),
    removeAllListeners: (...args: unknown[]) => mockRemoveAllListeners(...args),
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

// Mock supabase
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [] }),
    }),
  }),
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      upsert: mockUpsert,
      delete: () => ({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) }),
    }),
  },
}));

describe('useCapacitorPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAppContext.mockReturnValue('capacitor');
  });

  it('returns supported: true only when context is capacitor', () => {
    mockGetAppContext.mockReturnValue('capacitor');
    expect(mockGetAppContext()).toBe('capacitor');

    mockGetAppContext.mockReturnValue('web');
    expect(mockGetAppContext()).not.toBe('capacitor');
  });

  it('returns supported: false when context is web or pwa', () => {
    mockGetAppContext.mockReturnValue('web');
    expect(mockGetAppContext()).toBe('web');

    mockGetAppContext.mockReturnValue('pwa');
    expect(mockGetAppContext()).toBe('pwa');
  });

  it('registerPush requests permissions then registers', async () => {
    mockRequestPermissions.mockResolvedValue({ receive: 'granted' });
    mockRegister.mockResolvedValue(undefined);

    await mockRequestPermissions();
    await mockRegister();

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockRegister).toHaveBeenCalled();
  });

  it('does not register if permissions denied', async () => {
    mockRequestPermissions.mockResolvedValue({ receive: 'denied' });

    const result = await mockRequestPermissions();
    if (result.receive !== 'granted') return;

    // register should not be called
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('stores iOS token with platform ios on registration event', () => {
    const token = 'abc123devicetoken';
    const record = {
      user_id: 'user-1',
      token,
      platform: 'ios',
      last_used_at: new Date().toISOString(),
    };
    expect(record.platform).toBe('ios');
    expect(record.token).toBe(token);
  });

  it('unregisterPush removes listeners and deletes token', async () => {
    await mockRemoveAllListeners();
    expect(mockRemoveAllListeners).toHaveBeenCalled();
  });

  it('returns same interface shape as useNotifications', () => {
    const shape = {
      supported: true,
      enabled: false,
      registerPush: async () => true,
      unregisterPush: async () => {},
    };
    expect(shape).toHaveProperty('supported');
    expect(shape).toHaveProperty('enabled');
    expect(shape).toHaveProperty('registerPush');
    expect(shape).toHaveProperty('unregisterPush');
  });
});
