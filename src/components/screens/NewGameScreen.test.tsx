import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NewGameScreen } from './NewGameScreen';

const mockNavigate = vi.fn();
const mockCreateGame = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ friendId: 'friend-1' }),
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../hooks/useGameManager', () => ({
  useGameManager: () => ({ createGame: mockCreateGame }),
}));

vi.mock('../../hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [{ userId: 'friend-1', username: 'buddy' }],
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NewGameScreen — navigation after creation', () => {
  it('navigates to the game screen after creating a game', async () => {
    mockCreateGame.mockResolvedValue({ id: 'game-123', joinCode: 'ABCD' });

    render(
      <MemoryRouter>
        <NewGameScreen />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Start Game'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game/game-123');
    });
  });

  it('does not navigate when game creation fails', async () => {
    mockCreateGame.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <NewGameScreen />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Start Game'));

    await waitFor(() => {
      expect(mockCreateGame).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
