import { describe, expect, it } from 'vitest';
import { PAST_PAPERS, linkedQuestions, pastPaperPlan } from '../src/data/pastPapers';
import { closeSection, createSession, remainingSeconds, startNextSection, summary, topicRecommendations, notebookQuestions } from '../src/domain';
import { emptyState, loadState, validQuestion } from '../src/storage';

describe('official external-paper answer sheets', () => {
  it('keeps complete paper plans separate from demos and uses actual 75-minute sections', () => {
    const plan = pastPaperPlan(2021, 'both', true);
    expect(plan.questions).toHaveLength(40);
    expect(new Set(plan.questions.map(q => q.id)).size).toBe(40);
    expect(plan.questions.every(q => q.source.kind === 'official-public' && q.external && q.source.year === 2021)).toBe(true);
    expect(plan.sections.map(s => [s.moduleId, s.questionIds.length, s.limitSeconds])).toEqual([['p1', 20, 4500], ['p2', 20, 4500]]);
    const one = pastPaperPlan(2018, 'p2', false);
    expect(one.questions).toHaveLength(20); expect(one.sections).toHaveLength(1); expect(one.sections[0].limitSeconds).toBeNull();
    expect(() => pastPaperPlan(2026, 'both', true)).toThrow('Unknown archived paper');
  });
  it('marks by the factual key, excludes transition time and does not infer unknown topic performance', () => {
    const plan = pastPaperPlan(2021, 'both', true);
    let active = createSession(plan.questions, plan.sections, 'mock', 1000);
    active = { ...active, answers: { [plan.questions[0].id]: plan.questions[0].correctIndex, [plan.questions[1].id]: (plan.questions[1].correctIndex + 1) % 8, [plan.questions[20].id]: plan.questions[20].correctIndex } };
    const first = closeSection(active, 9_001_000).active!;
    expect(first.sectionElapsed).toEqual([4500]);
    const second = startNextSection(first, 10_000_000);
    expect(remainingSeconds(second, 10_000_000)).toBe(4500);
    const result = closeSection(second, 10_010_000).result!;
    expect(summary(result)).toMatchObject({ total: 40, correct: 2, wrong: 1, unanswered: 37, accuracy: 5 });
    expect(result.elapsedSeconds).toBe(4510);
    expect(topicRecommendations(result, plan.questions)).toEqual([]);
    expect(notebookQuestions([], [result])).toHaveLength(38);
  });
  it('preserves linked-paper snapshots and rejects malformed external metadata', () => {
    for (const paper of PAST_PAPERS) {
      for (const q of linkedQuestions(paper)) expect(validQuestion(q)).toBe(true);
    }
    const plan = pastPaperPlan(2021, 'p1', false);
    const active = createSession(plan.questions, plan.sections, 'mock');
    const state = { ...emptyState(), active };
    expect(loadState({ getItem: () => JSON.stringify(state) })).toMatchObject({ state, issue: null, writable: true });
    const q = plan.questions[0];
    expect(validQuestion({ ...q, external: { ...q.external, workedAnswersUrl: 'javascript:alert(1)' } })).toBe(false);
    expect(validQuestion({ ...q, options: ['A', 'B'] })).toBe(false);
    expect(validQuestion({ ...q, source: { ...q.source, kind: 'original-demo' } })).toBe(false);
  });
});
