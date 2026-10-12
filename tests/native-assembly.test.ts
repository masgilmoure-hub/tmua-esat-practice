import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { NATIVE_2022_P1 } from '../src/data/pastPapers';
function draft() { return NATIVE_2022_P1.map((q,i)=>({number:i+1,reviewed:true,answer:String.fromCharCode(65+q.correctIndex),topic:q.topic.id,subtopic:[q.subtopic.id,q.subtopic.name.zh,q.subtopic.name.en],prompt:q.prompt,options:q.options,difficulty:q.difficulty,diagram:q.diagram,steps:q.explanation.zh.steps.map((s,j)=>[s,q.explanation.en.steps[j]]),pitfall:[q.explanation.zh.pitfall,q.explanation.en.pitfall]})); }
describe('reviewed-paper assembly gate',()=>{
 it('assembles a complete reviewed paper with stable provenance',()=>{
  const dir=mkdtempSync(join(tmpdir(),'tmua-assembly-'));
  try {
   const input=join(dir,'drafts.json'),output=join(dir,'paper.json');writeFileSync(input,JSON.stringify(draft()));
   execFileSync(process.execPath,['--experimental-strip-types','scripts/assemble-native-paper.ts','2022','p1',input,output],{stdio:'pipe'});
   expect(JSON.parse(readFileSync(output,'utf8'))).toEqual(NATIVE_2022_P1);
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
 it('rejects unreconciled answers, unreviewed drafts and broken math without replacing previous output',()=>{
  const dir=mkdtempSync(join(tmpdir(),'tmua-assembly-'));
  try {
   const input=join(dir,'drafts.json'),output=join(dir,'paper.json');
   for(const change of [(d:ReturnType<typeof draft>)=>{d[0].answer='A';},(d:ReturnType<typeof draft>)=>{d[0].reviewed=false;},(d:ReturnType<typeof draft>)=>{d[0].prompt='$\\unknowncommand{a}$';},(d:ReturnType<typeof draft>)=>{d[3].diagram={path:'question-images/nonexistent.png',alt:'Missing diagram'};}]){
    const d=draft();change(d);writeFileSync(input,JSON.stringify(d));writeFileSync(output,'preserve previous validated paper');
    expect(()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/assemble-native-paper.ts','2022','p1',input,output],{stdio:'pipe'})).toThrow();
    expect(readFileSync(output,'utf8')).toBe('preserve previous validated paper');
   }
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
