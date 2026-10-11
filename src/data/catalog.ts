import type { Bilingual, Exam, ModuleId } from '../types';

export const MODULES: { id: ModuleId; exam: Exam; name: Bilingual; questions: number; minutes: number }[] = [
  { id: 'p1', exam: 'TMUA', name: { zh: 'Paper 1 · 数学应用', en: 'Paper 1 · Applications' }, questions: 20, minutes: 75 },
  { id: 'p2', exam: 'TMUA', name: { zh: 'Paper 2 · 数学推理', en: 'Paper 2 · Reasoning' }, questions: 20, minutes: 75 },
  { id: 'm1', exam: 'ESAT', name: { zh: 'Mathematics 1', en: 'Mathematics 1' }, questions: 27, minutes: 40 },
  { id: 'm2', exam: 'ESAT', name: { zh: 'Mathematics 2', en: 'Mathematics 2' }, questions: 27, minutes: 40 },
  { id: 'biology', exam: 'ESAT', name: { zh: 'Biology · 生物', en: 'Biology' }, questions: 27, minutes: 40 },
  { id: 'chemistry', exam: 'ESAT', name: { zh: 'Chemistry · 化学', en: 'Chemistry' }, questions: 27, minutes: 40 },
  { id: 'physics', exam: 'ESAT', name: { zh: 'Physics · 物理', en: 'Physics' }, questions: 27, minutes: 40 },
];
export const moduleInfo = (id: ModuleId) => MODULES.find(m => m.id === id)!;
export const OFFICIAL_LINKS = {
  TMUA: 'https://esat-tmua.ac.uk/about-the-tests/tmua-test/',
  ESAT: 'https://esat-tmua.ac.uk/about-the-tests/esat-test/',
};
// Structure and current linked specifications checked on 2026-10-11.
// See docs/exam-rules.md. The demo does not cover the full specification.
export const RULES_VERIFIED = true;

export const TOPICS: Record<string, Bilingual> = {
  algebra: { zh: '代数', en: 'Algebra' },
  functions: { zh: '函数', en: 'Functions' },
  geometry: { zh: '几何', en: 'Geometry' },
  reasoning: { zh: '逻辑与证明', en: 'Logic & proof' },
  probability: { zh: '概率', en: 'Probability' },
  cells: { zh: '细胞生物学', en: 'Cell biology' },
  genetics: { zh: '遗传', en: 'Genetics' },
  ecology: { zh: '生态', en: 'Ecology' },
  quantities: { zh: '物质的量', en: 'Amount of substance' },
  bonding: { zh: '化学键', en: 'Bonding' },
  acids: { zh: '酸碱', en: 'Acids & bases' },
  mechanics: { zh: '力学', en: 'Mechanics' },
  electricity: { zh: '电学', en: 'Electricity' },
  waves: { zh: '波', en: 'Waves' },
};
