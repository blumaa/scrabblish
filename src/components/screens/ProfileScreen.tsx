import { useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { BackButton } from '../atoms/BackButton';
import { FriendRow } from '../molecules/FriendRow';
import { AVATAR_ICONS } from '../../lib/avatar-icons';
import type { Friend } from '../../hooks/useFriends';
import './ProfileScreen.css';

interface ProfileScreenProps {
  username: string;
  avatarIcon: string | null;
  onUpdateProfile: (updates: { username?: string; avatarUrl?: string }) => Promise<boolean>;
  friends: Friend[];
  onSearchUsers: (query: string) => Promise<Friend[]>;
  onAddFriend: (userId: string) => Promise<boolean>;
  onRemoveFriend: (friendshipId: string) => Promise<boolean>;
  onStartGame: (friendUserId: string) => void;
  onSignOut: () => void;
  onBack: () => void;
  onOpenStats?: () => void;
  error: string | null;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}

export function ProfileScreen({
  username,
  avatarIcon,
  onUpdateProfile,
  friends,
  onSearchUsers,
  onAddFriend,
  onRemoveFriend,
  onStartGame,
  onSignOut,
  onBack,
  onOpenStats,
  error,
  notificationsEnabled,
  onToggleNotifications,
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (editUsername.length < 3) {
      setSaveError('Username must be at least 3 characters');
      return;
    }
    setSaveError(null);
    const success = await onUpdateProfile({ username: editUsername });
    if (success) {
      setEditing(false);
    } else {
      setSaveError('Username may already be taken');
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    const results = await onSearchUsers(searchQuery);
    const friendIds = new Set(friends.map((f) => f.userId));
    setSearchResults(results.filter((r) => !friendIds.has(r.userId)));
    setSearching(false);
  };

  return (
    <div className="profile-container">
      <BackButton onClick={onBack} />

      <Card className="profile-card">
        <Avatar
          name={username}
          icon={avatarIcon}
          size="lg"
          className="profile-avatar-center"
          onClick={() => setShowIconPicker(!showIconPicker)}
        />
        <p className="profile-avatar-hint">Tap to change icon</p>

        {showIconPicker && (
          <div className="profile-icon-grid">
            {AVATAR_ICONS.map((entry) => (
              <button
                key={entry.name}
                className={`profile-icon-btn ${avatarIcon === entry.name ? 'profile-icon-btn--active' : ''}`}
                onClick={async () => {
                  await onUpdateProfile({ avatarUrl: entry.name });
                  setShowIconPicker(false);
                }}
              >
                <entry.component size={24} strokeWidth={2} />
              </button>
            ))}
            <button
              className={`profile-icon-btn ${!avatarIcon ? 'profile-icon-btn--active' : ''}`}
              onClick={async () => {
                await onUpdateProfile({ avatarUrl: '' });
                setShowIconPicker(false);
              }}
            >
              <span className="profile-icon-letter">{username[0]?.toUpperCase() ?? '?'}</span>
            </button>
          </div>
        )}

        {editing ? (
          <div className="profile-edit-form">
            <Input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Username"
              maxLength={20}
              minLength={3}
            />
            {saveError && <p className="profile-error">{saveError}</p>}
            <div className="profile-edit-actions">
              <Button onClick={handleSaveProfile}>Save</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="profile-name">{username}</h2>
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit Username</Button>
          </>
        )}
      </Card>

      {onOpenStats && (
        <Card padding="sm" className="profile-section profile-section--center">
          <Button variant="secondary" onClick={onOpenStats}>View Stats</Button>
        </Card>
      )}

      <Card padding="sm" className="profile-section">
        <h3 className="profile-section-title">Friends ({friends.length})</h3>

        {friends.map((friend) => (
          <FriendRow
            key={friend.id}
            username={friend.username}
            action={
              <>
                <Button size="sm" onClick={() => onStartGame(friend.userId)}>Play</Button>
                <Button size="sm" variant="danger" onClick={() => onRemoveFriend(friend.id)}>×</Button>
              </>
            }
          />
        ))}

        {friends.length === 0 && (
          <p className="profile-empty">No friends yet. Search to add someone!</p>
        )}
      </Card>

      <Card padding="sm" className="profile-section">
        <h3 className="profile-section-title">Add Friend</h3>
        <div className="profile-search">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
            {searching ? '...' : 'Search'}
          </Button>
        </div>

        {error && <p className="profile-error">{error}</p>}

        {searchResults.map((result) => (
          <FriendRow
            key={result.userId}
            username={result.username}
            action={<Button size="sm" onClick={() => onAddFriend(result.userId)}>Add</Button>}
          />
        ))}
      </Card>

      <Card padding="sm" className="profile-section">
        <h3 className="profile-section-title">Settings</h3>
        <div className="profile-setting-row">
          <span className="profile-setting-label">Push Notifications</span>
          <button
            className={`profile-toggle ${notificationsEnabled ? 'profile-toggle--on' : ''}`}
            onClick={onToggleNotifications}
          >
            {notificationsEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </Card>

      <Card padding="sm" className="profile-section profile-section--center">
        <Button variant="ghost" onClick={onSignOut} className="profile-signout">
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
