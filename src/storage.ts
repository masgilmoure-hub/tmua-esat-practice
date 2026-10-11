import type { Question, SavedState } from './types';

export const STORAGE_KEY = 'tmua-esat-practice:v1';
export const emptyState = (): SavedState => ({ version: 1, language: 'zh', active: null, results: [] });
const obj = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integer = (value: unknown): value is number => finite(value) && Number.isInteger(value);
const bilingual = (value: unknown): boolean => obj(value) && typeof value.zh === 'string' && typeof value.en === 'string';
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(s => typeof s === 'string');
const modules = ['p1', 'p2', 'm1', 'm2', 'biology', 'chemistry', 'physics'];

export function validQuestion(value: unknown): value is Question {
  if (!obj(value) || typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value.id)
    || !['TMUA', 'ESAT'].includes(String(value.exam)) || !modules.includes(String(value.moduleId))
    || ((['p1', 'p2'].includes(String(value.moduleId))) !== (value.exam === 'TMUA'))
    || typeof value.prompt !== 'string' || !value.prompt.trim()
    || !strings(value.options) || value.options.length < 2 || value.options.length > 10 || value.options.some(s => !s.trim())
    || !integer(value.correctIndex) || value.correctIndex >= value.options.length) return false;
  for (const key of ['topic', 'subtopic']) {
    const item = value[key];
    if (!obj(item) || typeof item.id !== 'string' || !bilingual(item.name)) return false;
  }
  if (!obj(value.explanation)) return false;
  for (const lang of ['zh', 'en']) {
    const e = value.explanation[lang];
    if (!obj(e) || !strings(e.steps) || !e.steps.length || typeof e.pitfall !== 'string') return false;
  }
  const s = value.source;
  if (!obj(s) || !['original-demo', 'official-public'].includes(String(s.kind)) || !bilingual(s.title)
    || typeof s.originalNumber !== 'string' || !s.originalNumber.trim() || typeof s.rightsNote !== 'string'
    || !(s.year === null || integer(s.year)) || !(s.url === null || (typeof s.url === 'string' && /^https?:\/\//.test(s.url)))
    || (s.kind === 'official-public' && s.url === null)) return false;
  return true;
}

function validSession(value: unknown, completed: boolean): boolean {
  if (!obj(value) || typeof value.id !== 'string' || !['practice', 'mock'].includes(String(value.mode))
    || !['TMUA', 'ESAT'].includes(String(value.exam)) || !Array.isArray(value.questions)
    || !value.questions.length || value.questions.length > 1000 || !value.questions.every(validQuestion)
    || !Array.isArray(value.sections) || !value.sections.length || value.sections.length > 10
    || !integer(value.sectionIndex) || value.sectionIndex >= value.sections.length || !integer(value.questionIndex)
    || !obj(value.answers) || !strings(value.flags)
    || !finite(value.startedAt) || !finite(value.sectionStartedAt)
    || !Array.isArray(value.sectionElapsed) || !value.sectionElapsed.every(finite)
    || !Array.isArray(value.expiredSections) || !value.expiredSections.every(i => integer(i) && i < (value.sections as unknown[]).length)) return false;
  const questions = value.questions as Question[];
  if (questions.some(q => q.exam !== value.exam)) return false;
  const map = new Map(questions.map(q => [q.id, q]));
  if (map.size !== questions.length) return false;
  const ids: string[] = [];
  for (const section of value.sections) {
    if (!obj(section) || !modules.includes(String(section.moduleId)) || !strings(section.questionIds)
      || !section.questionIds.length || !(section.limitSeconds === null || (integer(section.limitSeconds) && section.limitSeconds > 0))) return false;
    if (section.questionIds.some(id => !map.has(id))) return false;
    // A practice set can intentionally mix modules. A mock section cannot.
    if (value.mode === 'mock' && section.questionIds.some(id => map.get(id)?.moduleId !== section.moduleId)) return false;
    ids.push(...section.questionIds);
  }
  if (new Set(ids).size !== questions.length || ids.length !== questions.length
    || value.questionIndex >= (value.sections[value.sectionIndex] as { questionIds: string[] }).questionIds.length
    || value.flags.some(id => !map.has(id))) return false;
  if (Object.entries(value.answers).some(([id, answer]) => !map.has(id) || !integer(answer) || answer >= map.get(id)!.options.length)) return false;
  if (completed) return finite(value.finishedAt) && finite(value.elapsedSeconds) && value.sectionElapsed.length === value.sections.length;
  return ['answering', 'between'].includes(String(value.phase))
    && (value.phase !== 'between' || value.sectionIndex + 1 < value.sections.length);
}

export type StorageIssue = 'invalid' | 'unsupported' | 'unavailable' | null;
export function loadState(storage: Pick<Storage, 'getItem'>): { state: SavedState; issue: StorageIssue; writable: boolean } {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return { state: emptyState(), issue: 'unavailable', writable: false }; }
  try {
    if (raw === null) return { state: emptyState(), issue: null, writable: true };
    const parsed: unknown = JSON.parse(raw);
    if (obj(parsed) && parsed.version !== 1) return { state: emptyState(), issue: 'unsupported', writable: false };
    if (!obj(parsed) || parsed.version !== 1 || !['zh', 'en'].includes(String(parsed.language))
      || !(parsed.active === null || validSession(parsed.active, false))
      || !Array.isArray(parsed.results) || parsed.results.length > 200 || !parsed.results.every(r => validSession(r, true))) {
      return { state: emptyState(), issue: 'invalid', writable: false };
    }
    return { state: parsed as unknown as SavedState, issue: null, writable: true };
  } catch {
    // Do not overwrite unreadable records. A user can explicitly clear them.
    return { state: emptyState(), issue: 'invalid', writable: false };
  }
}
