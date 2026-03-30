import { useState, useEffect, useCallback } from 'react';
import type { Language } from '../types/game';
import { loadDictionaries, isValidInAny, getWordLanguages, type DictionaryMap } from '../lib/dictionary';

interface DictionaryState {
  dicts: DictionaryMap | null;
  loading: boolean;
  error: string | null;
  progress: string | null;
}

export function useDictionary(languages: Language[]) {
  const [state, setState] = useState<DictionaryState>({
    dicts: null,
    loading: false,
    error: null,
    progress: null,
  });

  useEffect(() => {
    if (languages.length === 0) return;

    let cancelled = false;

    async function load() {
      setState({ dicts: null, loading: true, error: null, progress: 'Loading dictionaries...' });

      try {
        const dicts = await loadDictionaries(languages);
        if (!cancelled) {
          setState({ dicts, loading: false, error: null, progress: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            dicts: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load dictionaries',
            progress: null,
          });
        }
      }
    }

    load();

    return () => { cancelled = true; };
    // Stringify languages to avoid re-loading on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(languages)]);

  const checkWord = useCallback((word: string): boolean => {
    if (!state.dicts) return false;
    return isValidInAny(state.dicts, word);
  }, [state.dicts]);

  const getLanguages = useCallback((word: string): Language[] => {
    if (!state.dicts) return [];
    return getWordLanguages(state.dicts, word);
  }, [state.dicts]);

  return {
    loaded: state.dicts !== null,
    loading: state.loading,
    error: state.error,
    progress: state.progress,
    checkWord,
    getLanguages,
    dicts: state.dicts,
  };
}
