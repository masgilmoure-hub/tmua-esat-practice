import data from './data/tmua-score-tables.json';
import papers from './data/past-papers.json';
import type { Result } from './types';

export const TMUA_SCORE_TABLES = data.tables;
export const TMUA_SCORE_TABLE_VERSION = data.tableVersion;
export const TMUA_SCORING_URL = data.currentScoringUrl;
export type ScoreScope = 'p1' | 'p2' | 'overall';

export function convertTmuaMark(year: number, scope: ScoreScope, mark: number): number | null {
  const table = data.tables.find(table => table.year === year);
  const scores = table?.[scope];
  if (!scores || !Number.isInteger(mark) || mark < 0 || mark >= scores.length) return null;
  return scores[mark];
}

// Only recognise unchanged, complete archived paper plans, including old PDF snapshots.
// A custom import, random set, mixed year or truncated paper cannot receive a historical score.
export function tmuaScoreEstimate(result: Result) {
  if (result.exam !== 'TMUA' || result.mode !== 'mock') return null;
  const modules = result.sections.map(section => section.moduleId);
  if (!(modules.length === 1 && ['p1', 'p2'].includes(modules[0])) && modules.join(',') !== 'p1,p2') return null;
  const year = result.questions[0]?.source.year;
  const table = data.tables.find(table => table.year === year);
  if (!table || result.questions.length !== 20 * modules.length) return null;
  const scope: ScoreScope = modules.length === 2 ? 'overall' : modules[0] as 'p1' | 'p2';
  let rawMark = 0;
  for (let s = 0; s < modules.length; s++) {
    const section = result.sections[s];
    const paper = papers.papers.find(paper => paper.year === year && paper.moduleId === modules[s]);
    if (!paper || section.questionIds.length !== 20 || (section.limitSeconds !== null && section.limitSeconds !== 4500)) return null;
    for (let i = 0; i < 20; i++) {
      const q = result.questions[s * 20 + i];
      const expectedId = `ARCHIVE-TMUA-${year}-${modules[s].toUpperCase()}-Q${String(i + 1).padStart(2, '0')}`;
      const correctIndex = paper.answers.charCodeAt(i) - 65;
      if (q.id !== expectedId || section.questionIds[i] !== expectedId || q.exam !== 'TMUA' || q.moduleId !== modules[s]
        || q.source.kind !== 'official-public' || q.source.year !== year || q.source.url !== paper.paperUrl
        || q.source.originalNumber !== String(i + 1) || q.correctIndex !== correctIndex) return null;
      if (result.answers[q.id] === correctIndex) rawMark++;
    }
  }
  const scores = table[scope];
  return {
    year: table.year, scope, rawMark, total: scores.length - 1, score: scores[rawMark],
    lower: scores[Math.max(0, rawMark - 1)], upper: scores[Math.min(scores.length - 1, rawMark + 1)],
    timed: result.sections.every(section => section.limitSeconds === 4500),
    sourceUrl: table.sourceUrl, sourceKind: table.sourceKind,
    version: data.tableVersion,
  };
}
