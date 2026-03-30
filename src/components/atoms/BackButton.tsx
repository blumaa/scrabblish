import './BackButton.css';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <button className="back-btn" onClick={onClick}>
      &larr; {label}
    </button>
  );
}
