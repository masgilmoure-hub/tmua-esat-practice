import { describe, expect, it } from 'vitest';
import template from '../examples/local-import-demo.json';
import { QUESTIONS } from '../src/data/questions';
import { BANK_STORAGE_KEY, loadImportedBank, MAX_BANK_BYTES, parseQuestionBank, validateQuestionBank } from '../src/questionBank';
import { closeSection, createSession, filterQuestions, notebookQuestions, recommendedSet, topicRecommendations } from '../src/domain';
import { emptyState, loadState, validQuestion } from '../src/storage';
import type { Filters, Question, Result } from '../src/types';
const imported = template.questions[0] as Question;
const copy = (): Question => structuredClone(imported);
const bank = (q: unknown) => ({ schemaVersion: 1, questions: [q] });
function attempt(questions: Question[], answers: Record<string, number> = {}, now = 1000): Result {
  const active = createSession(questions, [{ moduleId: questions[0].moduleId, questionIds: questions.map(q => q.id), limitSeconds: null }], 'practice', now);
  return closeSection({ ...active, answers }, now + 1000).result!;
}
describe('reviewed local question imports', () => {
  it('accepts the separate demo template, optional difficulty and property-order-independent taxonomy', () => {
    const q = copy(); q.topic.name = { en: q.topic.name.en, zh: q.topic.name.zh }; delete q.difficulty;
    expect(validateQuestionBank(bank(q), QUESTIONS)).toMatchObject({ ok: true });
    expect(parseQuestionBank(JSON.stringify(template), QUESTIONS)).toMatchObject({ ok: true });
  });
  it('rejects duplicate IDs and duplicate original provenance as an atomic batch', () => {
    const renamed = { ...copy(), id: 'RENAMED' };
    const duplicate = validateQuestionBank({ schemaVersion: 1, questions: [copy(), renamed] }, QUESTIONS);
    expect(duplicate.ok).toBe(false); expect(duplicate.questions).toEqual([]);
    expect(validateQuestionBank(template, [...QUESTIONS, imported]).ok).toBe(false);
  });
  it('rejects inconsistent bilingual taxonomy and parent topic definitions', () => {
    const q = copy(); q.topic.name.en = 'Different name';
    expect(validateQuestionBank(bank(q), QUESTIONS).ok).toBe(false);
    const other = copy(); other.subtopic.id = QUESTIONS[0].subtopic.id; other.subtopic.name = QUESTIONS[0].subtopic.name;
    other.topic = { id: 'different', name: { zh: '其他', en: 'Other' } };
    expect(validateQuestionBank(bank(other), QUESTIONS).ok).toBe(false);
  });
  it('rejects invalid answers, unaligned explanations, unsafe identifiers and source URLs', () => {
    const variants: Question[] = [];
    const answer = copy(); answer.correctIndex = 99; variants.push(answer);
    const steps = copy(); steps.explanation.en.steps.pop(); variants.push(steps);
    const id = copy(); id.id = '__proto__'; variants.push(id);
    const diff = copy(); diff.difficulty = 'official' as Question['difficulty']; variants.push(diff);
    for (const url of ['javascript:alert(1)', 'https://', 'https://user:password@example.com/test']) {
      const q = copy(); q.source.url = url; variants.push(q);
    }
    const official = copy(); official.source.kind = 'official-public'; variants.push(official);
    const array = { ...copy(), difficulty: ['foundation'] };
    expect(validateQuestionBank(bank(array), QUESTIONS).ok).toBe(false);
    expect(validateQuestionBank(bank({ ...copy(), source: { ...imported.source, kind: ['original-demo'] } }), QUESTIONS).ok).toBe(false);
    for (const q of variants) expect(validateQuestionBank(bank(q), QUESTIONS).ok).toBe(false);
    const declared = copy(); declared.source.kind = 'official-public'; declared.source.url = 'https://esat-tmua.ac.uk/example.pdf';
    expect(validQuestion(declared)).toBe(true); // Format check only, no claim that the content or URL is official.
  });
  it('limits malformed JSON, bytes and question count, preserving future or damaged saved banks', () => {
    expect(parseQuestionBank('{broken').ok).toBe(false);
    expect(parseQuestionBank(' '.repeat(MAX_BANK_BYTES + 1)).ok).toBe(false);
    expect(validateQuestionBank({ schemaVersion: 1, questions: Array(501).fill(copy()) }).ok).toBe(false);
    const storage = (raw: string | null) => ({ getItem: (key: string) => { expect(key).toBe(BANK_STORAGE_KEY); return raw; } });
    expect(loadImportedBank(storage(null), QUESTIONS)).toMatchObject({ writable: true, questions: [] });
    expect(loadImportedBank(storage(JSON.stringify(template)), QUESTIONS)).toMatchObject({ writable: true, questions: [imported] });
    expect(loadImportedBank(storage('{broken'), QUESTIONS)).toMatchObject({ writable: false, issue: 'invalid' });
    expect(loadImportedBank(storage('{"schemaVersion":2}'), QUESTIONS)).toMatchObject({ writable: false, issue: 'unsupported' });
    expect(loadImportedBank({ getItem: () => { throw new Error('blocked'); } }, QUESTIONS)).toMatchObject({ writable: false, issue: 'unavailable' });
  });
  it('keeps version-one attempt snapshots without difficulty compatible and filters unrated data', () => {
    const q = copy(); delete q.difficulty;
    const result = attempt([q]);
    expect(loadState({ getItem: () => JSON.stringify({ ...emptyState(), results: [result] }) }).issue).toBeNull();
    const filters: Filters = { exam: 'TMUA', moduleId: 'all', topic: 'all', subtopic: 'all', source: 'all', status: 'all', difficulty: 'unrated' };
    expect(filterQuestions([...QUESTIONS, q], filters, [])).toEqual([q]);
    expect(filterQuestions([...QUESTIONS, imported], { ...filters, difficulty: 'foundation', topic: 'algebra' }, [])).toContain(imported);
  });
});
describe('next practice and retired mistakes', () => {
  it('prefers fresh questions in the same paper and topic, excluding previous attempts', () => {
    const q = QUESTIONS[0]; const result = attempt([q]);
    const more = [imported, { ...copy(), id: 'NEW-2' }, { ...copy(), id: 'NEW-3' }, { ...copy(), id: 'NEW-4' }];
    const prior = attempt([more[3]], { [more[3].id]: more[3].correctIndex }, 0);
    const rows = topicRecommendations(result, [...QUESTIONS, ...more], [prior, result]);
    expect(rows).toHaveLength(1); expect(rows[0].fresh).toEqual(more.slice(0, 3));
    const selected = recommendedSet(rows[0], () => .4);
    expect(selected).toHaveLength(3); expect(selected).not.toContain(q);
    expect(selected.every(item => item.moduleId === q.moduleId && item.topic.id === q.topic.id)).toBe(true);
  });
  it('falls back to missed snapshots, has no recommendations after all-correct attempts, and correct retries clear retired mistakes', () => {
    const result = attempt([imported]);
    const row = topicRecommendations(result, QUESTIONS, [result])[0];
    // The built-in algebra question is a fresh alternative; if already attempted, retry the snapshot.
    const prior = attempt([QUESTIONS[0]], { [QUESTIONS[0].id]: QUESTIONS[0].correctIndex }, 0);
    const fallback = topicRecommendations(result, QUESTIONS, [prior, result])[0];
    expect(row.fresh).toEqual([QUESTIONS[0]]); expect(recommendedSet(fallback)).toEqual([imported]);
    expect(notebookQuestions(QUESTIONS, [result])).toEqual([imported]);
    const right = attempt([imported], { [imported.id]: imported.correctIndex }, 3000);
    expect(topicRecommendations(right, QUESTIONS, [result, right])).toEqual([]);
    expect(notebookQuestions(QUESTIONS, [result, right])).toEqual([]);
  });
});
