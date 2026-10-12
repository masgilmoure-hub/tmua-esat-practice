import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { existsSync } from 'node:fs';
import { NATIVE_2023_P1, NATIVE_2023_P2, NATIVE_2022_P1, NATIVE_2022_P2, PAST_PAPERS, linkedQuestions, pastPaperPlan } from '../src/data/pastPapers';
import { createSession, closeSection, summary, filterQuestions } from '../src/domain';
import { validQuestion, loadState, emptyState } from '../src/storage';
import { validateQuestionBank } from '../src/questionBank';
import { QUESTIONS } from '../src/data/questions';
import { initialFilters } from '../src/features/QuestionBank';

describe.each([[2023,'p1', NATIVE_2023_P1, 'FACCF EFBEB BFFAF EEEDF'], [2023,'p2', NATIVE_2023_P2, 'HFCGA FEDDA GCCFB BFDHD'], [2022,'p1', NATIVE_2022_P1, 'CDFCH FEBEC ADADH BDBFB'], [2022,'p2', NATIVE_2022_P2, 'BECBF CFCAG CFEDF DEEBE']] as const)('native %s %s', (year, moduleId, nativeQuestions, answerKey) => {
  it('preserves each source number and official answer key without duplicating references', () => {
    const paper = PAST_PAPERS.find(p => p.year === year && p.moduleId === moduleId)!;
    expect(nativeQuestions).toHaveLength(20);
    expect(nativeQuestions.map(q => String.fromCharCode(65 + q.correctIndex)).join('')).toBe(paper.answers);
    nativeQuestions.forEach((q, i) => {
      expect(validQuestion(q)).toBe(true);
      expect(q.external).toBeUndefined();
      expect(q.source).toMatchObject({ originalNumber: String(i+1), year, url: paper.paperUrl });
      expect(q.id).toBe(`ARCHIVE-TMUA-${year}-${moduleId.toUpperCase()}-Q${String(i+1).padStart(2,'0')}`);
      if (q.diagram) expect(existsSync(`public/${q.diagram.path}`)).toBe(true);
    });
    const all = PAST_PAPERS.flatMap(linkedQuestions);
    expect(new Set(all.map(q => q.id)).size).toBe(320);
    expect(all.filter(q => !q.external)).toHaveLength(80);
    expect(validateQuestionBank({schemaVersion:1,questions:[...QUESTIONS,...all]}).ok).toBe(true);
    expect(filterQuestions(all, { ...initialFilters(), year: String(year), moduleId, delivery: 'native' }, [])).toHaveLength(20);
  });
  it('renders every authored formula without parse errors, with untrusted HTML commands disabled', () => {
    for (const q of nativeQuestions) for (const text of [q.prompt, ...q.options, ...q.explanation.zh.steps, ...q.explanation.en.steps, q.explanation.zh.pitfall, q.explanation.en.pitfall]) {
      for (const part of text.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g) ?? []) {
        const display=part.startsWith('$$');
        expect(() => katex.renderToString(part.slice(display?2:1, display?-2:-1), { throwOnError:true, strict:'error', trust:false })).not.toThrow();
      }
    }
    expect(validQuestion({ ...NATIVE_2023_P1[0], diagram:{path:'../../secret.png',alt:'bad'} })).toBe(false);
    expect(validQuestion({ ...NATIVE_2023_P1[0], format:'html' })).toBe(false);
  });
  it('keeps a 20-question 75-minute session, raw marks and renderable snapshots through reload', () => {
    const plan = pastPaperPlan(year, moduleId, true);
    expect(plan.sections[0].limitSeconds).toBe(4500);
    let session=createSession(plan.questions,plan.sections,'mock',1000);
    const key = answerKey.replace(/ /g,'');
    expect(key).toHaveLength(20);
    session={...session,answers:Object.fromEntries(plan.questions.map((q,i)=>[q.id,key.charCodeAt(i)-65]))};
    const result=closeSection(session,4_501_000).result!;
    expect(summary(result)).toMatchObject({correct:20,total:20,accuracy:100,unanswered:0});
    const state={...emptyState(),results:[result]};
    expect(loadState({getItem:()=>JSON.stringify(state)})).toMatchObject({state,issue:null});
  });
});
