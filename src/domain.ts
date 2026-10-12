import { hasTopicClassification } from './questionCapabilities';
import type { ActiveSession, Filters, Question, Result, Section } from './types';
import { moduleInfo } from './data/catalog';

export function latestOutcomes(results: Result[]): Record<string, 'correct' | 'wrong' | 'unanswered'> {
  const outcomes: Record<string, 'correct' | 'wrong' | 'unanswered'> = Object.create(null);
  for (const result of [...results].sort((a, b) => a.finishedAt - b.finishedAt)) {
    for (const q of result.questions) outcomes[q.id] = result.answers[q.id] === undefined ? 'unanswered' : result.answers[q.id] === q.correctIndex ? 'correct' : 'wrong';
  }
  return outcomes;
}

export function filterQuestions(questions: Question[], filters: Filters, results: Result[]): Question[] {
  const outcomes = latestOutcomes(results);
  return questions.filter(q => q.exam === filters.exam
    && (filters.moduleId === 'all' || q.moduleId === filters.moduleId)
    && (filters.topic === 'all' || q.topic.id === filters.topic)
    && (filters.subtopic === 'all' || q.subtopic.id === filters.subtopic)
    && (filters.source === 'all' || q.source.kind === filters.source)
    && (!filters.year || filters.year === 'all' || String(q.source.year) === filters.year)
    && (!filters.delivery || filters.delivery === 'all' || (filters.delivery === 'pdf' ? !!q.external : !q.external))
    && (filters.difficulty === 'all' || (q.difficulty ?? 'unrated') === filters.difficulty)
    && (filters.status === 'all'
      || (filters.status === 'new' && outcomes[q.id] === undefined)
      || (filters.status === 'done' && outcomes[q.id] !== undefined)
      || (filters.status === 'wrong' && (outcomes[q.id] === 'wrong' || outcomes[q.id] === 'unanswered'))));
}

export function sampleQuestions(questions: Question[], count: number, random = Math.random): Question[] {
  const pool = [...questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

export function createSession(questions: Question[], sections: Section[], mode: ActiveSession['mode'], now = Date.now()): ActiveSession {
  if (!questions.length || !sections.length || sections.some(s => !s.questionIds.length)) throw new Error('Cannot start an empty session');
  return {
    id: crypto.randomUUID(), mode, exam: questions[0].exam, questions, sections,
    sectionIndex: 0, questionIndex: 0, answers: {}, flags: [],
    startedAt: now, sectionStartedAt: now, sectionElapsed: [], expiredSections: [], phase: 'answering',
  };
}

export function scaledLimit(moduleId: Section['moduleId'], count: number): number {
  const rule = moduleInfo(moduleId);
  return Math.max(1, Math.floor(rule.minutes * 60 * count / rule.questions));
}

export function remainingSeconds(session: ActiveSession, now = Date.now()): number | null {
  const limit = session.sections[session.sectionIndex].limitSeconds;
  return limit === null ? null : Math.max(0, Math.ceil((session.sectionStartedAt + limit * 1000 - now) / 1000));
}

export function isExpired(session: ActiveSession, now = Date.now()): boolean {
  return session.phase === 'answering' && remainingSeconds(session, now) === 0;
}

export function closeSection(session: ActiveSession, now = Date.now()): { active: ActiveSession | null; result: Result | null } {
  if (session.phase !== 'answering') return { active: session, result: null };
  const section = session.sections[session.sectionIndex];
  const duration = Math.max(0, Math.floor((now - session.sectionStartedAt) / 1000));
  const elapsed = section.limitSeconds === null ? duration : Math.min(section.limitSeconds, duration);
  const sectionElapsed = [...session.sectionElapsed];
  sectionElapsed[session.sectionIndex] = elapsed;
  const expiredSections = isExpired(session, now) ? [...session.expiredSections, session.sectionIndex] : session.expiredSections;
  if (session.sectionIndex + 1 < session.sections.length) {
    return { active: { ...session, sectionElapsed, expiredSections, phase: 'between' }, result: null };
  }
  const { phase: _phase, ...rest } = session;
  return { active: null, result: { ...rest, sectionElapsed, expiredSections, finishedAt: now, elapsedSeconds: sectionElapsed.reduce((a, b) => a + b, 0) } };
}

export function startNextSection(session: ActiveSession, now = Date.now()): ActiveSession {
  if (session.phase !== 'between' || session.sectionIndex + 1 >= session.sections.length) return session;
  return { ...session, phase: 'answering', sectionIndex: session.sectionIndex + 1, questionIndex: 0, sectionStartedAt: now };
}

export function summary(result: Result) {
  const correct = result.questions.filter(q => result.answers[q.id] === q.correctIndex).length;
  const unanswered = result.questions.filter(q => result.answers[q.id] === undefined).length;
  const topics = new Map<string, { name: Question['topic']['name']; total: number; correct: number }>();
  for (const q of result.questions) {
    const key = `${q.exam}:${q.topic.id}`;
    const row = topics.get(key) ?? { name: q.topic.name, total: 0, correct: 0 };
    row.total++;
    if (result.answers[q.id] === q.correctIndex) row.correct++;
    topics.set(key, row);
  }
  return { correct, unanswered, wrong: result.questions.length - correct - unanswered, total: result.questions.length, accuracy: Math.round(correct / result.questions.length * 100), topics: [...topics.values()] };
}

export function formatTime(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export interface TopicRecommendation {
  moduleId: Question['moduleId'];
  topicId: string;
  name: Question['topic']['name'];
  total: number;
  missed: number;
  fresh: Question[];
  retry: Question[];
}

// Recommendations describe mistakes in this attempt, never infer topic mastery.
export function topicRecommendations(result: Result, bank: Question[], results: Result[] = [result]): TopicRecommendation[] {
  const outcomes = latestOutcomes(results);
  const groups = new Map<string, TopicRecommendation>();
  for (const q of result.questions) {
    if (!hasTopicClassification(q)) continue;
    const key = `${q.moduleId}:${q.topic.id}`;
    const row = groups.get(key) ?? { moduleId: q.moduleId, topicId: q.topic.id, name: q.topic.name, total: 0, missed: 0, fresh: [], retry: [] };
    row.total++;
    if (result.answers[q.id] !== q.correctIndex) { row.missed++; row.retry.push(q); }
    groups.set(key, row);
  }
  return [...groups.values()].filter(row => row.missed > 0).map(row => ({ ...row,
    fresh: bank.filter(q => q.exam === result.exam && q.moduleId === row.moduleId && q.topic.id === row.topicId && outcomes[q.id] === undefined && !result.questions.some(item => item.id === q.id)),
  })).sort((a, b) => b.missed / b.total - a.missed / a.total || b.missed - a.missed);
}

export function recommendedSet(row: TopicRecommendation, random = Math.random): Question[] {
  const fresh = sampleQuestions(row.fresh, 3, random);
  return [...fresh, ...sampleQuestions(row.retry, 3 - fresh.length, random)];
}

export function notebookQuestions(bank: Question[], results: Result[]): Question[] {
  const snapshots = new Map<string, Question>();
  for (const result of [...results].sort((a, b) => a.finishedAt - b.finishedAt)) {
    for (const q of result.questions) snapshots.set(q.id, q);
  }
  for (const q of bank) snapshots.set(q.id, q);
  const outcomes = latestOutcomes(results);
  return [...snapshots.values()].filter(q => outcomes[q.id] === 'wrong' || outcomes[q.id] === 'unanswered');
}
