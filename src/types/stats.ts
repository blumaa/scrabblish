import type { Language } from './game';

export interface PlayerStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
  bestWordScore: number;
  bestWord: string | null;
  longestWord: string | null;
  currentWinStreak: number;
  bestWinStreak: number;
}

export interface LanguageStat {
  language: Language;
  wordsPlayed: number;
}

export interface GameHistoryItem {
  id: string;
  languages: Language[];
  myScore: number;
  opponentScore: number;
  opponentName: string;
  winnerId: string | null;
  finishedAt: string;
}
