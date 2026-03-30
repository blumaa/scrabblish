import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

export function Spinner({ size = 'md', block }: SpinnerProps) {
  const el = <span className={`spinner spinner--${size}`} />;
  if (block) return <div className="spinner-block">{el}</div>;
  return el;
}
