import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PDF_2021_P1, PDF_2021_P2, PDF_2020_P1, PDF_2020_P2, PDF_2019_P1, PDF_2019_P2, PDF_2018_P1, PDF_2018_P2, PAST_PAPERS, linkedQuestions, pastPaperPlan } from '../src/data/pastPapers';
import { hasBilingualExplanation, hasTopicClassification } from '../src/questionCapabilities';
import { closeSection, createSession, summary, startNextSection, topicRecommendations, notebookQuestions } from '../src/domain';
import { emptyState, loadState, validQuestion } from '../src/storage';
import { validateQuestionBank } from '../src/questionBank';
import { QUESTIONS } from '../src/data/questions';

describe('reviewed explanations independent of PDF reading', () => {
 it('keeps 160 PDF questions with stable provenance, independent keys and valid bilingual formulas', () => {
  for (const [year, questions, moduleId, key] of [[2021,PDF_2021_P1,'p1','FFGBFDGACBAECBCBABBD'],[2021,PDF_2021_P2,'p2','DECCBDBCCECBACBEFCFE'],[2020,PDF_2020_P1,'p1','CCBDACADCAEDFECCAAEC'],[2020,PDF_2020_P2,'p2','EFCGAAHEFFGDDADDEGEC'],[2019,PDF_2019_P1,'p1','AAECECFEDFHCBBACCBCE'],[2019,PDF_2019_P2,'p2','ECADBDBEDAAFDBBFDEEB'],[2018,PDF_2018_P1,'p1','DCEGDEADBECFCBEFABDE'],[2018,PDF_2018_P2,'p2','CBFDACBDFBAFFEGFCCCB']] as const) {
   const paper=PAST_PAPERS.find(p=>p.year===year&&p.moduleId===moduleId)!;
   expect(questions.map(q=>String.fromCharCode(65+q.correctIndex)).join('')).toBe(key);
   expect(questions).toHaveLength(20);
   questions.forEach((q,i)=>{
    expect(validQuestion(q)).toBe(true);expect(hasBilingualExplanation(q)&&hasTopicClassification(q)).toBe(true);
    expect(q.external).toMatchObject({kind:'linked-paper',explanationReady:true,workedAnswersUrl:paper.workedAnswersUrl});
    expect(q.source).toMatchObject({year,url:paper.paperUrl,originalNumber:String(i+1)});
    expect(q.id).toBe(`ARCHIVE-TMUA-${year}-${moduleId.toUpperCase()}-Q${String(i+1).padStart(2,'0')}`);
    expect(q.options).toEqual([...'ABCDEFGH']);expect(q.diagram).toBeUndefined();
    expect(q.prompt).toBe(`Read question ${i+1} in the official TMUA ${year} Paper ${moduleId.slice(1)}. Record your answer here.`);
    for(const text of [...q.explanation.zh.steps,...q.explanation.en.steps,q.explanation.zh.pitfall,q.explanation.en.pitfall])for(const part of text.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g)??[]){const display=part.startsWith('$$');expect(()=>katex.renderToString(part.slice(display?2:1,display?-2:-1),{throwOnError:true,strict:'error',trust:false})).not.toThrow();}
   });
  }
  const all=PAST_PAPERS.flatMap(linkedQuestions);
  expect(all).toHaveLength(320);expect(new Set(all.map(q=>q.id)).size).toBe(320);
  expect(all.filter(q=>!q.external)).toHaveLength(80);
  expect(all.filter(q=>q.external&&hasBilingualExplanation(q))).toHaveLength(160);
  expect(all.filter(q=>!hasBilingualExplanation(q))).toHaveLength(80);
  expect(validateQuestionBank({schemaVersion:1,questions:[...QUESTIONS,...all]}).ok).toBe(true);
 });
 it('supports classified PDF recommendations while preserving and upgrading old notebook snapshots',()=>{
  const q=PDF_2021_P1[0];const legacy={...q,topic:{id:'unclassified-paper',name:{zh:'原卷考点未逐题标注',en:'Paper topics not classified'}},external:{kind:'linked-paper' as const,workedAnswersUrl:q.external!.workedAnswersUrl,answerKeyUrl:q.external!.answerKeyUrl}};
  expect(validQuestion(legacy)).toBe(true);expect(hasBilingualExplanation(legacy)).toBe(false);expect(hasTopicClassification(legacy)).toBe(false);
  expect(validQuestion({...q,external:{...q.external,explanationReady:'true'}})).toBe(false);
  const old=closeSection(createSession([legacy],[{moduleId:'p1',questionIds:[q.id],limitSeconds:null}],'practice',1000),2000).result!;
  const state={...emptyState(),results:[old]};expect(loadState({getItem:()=>JSON.stringify(state)})).toMatchObject({state,issue:null});
  expect(topicRecommendations(old,[...PDF_2021_P1])).toEqual([]);
  expect(notebookQuestions([...PDF_2021_P1],[old])[0]).toEqual(q);
  const current=closeSection(createSession([q],[{moduleId:'p1',questionIds:[q.id],limitSeconds:null}],'practice',1000),2000).result!;
  const rows=topicRecommendations(current,[...PDF_2021_P1]);expect(rows).toHaveLength(1);expect(rows[0].fresh.length).toBeGreaterThan(0);expect(rows[0].fresh.every(candidate=>candidate.external&&candidate.topic.id==='geometry')).toBe(true);
 });
 it('reuses the assembly gates in PDF mode without publishing draft question text',()=>{
  const dir=mkdtempSync(join(tmpdir(),'tmua-pdf-assembly-'));
  try{
   const input=join(dir,'draft.json'),output=join(dir,'reviewed.json');
   const drafts=PDF_2021_P1.map((q,i)=>({number:i+1,reviewed:true,answer:String.fromCharCode(65+q.correctIndex),topic:q.topic.id,subtopic:[q.subtopic.id,q.subtopic.name.zh,q.subtopic.name.en],difficulty:q.difficulty,prompt:'not published in PDF mode',options:['not published','either'],steps:q.explanation.zh.steps.map((s,j)=>[s,q.explanation.en.steps[j]]),pitfall:[q.explanation.zh.pitfall,q.explanation.en.pitfall]}));
   const run=()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/assemble-native-paper.ts','2021','p1',input,output,'--pdf'],{stdio:'pipe'});
   writeFileSync(input,JSON.stringify(drafts));run();expect(JSON.parse(readFileSync(output,'utf8'))).toEqual(PDF_2021_P1);
   drafts[0].answer='A';writeFileSync(input,JSON.stringify(drafts));writeFileSync(output,'keep old reviewed content');expect(run).toThrow();expect(readFileSync(output,'utf8')).toBe('keep old reviewed content');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
 it('keeps both complete papers on separate 75-minute clocks and marks from the original keys',()=>{
  const plan=pastPaperPlan(2021,'both',true);expect(plan.sections.map(s=>s.limitSeconds)).toEqual([4500,4500]);
  let session=createSession(plan.questions,plan.sections,'mock',1000);
  session={...session,answers:Object.fromEntries(plan.questions.map(q=>[q.id,q.correctIndex]))};
  const first=closeSection(session,11_000).active!;
  const second=startNextSection(first,50_000);
  const result=closeSection(second,60_000).result!;
  expect(summary(result)).toMatchObject({correct:40,total:40,accuracy:100});expect(result.elapsedSeconds).toBe(20);
  expect(loadState({getItem:()=>JSON.stringify({...emptyState(),results:[result]})}).issue).toBeNull();
 });
});
