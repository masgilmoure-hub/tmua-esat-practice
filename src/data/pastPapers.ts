import data from './past-papers.json';
import nativePaper from './tmua-2023-p1.json';
import nativePaper2 from './tmua-2023-p2.json';
import native2022P1 from './tmua-2022-p1.json';
import native2022P2 from './tmua-2022-p2.json';
import explained2021P1 from './tmua-2021-p1-explained.json';
import explained2021P2 from './tmua-2021-p2-explained.json';
import type { Question, Section } from '../types';
export const PAST_PAPERS = data.papers;
export const PAST_PAPER_SOURCE = data;
export const PAST_PAPER_YEARS = [...new Set(PAST_PAPERS.map(paper => paper.year))].sort((a, b) => b - a);
export type PastPaper = typeof PAST_PAPERS[number];
export const NATIVE_2023_P1 = nativePaper as Question[];
export const NATIVE_2023_P2 = nativePaper2 as Question[];
export const NATIVE_2022_P1 = native2022P1 as Question[];
export const NATIVE_2022_P2 = native2022P2 as Question[];
const nativePapers: Record<string, Question[]> = { '2023:p1': NATIVE_2023_P1, '2023:p2': NATIVE_2023_P2, '2022:p1': NATIVE_2022_P1, '2022:p2': NATIVE_2022_P2 };
export const PDF_2021_P1 = explained2021P1 as Question[];
export const PDF_2021_P2 = explained2021P2 as Question[];
const explainedPapers: Record<string, Question[]> = { '2021:p1': PDF_2021_P1, '2021:p2': PDF_2021_P2 };
export const isNativePaper = (paper: PastPaper) => !!nativePapers[`${paper.year}:${paper.moduleId}`];
export const hasPaperExplanations = (paper: PastPaper) => isNativePaper(paper) || !!explainedPapers[`${paper.year}:${paper.moduleId}`];
export const NATIVE_PAPER_YEARS = PAST_PAPER_YEARS.filter(year => PAST_PAPERS.filter(paper => paper.year === year).every(isNativePaper));
export const NATIVE_QUESTION_COUNT = PAST_PAPERS.filter(isNativePaper).reduce((total, paper) => total + paper.questionCount, 0);
export const PDF_EXPLANATION_PAPER_YEARS = PAST_PAPER_YEARS.filter(year => PAST_PAPERS.filter(paper => paper.year === year).every(p => !isNativePaper(p) && hasPaperExplanations(p)));
export const PDF_EXPLANATION_QUESTION_COUNT = PAST_PAPERS.filter(p => !isNativePaper(p) && hasPaperExplanations(p)).reduce((total, paper) => total + paper.questionCount, 0);

export function linkedQuestions(paper: PastPaper): Question[] {
  if (!['p1', 'p2'].includes(paper.moduleId) || paper.questionCount !== 20 || paper.minutes !== 75
    || !/^[A-H]{20}$/.test(paper.answers)) throw new Error('Invalid official answer index');
  if (isNativePaper(paper)) return nativePapers[`${paper.year}:${paper.moduleId}`];
  if (explainedPapers[`${paper.year}:${paper.moduleId}`]) return explainedPapers[`${paper.year}:${paper.moduleId}`];
  return [...paper.answers].map((answer, index) => ({
    id: `ARCHIVE-TMUA-${paper.year}-${paper.moduleId.toUpperCase()}-Q${String(index + 1).padStart(2, '0')}`,
    exam: 'TMUA', moduleId: paper.moduleId as 'p1' | 'p2',
    topic: { id: 'unclassified-paper', name: { zh: '原卷考点未逐题标注', en: 'Paper topics not classified' } },
    subtopic: { id: 'unclassified-question', name: { zh: '见官方原卷', en: 'See the official paper' } },
    prompt: `Read question ${index + 1} in the official TMUA ${paper.year} Paper ${paper.moduleId === 'p1' ? '1' : '2'}. Record your answer here.`,
    options: [...'ABCDEFGH'], correctIndex: answer.charCodeAt(0) - 65,
    external: { kind: 'linked-paper', workedAnswersUrl: paper.workedAnswersUrl, answerKeyUrl: paper.answerKeyUrl },
    explanation: {
      zh: { steps: ['核对官方原卷中的题号后，打开对应英文详解复盘。'], pitfall: '站内仅保存答题卡与原始来源，尚未提供逐题双语解析。' },
      en: { steps: ['Match the original question number, then review the corresponding official worked solution.'], pitfall: 'This answer sheet stores responses and provenance; question-specific bilingual explanations are not available yet.' },
    },
    source: { kind: 'official-public', title: { zh: `TMUA ${paper.year} Paper ${paper.moduleId === 'p1' ? '1' : '2'} · 官方原卷`, en: `TMUA ${paper.year} Paper ${paper.moduleId === 'p1' ? '1' : '2'} · official archive` }, url: paper.paperUrl,
      originalNumber: String(index + 1), year: paper.year, rightsNote: data.attribution },
  }));
}

export function pastPaperPlan(year: number, selection: 'both' | 'p1' | 'p2', timed: boolean): { questions: Question[]; sections: Section[] } {
  const papers = PAST_PAPERS.filter(paper => paper.year === year && (selection === 'both' || paper.moduleId === selection));
  if (papers.length !== (selection === 'both' ? 2 : 1)) throw new Error('Unknown archived paper');
  const questions = papers.flatMap(linkedQuestions);
  return { questions, sections: papers.map(paper => ({ moduleId: paper.moduleId as 'p1' | 'p2', questionIds: questions.filter(q => q.moduleId === paper.moduleId).map(q => q.id), limitSeconds: timed ? paper.minutes * 60 : null })) };
}
