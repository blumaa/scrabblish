import type { HTMLAttributes } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div className={`card card--pad-${padding} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
