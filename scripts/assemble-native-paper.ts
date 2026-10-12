import { readFileSync, writeFileSync } from 'node:fs';
import { TOPICS } from '../src/data/catalog.ts';
import { validateQuestionBank } from '../src/questionBank.ts';
import katex from 'katex';
import { existsSync } from 'node:fs';
import type { Question, Difficulty } from '../src/types.ts';

// Drafts are editorial inputs, never runtime content. A full paper is written only
// after all 20 reviewed drafts, independently entered letters and formulas pass.
const [yearText, moduleId, input, output] = process.argv.slice(2);
if (!/^20\d\d$/.test(yearText ?? '') || !['p1', 'p2'].includes(moduleId) || !input || !output) {
  console.error('Usage: node --experimental-strip-types scripts/assemble-native-paper.ts YEAR p1|p2 drafts.json output.json');
  process.exit(1);
}
try {
  const metadata = JSON.parse(readFileSync('src/data/past-papers.json', 'utf8'));
  const paper = metadata.papers.find((p: { year: number; moduleId: string }) => p.year === Number(yearText) && p.moduleId === moduleId);
  if (!paper || !/^[A-H]{20}$/.test(paper.answers)) throw new Error('Unknown paper or malformed official key');
  const drafts = JSON.parse(readFileSync(input, 'utf8'));
  if (!Array.isArray(drafts) || drafts.length !== 20) throw new Error('Exactly 20 reviewed drafts are required');
  const questions: Question[] = drafts.map((draft, i) => {
    if (draft.number !== i + 1 || draft.reviewed !== true || !TOPICS[draft.topic]
      || draft.answer !== paper.answers[i] || !Array.isArray(draft.steps) || !draft.steps.length
      || draft.steps.some((pair: unknown) => !Array.isArray(pair) || pair.length !== 2 || pair.some(s => typeof s !== 'string' || !s.trim()))
      || !Array.isArray(draft.subtopic) || draft.subtopic.length !== 3
      || !Array.isArray(draft.pitfall) || draft.pitfall.length !== 2) throw new Error(`Question ${i + 1}: review, taxonomy, bilingual content or answer key mismatch`);
    return {
      id: `ARCHIVE-TMUA-${yearText}-${moduleId.toUpperCase()}-Q${String(i + 1).padStart(2, '0')}`,
      exam: 'TMUA', moduleId: moduleId as 'p1' | 'p2', format: 'latex',
      topic: { id: draft.topic, name: TOPICS[draft.topic] },
      subtopic: { id: draft.subtopic[0], name: { zh: draft.subtopic[1], en: draft.subtopic[2] } },
      prompt: draft.prompt, options: draft.options, correctIndex: draft.answer.charCodeAt(0) - 65,
      difficulty: draft.difficulty as Difficulty,
      ...(draft.diagram ? { diagram: draft.diagram } : {}),
      explanation: {
        zh: { steps: draft.steps.map((pair: string[]) => pair[0]), pitfall: draft.pitfall[0] },
        en: { steps: draft.steps.map((pair: string[]) => pair[1]), pitfall: draft.pitfall[1] },
      },
      source: { kind: 'official-public', title: { zh: `TMUA ${yearText} Paper ${moduleId.slice(1)} · 官方原卷`, en: `TMUA ${yearText} Paper ${moduleId.slice(1)} · official archive` }, url: paper.paperUrl, originalNumber: String(i + 1), year: Number(yearText), rightsNote: metadata.attribution },
    };
  });
  const validation = validateQuestionBank({ schemaVersion: 1, questions });
  if (!validation.ok) throw new Error(validation.issues.map(item => item.message.en).join('\n'));
  for (const q of questions) {
    if (q.diagram && !existsSync(`public/${q.diagram.path}`)) throw new Error(`${q.id}: missing original diagram`);
    for (const text of [q.prompt, ...q.options, ...q.explanation.zh.steps, ...q.explanation.en.steps, q.explanation.zh.pitfall, q.explanation.en.pitfall]) {
      for (const part of text.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g) ?? []) {
        const display = part.startsWith('$$');
        katex.renderToString(part.slice(display ? 2 : 1, display ? -2 : -1), { throwOnError: true, strict: 'error', trust: false });
      }
    }
  }
  // No partial file writes if any draft fails.
  writeFileSync(output, JSON.stringify(questions, null, 2) + '\n');
  console.log(`${yearText} ${moduleId}: 20 reviewed questions assembled; all answer letters match the official key.`);
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
