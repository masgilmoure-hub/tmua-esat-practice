import type { ActiveSession, Filters, Question, Result, Section } from './types';
import { moduleInfo } from './data/catalog';

export function latestOutcomes(results: Result[]): Record<string, 'correct' | 'wrong' | 'unanswered'> {
  const outcomes: Record<string, 'correct' | 'wrong' | 'unanswered'> = {};
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
