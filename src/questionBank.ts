import { validQuestion, type StorageIssue } from './storage.ts';
import type { Bilingual, Question } from './types.ts';

export const BANK_STORAGE_KEY = 'tmua-esat-bank:v1';
export const MAX_BANK_BYTES = 1024 * 1024;
export const MAX_IMPORTED_QUESTIONS = 500;
export interface BankIssue { index?: number; message: Bilingual }
export type BankValidation = { ok: true; questions: Question[]; issues: [] } | { ok: false; questions: []; issues: BankIssue[] };
const issue = (zh: string, en: string, index?: number): BankIssue => ({ index, message: { zh, en } });
const provenanceKey = (q: Question) => JSON.stringify([q.exam, q.moduleId, q.source.kind, q.source.url ?? q.source.title.en, q.source.year, q.source.originalNumber]);
const bilingualKey = (name: Bilingual) => JSON.stringify([name.zh, name.en]);

export function validateQuestionBank(value: unknown, existing: Question[] = []): BankValidation {
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1
    || !('questions' in value) || !Array.isArray(value.questions) || !value.questions.length || value.questions.length > MAX_IMPORTED_QUESTIONS) {
    return { ok: false, questions: [], issues: [issue('需要 schemaVersion 为 1，且包含 1–500 道题的 questions 数组。', 'Expected schemaVersion 1 and a questions array containing 1–500 questions.')] };
  }
  const ids = new Set(existing.map(q => q.id));
  const provenance = new Set(existing.map(provenanceKey));
  const topics = new Map(existing.map(q => [`${q.exam}:${q.topic.id}`, bilingualKey(q.topic.name)]));
  const subtopics = new Map(existing.map(q => [`${q.exam}:${q.subtopic.id}`, JSON.stringify([q.topic.id, q.subtopic.name.zh, q.subtopic.name.en])]));
  const issues: BankIssue[] = [];
  const questions: Question[] = [];
  for (const [index, q] of value.questions.entries()) {
    if (!validQuestion(q)) { issues.push(issue('题目结构无效：请检查考试/科目、标签、选项与答案下标、双语解析、难度和来源字段。', 'Invalid question: check exam/module, labels, options and answer index, bilingual explanations, difficulty and source fields.', index)); continue; }
    if (ids.has(q.id)) issues.push(issue(`重复题目 ID：${q.id}。导入不会覆盖已有题目。`, `Duplicate question ID: ${q.id}. Imports never overwrite existing questions.`, index));
    if (provenance.has(provenanceKey(q))) issues.push(issue(`原始来源与题号重复：${q.source.originalNumber}。`, `Duplicate provenance and original number: ${q.source.originalNumber}.`, index));
    const topicKey = `${q.exam}:${q.topic.id}`, subtopicKey = `${q.exam}:${q.subtopic.id}`;
    const topicName = bilingualKey(q.topic.name), subtopicName = JSON.stringify([q.topic.id, q.subtopic.name.zh, q.subtopic.name.en]);
    if (topics.has(topicKey) && topics.get(topicKey) !== topicName) issues.push(issue(`知识点 ID ${q.topic.id} 的中英名称不一致。`, `Topic ID ${q.topic.id} has inconsistent bilingual names.`, index));
    if (subtopics.has(subtopicKey) && subtopics.get(subtopicKey) !== subtopicName) issues.push(issue(`细分考点 ID ${q.subtopic.id} 的归属或中英名称不一致。`, `Subtopic ID ${q.subtopic.id} has inconsistent parent topic or names.`, index));
    ids.add(q.id); provenance.add(provenanceKey(q)); topics.set(topicKey, topicName); subtopics.set(subtopicKey, subtopicName); questions.push(q);
  }
  return issues.length ? { ok: false, questions: [], issues } : { ok: true, questions, issues: [] };
}

export function parseQuestionBank(text: string, existing: Question[] = []): BankValidation {
  if (new TextEncoder().encode(text).length > MAX_BANK_BYTES) return { ok: false, questions: [], issues: [issue('题库文件超过 1 MB，请分批导入。', 'The bank exceeds 1 MB. Import it in smaller batches.')] };
  try { return validateQuestionBank(JSON.parse(text), existing); }
  catch { return { ok: false, questions: [], issues: [issue('无法解析 JSON，请检查文件格式。', 'Could not parse JSON. Check the file format.')] }; }
}

export function loadImportedBank(storage: Pick<Storage, 'getItem'>, builtIn: Question[]): { questions: Question[]; issue: StorageIssue; writable: boolean } {
  try {
    const raw = storage.getItem(BANK_STORAGE_KEY);
    if (raw === null) return { questions: [], issue: null, writable: true };
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'schemaVersion' in parsed && parsed.schemaVersion !== 1) return { questions: [], issue: 'unsupported', writable: false };
    const validation = parseQuestionBank(raw, builtIn);
    return validation.ok ? { questions: validation.questions, issue: null, writable: true } : { questions: [], issue: 'invalid', writable: false };
  } catch (error) {
    return { questions: [], issue: error instanceof SyntaxError ? 'invalid' : 'unavailable', writable: false };
  }
}
