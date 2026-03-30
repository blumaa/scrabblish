import type { LucideIcon } from 'lucide-react';
import {
  Bird, Bug, Cat, Dog, Fish, Rabbit, Snail, Squirrel, Turtle,
  Cherry, Citrus, Flower2, Leaf, TreePine,
  Crown, Flame, Ghost, Heart, Moon, Star, Sun, Zap,
  Anchor, Compass, Gem, Rocket, Skull, Swords, Target, Trophy,
} from 'lucide-react';

export interface AvatarIconEntry {
  name: string;
  component: LucideIcon;
}

export const AVATAR_ICONS: AvatarIconEntry[] = [
  // Animals
  { name: 'bird', component: Bird },
  { name: 'bug', component: Bug },
  { name: 'cat', component: Cat },
  { name: 'dog', component: Dog },
  { name: 'fish', component: Fish },
  { name: 'rabbit', component: Rabbit },
  { name: 'snail', component: Snail },
  { name: 'squirrel', component: Squirrel },
  { name: 'turtle', component: Turtle },
  // Nature
  { name: 'cherry', component: Cherry },
  { name: 'citrus', component: Citrus },
  { name: 'flower', component: Flower2 },
  { name: 'leaf', component: Leaf },
  { name: 'tree', component: TreePine },
  // Fun
  { name: 'crown', component: Crown },
  { name: 'flame', component: Flame },
  { name: 'ghost', component: Ghost },
  { name: 'heart', component: Heart },
  { name: 'moon', component: Moon },
  { name: 'star', component: Star },
  { name: 'sun', component: Sun },
  { name: 'zap', component: Zap },
  // Adventure
  { name: 'anchor', component: Anchor },
  { name: 'compass', component: Compass },
  { name: 'gem', component: Gem },
  { name: 'rocket', component: Rocket },
  { name: 'skull', component: Skull },
  { name: 'swords', component: Swords },
  { name: 'target', component: Target },
  { name: 'trophy', component: Trophy },
];

const iconMap = new Map(AVATAR_ICONS.map((i) => [i.name, i.component]));

export function getAvatarIcon(name: string): LucideIcon | null {
  return iconMap.get(name) ?? null;
}

export function isValidAvatarIcon(name: string): boolean {
  return iconMap.has(name);
}
