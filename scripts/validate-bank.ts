import { readFileSync } from 'node:fs';
import { validQuestion } from '../src/storage.ts';

const path = process.argv[2];
if (!path) { console.error('Usage: npm run validate:bank -- path/to/question-bank.json'); process.exit(1); }
try {
  const bank = JSON.parse(readFileSync(path, 'utf8'));
  if (bank.schemaVersion !== 1 || !Array.isArray(bank.questions) || !bank.questions.length) throw new Error('Expected schemaVersion: 1 and a non-empty questions array');
  const ids = new Set();
  for (const [index, question] of bank.questions.entries()) {
    if (!validQuestion(question)) throw new Error(`Question at index ${index} has an invalid structure, source or answer`);
    if (ids.has(question.id)) throw new Error(`Duplicate question ID: ${question.id}`);
    if (question.explanation.zh.steps.length !== question.explanation.en.steps.length) throw new Error(`Mismatched bilingual steps: ${question.id}`);
    ids.add(question.id);
  }
  console.log(`Valid question bank: ${bank.questions.length} questions; provenance and answer indices checked.`);
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
