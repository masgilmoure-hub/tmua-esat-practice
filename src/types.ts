export type Language = 'zh' | 'en';
export type Bilingual = { zh: string; en: string };
export type Exam = 'TMUA' | 'ESAT';
export type ModuleId = 'p1' | 'p2' | 'm1' | 'm2' | 'biology' | 'chemistry' | 'physics';
export type Difficulty = 'foundation' | 'standard' | 'challenge';

export interface Question {
  id: string;
  exam: Exam;
  moduleId: ModuleId;
  topic: { id: string; name: Bilingual };
  subtopic: { id: string; name: Bilingual };
  prompt: string;
  options: string[];
  correctIndex: number;
  difficulty?: Difficulty;
  // A letter-only answer sheet referring to an unchanged official PDF.
  // The prompt/options are UI instructions, not transcribed exam content.
  external?: { kind: 'linked-paper'; workedAnswersUrl: string; answerKeyUrl: string };
  explanation: Record<Language, { steps: string[]; pitfall: string }>;
  source: {
    kind: 'original-demo' | 'official-public';
    title: Bilingual;
    url: string | null;
    originalNumber: string;
    year: number | null;
    rightsNote: string;
  };
}

export interface Section {
  moduleId: ModuleId;
  questionIds: string[];
  limitSeconds: number | null;
}
export interface ActiveSession {
  id: string;
  mode: 'practice' | 'mock';
  exam: Exam;
  questions: Question[];
  sections: Section[];
  sectionIndex: number;
  questionIndex: number;
  answers: Record<string, number>;
  flags: string[];
  startedAt: number;
  sectionStartedAt: number;
  sectionElapsed: number[];
  expiredSections: number[];
  phase: 'answering' | 'between';
}
export interface Result extends Omit<ActiveSession, 'phase'> {
  finishedAt: number;
  elapsedSeconds: number;
}
export interface SavedState {
  version: 1;
  language: Language;
  active: ActiveSession | null;
  results: Result[];
}
export interface Filters {
  exam: Exam;
  moduleId: string;
  topic: string;
  subtopic: string;
  source: string;
  status: 'all' | 'new' | 'done' | 'wrong';
  difficulty: 'all' | Difficulty | 'unrated';
}
