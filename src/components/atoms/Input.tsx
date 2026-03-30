import type { InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = '', error, ...props }: InputProps) {
  return (
    <input
      className={`input ${error ? 'input--error' : ''} ${className}`.trim()}
      {...props}
    />
  );
}
