import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { existsSync } from 'node:fs';
import { NATIVE_2023_P1, PAST_PAPERS, linkedQuestions, pastPaperPlan } from '../src/data/pastPapers';
import { createSession, closeSection, summary, filterQuestions } from '../src/domain';
import { validQuestion, loadState, emptyState } from '../src/storage';
import { validateQuestionBank } from '../src/questionBank';
import { QUESTIONS } from '../src/data/questions';
import { initialFilters } from '../src/features/QuestionBank';

describe('native 2023 Paper 1', () => {
  it('preserves each source number and official answer key without duplicating references', () => {
    const paper = PAST_PAPERS.find(p => p.year === 2023 && p.moduleId === 'p1')!;
    expect(NATIVE_2023_P1).toHaveLength(20);
    expect(NATIVE_2023_P1.map(q => String.fromCharCode(65 + q.correctIndex)).join('')).toBe(paper.answers);
    NATIVE_2023_P1.forEach((q, i) => {
      expect(validQuestion(q)).toBe(true);
      expect(q.external).toBeUndefined();
      expect(q.source).toMatchObject({ originalNumber: String(i+1), year: 2023, url: paper.paperUrl });
      expect(q.id).toBe(`ARCHIVE-TMUA-2023-P1-Q${String(i+1).padStart(2,'0')}`);
      if (q.diagram) expect(existsSync(`public/${q.diagram.path}`)).toBe(true);
    });
    const all = PAST_PAPERS.flatMap(linkedQuestions);
    expect(new Set(all.map(q => q.id)).size).toBe(320);
    expect(all.filter(q => !q.external)).toHaveLength(20);
    expect(validateQuestionBank({schemaVersion:1,questions:[...QUESTIONS,...all]}).ok).toBe(true);
    expect(filterQuestions(all, { ...initialFilters(), year: '2023', moduleId: 'p1', delivery: 'native' }, [])).toHaveLength(20);
  });
  it('renders every authored formula without parse errors, with untrusted HTML commands disabled', () => {
    for (const q of NATIVE_2023_P1) for (const text of [q.prompt, ...q.options, ...q.explanation.zh.steps, ...q.explanation.en.steps, q.explanation.zh.pitfall, q.explanation.en.pitfall]) {
      for (const part of text.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g) ?? []) {
        const display=part.startsWith('$$');
        expect(() => katex.renderToString(part.slice(display?2:1, display?-2:-1), { throwOnError:true, strict:'error', trust:false })).not.toThrow();
      }
    }
    expect(validQuestion({ ...NATIVE_2023_P1[0], diagram:{path:'../../secret.png',alt:'bad'} })).toBe(false);
    expect(validQuestion({ ...NATIVE_2023_P1[0], format:'html' })).toBe(false);
  });
  it('keeps a 20-question 75-minute session, raw marks and renderable snapshots through reload', () => {
    const plan = pastPaperPlan(2023, 'p1', true);
    expect(plan.sections[0].limitSeconds).toBe(4500);
    let session=createSession(plan.questions,plan.sections,'mock',1000);
    const key = 'FACCF EFBEB BFFAF EEEDF'.replace(/ /g,'');
    expect(key).toHaveLength(20);
    session={...session,answers:Object.fromEntries(plan.questions.map((q,i)=>[q.id,key.charCodeAt(i)-65]))};
    const result=closeSection(session,4_501_000).result!;
    expect(summary(result)).toMatchObject({correct:20,total:20,accuracy:100,unanswered:0});
    const state={...emptyState(),results:[result]};
    expect(loadState({getItem:()=>JSON.stringify(state)})).toMatchObject({state,issue:null});
  });
});
