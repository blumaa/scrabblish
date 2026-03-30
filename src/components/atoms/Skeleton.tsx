import './Skeleton.css';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'board';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = 'text', width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton skeleton--${variant}`}
      style={{ width, height }}
    />
  );
}
