import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pastPaperPlan } from '../src/data/pastPapers';
import { closeSection, createSession, startNextSection } from '../src/domain';
import { TMUA_SCORE_TABLES, convertTmuaMark, tmuaScoreEstimate } from '../src/tmuaScoring';
import type { Result } from '../src/types';

function resultFor(year: number, selection: 'both' | 'p1' | 'p2' = 'both', marks = 24, timed = true): Result {
  const plan = pastPaperPlan(year, selection, timed);
  let active = createSession(plan.questions, plan.sections, 'mock', 1000);
  active = { ...active, answers: Object.fromEntries(plan.questions.slice(0, marks).map(q => [q.id, q.correctIndex])) };
  const first = closeSection(active, 2000);
  return first.result ?? closeSection(startNextSection(first.active!, 3000), 4000).result!;
}

describe('historical TMUA score conversion', () => {
  it('preserves all 498 bounded, monotonic entries and the six original source file hashes', () => {
    expect(TMUA_SCORE_TABLES.map(t => t.year)).toEqual([2018, 2019, 2020, 2021, 2022, 2023]);
    for (const table of TMUA_SCORE_TABLES) {
      for (const [scope, length] of [['p1', 21], ['p2', 21], ['overall', 41]] as const) {
        expect(table[scope]).toHaveLength(length);
        expect(table[scope].every(n => Number.isFinite(n) && n >= 1 && n <= 9 && Number.isInteger(n * 10))).toBe(true);
        expect(table[scope]).toEqual([...table[scope]].sort((a, b) => a - b));
      }
      const bytes = readFileSync(`public/score-tables/${table.localFile}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(table.sha256);
    }
  });
  it('matches every 2023 entry to the preserved official Cambridge FOI response', () => {
    const table = TMUA_SCORE_TABLES.find(t => t.year === 2023)!;
    let count = 0;
    for (const line of readFileSync('docs/sources/tmua-2023-foi-table.txt', 'utf8').split('\n')) {
      const cells = line.trim().split(/\s+/);
      if (![2, 6].includes(cells.length) || !cells.every(c => /^\d+(?:\.\d+)?$/.test(c))) continue;
      const scopes = cells.length === 6 ? ['p1', 'p2', 'overall'] as const : ['overall'] as const;
      scopes.forEach((scope, i) => { expect(table[scope][Number(cells[i * 2])]).toBe(Number(cells[i * 2 + 1])); count++; });
    }
    expect(count).toBe(83);
  });
  it.each([[2018, 5.6, 6.5], [2019, 5.7, 6.5], [2020, 5.6, 6.5], [2021, 5.6, 6.5], [2022, 6.2, 6.7], [2023, 6.5, 6.8]])('uses the actual %i overall table', (year, at21, at24) => {
    expect(convertTmuaMark(year, 'overall', 21)).toBe(at21);
    expect(tmuaScoreEstimate(resultFor(year))?.score).toBe(at24);
  });
  it('rejects invalid marks and unsupported years without extrapolation', () => {
    for (const mark of [-1, 41, 20.5, NaN, Infinity]) expect(convertTmuaMark(2023, 'overall', mark)).toBeNull();
    expect(convertTmuaMark(2023, 'p1', 21)).toBeNull();
    expect(convertTmuaMark(2017, 'overall', 20)).toBeNull();
    expect(convertTmuaMark(2024, 'overall', 20)).toBeNull();
  });
  it('uses total raw marks, never the mean of paper grades, and clips sensitivity at the endpoints', () => {
    const estimate = tmuaScoreEstimate(resultFor(2023, 'both', 20))!;
    expect(estimate).toMatchObject({ rawMark: 20, total: 40, scope: 'overall', score: 6.2, lower: 6, upper: 6.5, timed: true });
    expect(estimate.score).not.toBe((convertTmuaMark(2023, 'p1', 20)! + convertTmuaMark(2023, 'p2', 0)!) / 2);
    expect(tmuaScoreEstimate(resultFor(2023, 'both', 0))).toMatchObject({ score: 1, lower: 1, upper: 1 });
    expect(tmuaScoreEstimate(resultFor(2023, 'both', 40))).toMatchObject({ score: 9, lower: 9, upper: 9 });
  });
  it('uses the selected paper table and keeps untimed practice visibly distinct', () => {
    expect(tmuaScoreEstimate(resultFor(2018, 'p2', 11, false))).toMatchObject({ scope: 'p2', score: 6.5, rawMark: 11, total: 20, lower: 6, upper: 7.1, timed: false });
    expect(tmuaScoreEstimate(resultFor(2018, 'p1', 11))).toMatchObject({ scope: 'p1', score: 5.3 });
  });
  it('rejects focused, shortened, mixed, modified or duplicate paper records', () => {
    const result = resultFor(2023);
    expect(tmuaScoreEstimate({ ...result, mode: 'practice' })).toBeNull();
    expect(tmuaScoreEstimate(resultFor(2017))).toBeNull();
    expect(tmuaScoreEstimate({ ...result, questions: result.questions.slice(1) })).toBeNull();
    for (const change of [{ correctIndex: 0 }, { source: { ...result.questions[0].source, year: 2022 } }, { source: { ...result.questions[0].source, url: 'https://example.com/import.pdf' } }, { id: 'custom-import' }]) {
      expect(tmuaScoreEstimate({ ...result, questions: [{ ...result.questions[0], ...change }, ...result.questions.slice(1)] })).toBeNull();
    }
    expect(tmuaScoreEstimate({ ...result, questions: [result.questions[1], ...result.questions.slice(1)] })).toBeNull();
    expect(tmuaScoreEstimate({ ...result, sections: result.sections.map(s => ({ ...s, limitSeconds: 60 })) })).toBeNull();
  });
  it('keeps historical PDF snapshots eligible without changing stored results', () => {
    const result = resultFor(2023);
    const snapshot = { ...result, questions: result.questions.map(q => ({ ...q, topic: { id: 'unclassified', name: { zh: '旧快照', en: 'Old snapshot' } }, prompt: 'Read the original paper.' })) };
    expect(tmuaScoreEstimate(snapshot)).toEqual(tmuaScoreEstimate(result));
    expect(snapshot.questions[0].prompt).toBe('Read the original paper.');
  });
});
