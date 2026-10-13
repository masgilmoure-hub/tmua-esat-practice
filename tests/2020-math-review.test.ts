import { describe, it, expect } from 'vitest';
import { PDF_2020_P1, PDF_2020_P2 } from '../src/data/pastPapers';

describe('independent checks for subtle 2020 content',()=>{
 it('finds the c=0 intersections omitted by the original Paper 1 question 17 options',()=>{
  for(const m of [0.25,0.5,1,2,4]){
   const roots=[0,1/(m*m)];expect(new Set(roots).size).toBe(2);
   for(const x of roots)expect(m*x).toBeCloseTo(Math.sqrt(x));
  }
  // The grading key remains official A, while the authored review flags its boundary omission.
  expect(PDF_2020_P1[16].correctIndex).toBe(0);
  expect(PDF_2020_P1[16].explanation.zh.steps.join(' ')).toContain('边界补充');
 });
 it('checks every truth-teller configuration of the original 3 by 3 grid',()=>{
  const neighbours=Array.from({length:9},(_,i)=>Array.from({length:9},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)===1));
  const counts:number[]=[];
  for(let mask=0;mask<512;mask++){
   const truthful=(i:number)=>(mask&(1<<i))!==0;
   if(neighbours.every((list,i)=>truthful(i)===list.every(j=>!truthful(j))))counts.push(Array.from({length:9},(_,i)=>i).filter(truthful).length);
  }
  expect([...new Set(counts)].sort()).toEqual([3,4,5]);
  expect(PDF_2020_P2[18].correctIndex).toBe(4); // Original E: 3 minimum, 5 maximum.
 });
 it('distinguishes the pointwise ambiguity from the official global-function interpretation in Paper 2 question 20',()=>{
  const implies=(p:boolean,q:boolean)=>!p||q;
  const assertions=(x:number,y:number)=>[implies(x>=0,y<0),implies(y>=0,x<0),implies(x>=0,y>=0),implies(x<0,y<0),implies(y>=0,x>=0),(y>=0)===(x<0)];
  for(const x of [-1,1])for(const y of [-1,1])expect(assertions(x,y).filter(Boolean).length).not.toBe(1);
  const global=Array.from({length:6},(_,i)=>[-1,0,1].every(x=>assertions(x,Math.abs(x))[i]));
  expect(global).toEqual([false,false,true,false,false,false]);
  expect(PDF_2020_P2[19].correctIndex).toBe(2); // Official C, global reading.
 });
});
