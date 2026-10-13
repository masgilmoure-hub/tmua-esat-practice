import { describe, it, expect } from 'vitest';
import { PDF_2018_P1, PDF_2018_P2, PDF_2019_P1, PDF_2019_P2 } from '../src/data/pastPapers';

describe('independent mathematical checks for 2018 and 2019 reviews',()=>{
 it('checks all three 2018 radical roots directly against the original equation',()=>{
  for(const x of [1/2,5/8,5/2])expect(4*x*Math.sqrt(2*x-1)).toBeCloseTo(10*x-5);
  expect(PDF_2018_P2[8].correctIndex).toBe(5); // F identifies the lost root at step III.
 });
 it('checks the ambiguous-triangle side lengths and their required area ratio',()=>{
  const cosine=Math.sqrt(17)/5,sine=Math.sqrt(1-cosine*cosine);
  const sides=[Math.sqrt(17),3*Math.sqrt(17)];
  for(const side of sides){expect(100+side*side-20*side*cosine).toBeCloseTo(49);expect(side+7).toBeGreaterThan(10);expect(side).toBeLessThan(17);}
  const areas=sides.map(side=>5*side*sine);expect(areas[1]/areas[0]).toBeCloseTo(3);
  expect(PDF_2018_P1[18].correctIndex).toBe(3);
 });
 it('checks the 2019 trigonometric interval fraction using the original product',()=>{
  let included=0;
  for(let i=0;i<1200;i++){const theta=Math.PI*(i+0.5)/1200;if((Math.sin(2*theta)-0.5)*(Math.sin(theta)-Math.cos(theta))>=0)included++;}
  expect(included/1200).toBe(1/4);expect(PDF_2019_P1[16].correctIndex).toBe(2);
 });
 it('checks the minimum-seat construction and global absolute-inequality boundary',()=>{
  const occupied=new Set(Array.from({length:14},(_,i)=>3*i));
  for(let seat=0;seat<40;seat++)expect(occupied.has(seat)||occupied.has((seat+1)%40)||occupied.has((seat+39)%40)).toBe(true);
  expect(13*3).toBeLessThan(40);expect(PDF_2019_P2[8].correctIndex).toBe(3);
  for(const a of [-3,-1,-0.5])for(const x of [-100,-2,0,0.5,1,2,3,100])expect(a*Math.abs(x)+1).toBeLessThanOrEqual(Math.abs(x-2));
  for(const a of [-0.49,0,1])expect(2*a+1).toBeGreaterThan(0);
  expect(PDF_2019_P2[17].correctIndex).toBe(4);
 });
});
