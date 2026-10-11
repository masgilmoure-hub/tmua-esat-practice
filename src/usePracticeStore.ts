import { useEffect, useState } from 'react';
import { emptyState, loadState, STORAGE_KEY, type StorageIssue } from './storage';
import type { SavedState } from './types';

export function usePracticeStore() {
  const [initial] = useState(() => {
    try { return loadState(window.localStorage); }
    catch { return { state: emptyState(), issue: 'unavailable' as StorageIssue, writable: false }; }
  });
  const [state, setState] = useState<SavedState>(initial.state);
  const [issue, setIssue] = useState<StorageIssue>(initial.issue);
  const [writable, setWritable] = useState(initial.writable);
  useEffect(() => {
    if (!writable) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setIssue(null); }
    catch { setIssue('unavailable'); }
  }, [state, writable]);
  function clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setWritable(true);
      setIssue(null);
    } catch { setWritable(false); setIssue('unavailable'); }
    setState(s => ({ ...emptyState(), language: s.language }));
  }
  return { state, setState, issue, clear };
}
