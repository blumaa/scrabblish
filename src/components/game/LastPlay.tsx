import './LastPlay.css';

interface LastPlayProps {
  playerName: string;
  words: string[];
  score: number;
}

export function LastPlay({ playerName, words, score }: LastPlayProps) {
  return (
    <div className="last-play">
      <span className="last-play-name">{playerName}</span>
      {' played '}
      <span className="last-play-word">{words.join(', ')}</span>
      {' for '}
      <span className="last-play-score">{score}</span>
      {' pts'}
    </div>
  );
}
