import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { MODULES } from '../src/data/catalog';
import { closeSection, createSession, filterQuestions, latestOutcomes, remainingSeconds, sampleQuestions, scaledLimit, startNextSection, summary } from '../src/domain';
import { emptyState, loadState, STORAGE_KEY, validQuestion } from '../src/storage';
import type { Filters, Result } from '../src/types';

const filters: Filters = { exam: 'TMUA', moduleId: 'all', topic: 'all', subtopic: 'all', source: 'all', status: 'all' };
const q = QUESTIONS[0];
function attempt(answer: number | undefined, now: number): Result {
  const active = createSession([q], [{ moduleId: q.moduleId, questionIds: [q.id], limitSeconds: null }], 'practice', now);
  return closeSection({ ...active, answers: answer === undefined ? {} : { [q.id]: answer } }, now + 5000).result!;
}

describe('original demo bank', () => {
  it('has unique provenance, English questions, valid options and aligned bilingual explanations', () => {
    expect(QUESTIONS).toHaveLength(21);
    expect(new Set(QUESTIONS.map(q => q.id)).size).toBe(21);
    for (const q of QUESTIONS) {
      expect(validQuestion(q)).toBe(true);
      expect(q.source.kind).toBe('original-demo');
      expect(q.source.originalNumber).toMatch(/^DEMO-/);
      expect(q.explanation.zh.steps.length).toBe(q.explanation.en.steps.length);
    }
    for (const m of MODULES) expect(QUESTIONS.filter(q => q.moduleId === m.id)).toHaveLength(3);
  });
  it('filters exam, paper, topic, subtopic, source and latest attempt status together', () => {
    const result = attempt(0, 1000);
    expect(filterQuestions(QUESTIONS, { ...filters, moduleId: 'p1', topic: 'algebra', subtopic: 'quadratics', source: 'original-demo', status: 'wrong' }, [result])).toEqual([q]);
    expect(filterQuestions(QUESTIONS, { ...filters, status: 'done' }, [result])).toEqual([q]);
    expect(filterQuestions(QUESTIONS, { ...filters, status: 'new' }, [result])).toHaveLength(5);
    expect(filterQuestions(QUESTIONS, { ...filters, source: 'official-public' }, [])).toEqual([]);
  });
  it('samples without duplicates and never fabricates missing questions', () => {
    const sample = sampleQuestions(QUESTIONS, 5, () => 0.4);
    expect(sample).toHaveLength(5);
    expect(new Set(sample.map(q => q.id)).size).toBe(5);
    expect(sampleQuestions([q], 20)).toEqual([q]);
  });
});

describe('timing and results', () => {
  it('matches official structure and scales shortened demo duration', () => {
    expect(MODULES.filter(m => m.exam === 'TMUA').map(m => [m.questions, m.minutes])).toEqual([[20, 75], [20, 75]]);
    expect(MODULES.filter(m => m.exam === 'ESAT').every(m => m.questions === 27 && m.minutes === 40)).toBe(true);
    expect(scaledLimit('p1', 3)).toBe(675);
    expect(scaledLimit('m1', 3)).toBe(266);
  });
  it('uses an absolute deadline and caps time when resumed after expiry', () => {
    const active = createSession([q], [{ moduleId: 'p1', questionIds: [q.id], limitSeconds: 60 }], 'practice', 1000);
    expect(remainingSeconds(active, 21_000)).toBe(40);
    const ended = closeSection(active, 999_999).result!;
    expect(ended.elapsedSeconds).toBe(60);
    expect(ended.expiredSections).toEqual([0]);
    expect(summary(ended)).toMatchObject({ total: 1, correct: 0, unanswered: 1, accuracy: 0 });
  });
  it('does not carry remaining time to the next module and excludes transition time', () => {
    const other = QUESTIONS.find(q => q.moduleId === 'p2')!;
    const active = createSession([q, other], [{ moduleId: 'p1', questionIds: [q.id], limitSeconds: 100 }, { moduleId: 'p2', questionIds: [other.id], limitSeconds: 100 }], 'mock', 0);
    const between = closeSection(active, 10_000).active!;
    expect(between.phase).toBe('between');
    expect(closeSection(between, 90_000).active).toBe(between);
    const next = startNextSection(between, 90_000);
    expect(remainingSeconds(next, 90_000)).toBe(100);
    expect(next.questionIndex).toBe(0);
    const result = closeSection(next, 110_000).result!;
    expect(result.sectionElapsed).toEqual([10, 20]);
    expect(result.elapsedSeconds).toBe(30);
  });
  it('updates the mistake notebook using the latest submission, including unanswered questions', () => {
    const wrong = attempt(0, 1000), right = attempt(q.correctIndex, 2000), unanswered = attempt(undefined, 3000);
    expect(latestOutcomes([right, wrong])[q.id]).toBe('correct');
    expect(filterQuestions(QUESTIONS, { ...filters, status: 'wrong' }, [wrong, right])).toEqual([]);
    expect(latestOutcomes([wrong, right, unanswered])[q.id]).toBe('unanswered');
  });
  it('counts accuracy over all questions and reports per-topic performance', () => {
    const questions = QUESTIONS.slice(0, 3);
    const active = createSession(questions, [{ moduleId: 'p1', questionIds: questions.map(q => q.id), limitSeconds: null }], 'practice', 0);
    const ended = closeSection({ ...active, answers: { [questions[0].id]: 2, [questions[1].id]: 0 } }, 30_000).result!;
    const stats = summary(ended);
    expect(stats).toMatchObject({ correct: 1, wrong: 1, unanswered: 1, accuracy: 33 });
    expect(stats.topics.map(t => [t.correct, t.total])).toEqual([[1, 1], [0, 1], [0, 1]]);
  });
});

describe('local records validation', () => {
  const storage = (raw: string | null) => ({ getItem: (key: string) => { expect(key).toBe(STORAGE_KEY); return raw; } });
  it('round-trips completed records and active snapshots', () => {
    const result = attempt(q.correctIndex, 1000);
    const state = { ...emptyState(), results: [result] };
    expect(loadState(storage(JSON.stringify(state)))).toEqual({ state, issue: null, writable: true });
  });
  it('preserves malformed or future-version data without silently overwriting it', () => {
    expect(loadState(storage('{broken')).writable).toBe(false);
    expect(loadState(storage(JSON.stringify({ version: 2 }))).issue).toBe('unsupported');
    const active = createSession([q], [{ moduleId: 'p1', questionIds: [q.id], limitSeconds: 60 }], 'practice');
    expect(loadState(storage(JSON.stringify({ ...emptyState(), active: { ...active, questionIndex: 99 } }))).issue).toBe('invalid');
  });
  it('rejects records with impossible answers, unknown question IDs or dangerous source URLs', () => {
    const r = attempt(q.correctIndex, 1000);
    expect(loadState(storage(JSON.stringify({ ...emptyState(), results: [{ ...r, answers: { [q.id]: 999 } }] }))).writable).toBe(false);
    expect(validQuestion({ ...q, source: { ...q.source, url: 'javascript:alert(1)' } })).toBe(false);
    expect(validQuestion({ ...q, source: { ...q.source, kind: 'official-public', url: null } })).toBe(false);
  });
  it('reports blocked storage as unavailable instead of overwriting or crashing', () => {
    const result = loadState({ getItem: () => { throw new DOMException('Blocked', 'SecurityError'); } });
    expect(result).toMatchObject({ issue: 'unavailable', writable: false });
  });
});
