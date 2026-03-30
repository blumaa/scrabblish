import { Avatar } from '../atoms/Avatar';
import './FriendRow.css';

interface FriendRowProps {
  username: string;
  action?: React.ReactNode;
}

export function FriendRow({ username, action }: FriendRowProps) {
  return (
    <div className="friend-row">
      <Avatar name={username} size="md" />
      <div className="friend-row__info">
        <span className="friend-row__name">@{username}</span>
      </div>
      {action && <div className="friend-row__actions">{action}</div>}
    </div>
  );
}
