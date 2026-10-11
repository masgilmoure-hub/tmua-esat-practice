import { readFileSync } from 'node:fs';
import { parseQuestionBank } from '../src/questionBank.ts';

const path = process.argv[2];
if (!path) { console.error('Usage: npm run validate:bank -- path/to/question-bank.json'); process.exit(1); }
try {
  const bank = parseQuestionBank(readFileSync(path, 'utf8'));
  if (!bank.ok) throw new Error(bank.issues.map(item => `${item.index === undefined ? '' : `Question ${item.index + 1}: `}${item.message.en}`).join('\n'));
  console.log(`Valid question bank: ${bank.questions.length} questions; provenance and answer indices checked.`);
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
