import { createElement } from 'react';
import { getAvatarIcon } from '../../lib/avatar-icons';
import './Avatar.css';

interface AvatarProps {
  name: string;
  icon?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const ICON_SIZES = { sm: 18, md: 20, lg: 36 } as const;

export function Avatar({ name, icon, size = 'md', className = '', onClick }: AvatarProps) {
  const Tag = onClick ? 'button' : 'div';
  const resolvedIcon = icon ? getAvatarIcon(icon) : null;

  return (
    <Tag
      className={`avatar avatar--${size} ${className}`.trim()}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {resolvedIcon
        ? createElement(resolvedIcon, { size: ICON_SIZES[size], strokeWidth: 2 })
        : name[0]?.toUpperCase() ?? '?'
      }
    </Tag>
  );
}
