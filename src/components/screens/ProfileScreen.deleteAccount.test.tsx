import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProfileScreen } from './ProfileScreen';

const mockDeleteAccount = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
  }),
}));

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { username: 'testuser', avatarUrl: null },
    updateProfile: vi.fn(),
  }),
}));

vi.mock('../../hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
    error: null,
    searchUsers: vi.fn(),
    addFriend: vi.fn(),
    removeFriend: vi.fn(),
  }),
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    supported: false,
    enabled: false,
    registerPush: vi.fn(),
    unregisterPush: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCapacitorPush', () => ({
  useCapacitorPush: () => ({
    supported: false,
    enabled: false,
    registerPush: vi.fn(),
    unregisterPush: vi.fn(),
  }),
}));

vi.mock('../../lib/app-context', () => ({
  getAppContext: () => 'web',
}));

function renderProfile() {
  return render(
    <MemoryRouter>
      <ProfileScreen />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProfileScreen — delete account', () => {
  it('renders the Delete Account button', () => {
    renderProfile();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('does not show confirmation dialog initially', () => {
    renderProfile();
    expect(screen.queryByText(/this will permanently delete/i)).not.toBeInTheDocument();
  });

  it('shows confirmation dialog when Delete Account is clicked', () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByText(/this will permanently delete/i)).toBeInTheDocument();
  });

  it('hides confirmation dialog when Cancel is clicked', () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText(/this will permanently delete/i)).not.toBeInTheDocument();
  });

  it('calls deleteAccount when confirmation button is clicked', async () => {
    mockDeleteAccount.mockResolvedValue(true);
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
  });

  it('shows error message when deleteAccount returns false', async () => {
    mockDeleteAccount.mockResolvedValue(false);
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to delete account/i)).toBeInTheDocument()
    );
  });

  it('keeps dialog open when deleteAccount returns false', async () => {
    mockDeleteAccount.mockResolvedValue(false);
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() =>
      expect(screen.getByText(/this will permanently delete/i)).toBeInTheDocument()
    );
  });

  it('disables buttons while deletion is in progress', async () => {
    let resolve!: (v: boolean) => void;
    mockDeleteAccount.mockReturnValue(new Promise<boolean>((r) => { resolve = r; }));
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    resolve(true);
  });
});
