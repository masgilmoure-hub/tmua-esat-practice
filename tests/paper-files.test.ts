import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { questionNumbers } from '../src/paperFiles';
import { PAST_PAPERS } from '../src/data/pastPapers';
import { LOCAL_PAPERS } from '../src/localPapers';

describe('user-provided original papers', () => {
  it('contains exactly the verified 16 paper and 16 solution files with 320 complete page references', () => {
    expect(LOCAL_PAPERS).toHaveLength(16);
    for (const local of LOCAL_PAPERS) {
      const official = PAST_PAPERS.find(p => p.id === local.id)!;
      const hash = (file: string) => createHash('sha256').update(readFileSync(`public/papers/${file}`)).digest('hex');
      expect(hash(local.paperFile)).toBe(official.paperSha256);
      expect(hash(local.workedFile)).toBe(official.workedAnswersSha256);
      expect(Object.keys(local.pages).length).toBe(20);
      expect(Object.values(local.pages).every(page => page >= 1 && page <= local.pageCount)).toBe(true);
    }
    const old = LOCAL_PAPERS.find(p => p.id === 'tmua-2016-p1')!;
    expect(old.pages['1']).toBe(3); expect(old.pages['2']).toBe(3); expect(old.pages['20']).toBe(14);
  });
  it('maps the old PDF digit encoding and adjacent split numbers while excluding page footers and maths in the middle', () => {
    const item = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });
    const items = [item('ͳ', 40, 700), item('Ͳ', 47, 700), item('Evaluate', 75, 700), item('2', 290, 400), item('12', 40, 20)];
    expect(questionNumbers(items, 600, 800)).toEqual([10]);
  });
});
