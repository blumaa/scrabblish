import { describe, it, expect } from 'vitest';
import { AVATAR_ICONS, getAvatarIcon, isValidAvatarIcon } from './avatar-icons';

describe('avatar icons', () => {
  it('has a curated set of at least 20 icons', () => {
    expect(AVATAR_ICONS.length).toBeGreaterThanOrEqual(20);
  });

  it('each icon has a name and component', () => {
    for (const icon of AVATAR_ICONS) {
      expect(icon.name).toBeTruthy();
      expect(typeof icon.name).toBe('string');
      expect(icon.component).toBeTruthy();
    }
  });

  it('all icon names are unique', () => {
    const names = AVATAR_ICONS.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('getAvatarIcon returns correct icon by name', () => {
    const first = AVATAR_ICONS[0];
    const result = getAvatarIcon(first.name);
    expect(result).toBe(first.component);
  });

  it('getAvatarIcon returns null for unknown name', () => {
    expect(getAvatarIcon('nonexistent-icon-xyz')).toBeNull();
  });

  it('isValidAvatarIcon returns true for valid name', () => {
    expect(isValidAvatarIcon(AVATAR_ICONS[0].name)).toBe(true);
  });

  it('isValidAvatarIcon returns false for invalid name', () => {
    expect(isValidAvatarIcon('fake-icon')).toBe(false);
  });
});
