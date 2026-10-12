import { useMemo, useState } from 'react';
import { QUESTIONS } from './data/questions';
import { PAST_PAPERS, linkedQuestions } from './data/pastPapers';
import { BANK_STORAGE_KEY, loadImportedBank, MAX_BANK_BYTES, MAX_IMPORTED_QUESTIONS, validateQuestionBank } from './questionBank';
import type { Question } from './types';
import type { StorageIssue } from './storage';
const BUILT_IN = [...QUESTIONS, ...PAST_PAPERS.flatMap(linkedQuestions)];

export function useQuestionBank() {
  const [initial] = useState(() => {
    try { return loadImportedBank(window.localStorage, BUILT_IN); }
    catch { return { questions: [], issue: 'unavailable' as StorageIssue, writable: false }; }
  });
  const [imported, setImported] = useState<Question[]>(initial.questions);
  const [issue, setIssue] = useState<StorageIssue>(initial.issue);
  const [writable, setWritable] = useState(initial.writable);
  const questions = useMemo(() => [...BUILT_IN, ...imported], [imported]);

  function add(incoming: Question[]): 'saved' | 'invalid' | 'full' | 'blocked' | 'unavailable' {
    if (!writable) return 'blocked';
    if (imported.length + incoming.length > MAX_IMPORTED_QUESTIONS) return 'full';
    if (!validateQuestionBank({ schemaVersion: 1, questions: incoming }, questions).ok) return 'invalid';
    const next = [...imported, ...incoming];
    const encoded = JSON.stringify({ schemaVersion: 1, questions: next });
    if (new TextEncoder().encode(encoded).length > MAX_BANK_BYTES) return 'full';
    // Persist first: a quota failure must not appear as a successful import.
    try { window.localStorage.setItem(BANK_STORAGE_KEY, encoded); }
    catch { setIssue('unavailable'); return 'unavailable'; }
    setImported(next); setIssue(null);
    return 'saved';
  }
  function clear(): boolean {
    try { window.localStorage.removeItem(BANK_STORAGE_KEY); }
    catch { setIssue('unavailable'); return false; }
    setImported([]); setIssue(null); setWritable(true);
    return true;
  }
  return { questions, imported, issue, add, clear };
}
