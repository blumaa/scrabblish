import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { ConfirmDialog } from '../atoms/ConfirmDialog';
import { Input } from '../atoms/Input';
import { BackButton } from '../atoms/BackButton';
import { FriendRow } from '../molecules/FriendRow';
import { AVATAR_ICONS } from '../../lib/avatar-icons';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useFriends } from '../../hooks/useFriends';
import { useNotifications } from '../../hooks/useNotifications';
import { useCapacitorPush } from '../../hooks/useCapacitorPush';
import { getAppContext } from '../../lib/app-context';
import type { Friend } from '../../hooks/useFriends';
import './ProfileScreen.css';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id ?? null);
  const { friends, error, searchUsers, addFriend, removeFriend } = useFriends(user?.id ?? null);
  const webPush = useNotifications(user?.id ?? null);
  const capPush = useCapacitorPush(user?.id ?? null);
  const push = getAppContext() === 'capacitor' ? capPush : webPush;
  const { supported: notificationsSupported, enabled: notificationsEnabled, registerPush, unregisterPush } = push;

  const username = profile?.username ?? '';
  const avatarIcon = profile?.avatarUrl ?? null;

  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSaveProfile = async () => {
    if (editUsername.length < 3) {
      setSaveError('Username must be at least 3 characters');
      return;
    }
    setSaveError(null);
    const success = await updateProfile({ username: editUsername });
    if (success) setEditing(false);
    else setSaveError('Username may already be taken');
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    const results = await searchUsers(searchQuery);
    const friendIds = new Set(friends.map((f) => f.userId));
    setSearchResults(results.filter((r) => !friendIds.has(r.userId)));
    setSearching(false);
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) await unregisterPush();
    else await registerPush();
  };

  return (
    <div className="profile-container">
      <BackButton onClick={() => navigate('/')} />

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
                  await updateProfile({ avatarUrl: entry.name });
                  setShowIconPicker(false);
                }}
              >
                <entry.component size={24} strokeWidth={2} />
              </button>
            ))}
            <button
              className={`profile-icon-btn ${!avatarIcon ? 'profile-icon-btn--active' : ''}`}
              onClick={async () => {
                await updateProfile({ avatarUrl: '' });
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

      <Card padding="sm" className="profile-section profile-section--center">
        <Link to="/stats"><Button variant="secondary">View Stats</Button></Link>
      </Card>

      <Card padding="sm" className="profile-section">
        <h3 className="profile-section-title">Friends ({friends.length})</h3>
        {friends.map((friend) => (
          <FriendRow
            key={friend.id}
            username={friend.username}
            avatarIcon={friend.avatarUrl}
            action={
              <>
                <Button size="sm" onClick={() => navigate(`/game/new/${friend.userId}`)}>Play</Button>
                <Button size="sm" variant="danger" onClick={() => removeFriend(friend.id)}>×</Button>
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
            action={<Button size="sm" onClick={() => addFriend(result.userId)}>Add</Button>}
          />
        ))}
      </Card>

      {notificationsSupported && (
        <Card padding="sm" className="profile-section">
          <h3 className="profile-section-title">Settings</h3>
          <div className="profile-setting-row">
            <span className="profile-setting-label">Push Notifications</span>
            <button
              className={`profile-toggle ${notificationsEnabled ? 'profile-toggle--on' : ''}`}
              onClick={handleToggleNotifications}
            >
              {notificationsEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </Card>
      )}

      <Card padding="sm" className="profile-section profile-section--center">
        <Button variant="ghost" onClick={signOut} className="profile-signout">
          Sign Out
        </Button>
      </Card>

      <Card padding="sm" className="profile-section profile-section--center">
        <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="profile-delete-btn">
          Delete Account
        </Button>
      </Card>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Account?"
          body="This will permanently delete your account, profile, and all associated data. This cannot be undone."
          confirmLabel="Yes, Delete My Account"
          error={deleteError}
          loading={deleting}
          onConfirm={async () => {
            setDeleting(true);
            setDeleteError(null);
            const ok = await deleteAccount();
            if (!ok) {
              setDeleteError('Failed to delete account. Please try again.');
              setDeleting(false);
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
