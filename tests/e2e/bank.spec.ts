import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import template from '../../examples/local-import-demo.json' with { type: 'json' };
import type { Question } from '../../src/types';
const bankKey = 'tmua-esat-bank:v1';
const recordKey = 'tmua-esat-practice:v1';
const id = template.questions[0].id;
const manager = (page: Page) => page.locator('.bank-manager');
async function openManager(page: Page) {
  if (!await manager(page).evaluate(el => el.hasAttribute('open'))) await manager(page).locator('summary').first().click();
}
async function preview(page: Page, data: unknown = template) {
  await openManager(page);
  await page.getByLabel('或粘贴题库 JSON', { exact: true }).fill(JSON.stringify(data));
  await page.getByRole('button', { name: '校验并预览', exact: true }).click();
}
async function importDemo(page: Page) {
  await preview(page);
  await page.getByLabel('我已复核题干、答案、双语解析和来源说明。', { exact: true }).check();
  await page.getByRole('button', { name: '确认导入到此浏览器', exact: true }).click();
  await expect(manager(page).getByRole('status')).toContainText('已保存 1 道题');
}
async function goBank(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: '题库', exact: true }).click();
}
async function selectImported(page: Page) {
  await page.getByRole('group', { name: '细分考点', exact: true }).getByRole('button', { name: '一次方程', exact: true }).click();
  await page.getByRole('button', { name: `练习 ${id}`, exact: true }).click();
}
async function submit(page: Page) {
  await page.locator('.navigator-panel').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  (page as Page & { errors: string[] }).errors = errors;
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { errors: string[] }).errors).toEqual([]);
});
test('file preview, explicit review, difficulty filtering, language switching, reload and export round-trip', async ({ page }) => {
  await openManager(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载示例模板', exact: true }).click();
  const templateDownload = await downloadEvent;
  expect(JSON.parse(await readFile((await templateDownload.path())!, 'utf8'))).toEqual(template);
  await page.getByLabel('选择 JSON 文件（最大 1 MB）', { exact: true }).setInputFiles('examples/local-import-demo.json');
  await page.getByRole('button', { name: '校验并预览', exact: true }).click();
  await expect(page.getByRole('region', { name: '导入预览', exact: true })).toContainText('DEMO-IMPORT-001');
  await expect(page.getByRole('button', { name: '确认导入到此浏览器', exact: true })).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), bankKey)).toBeNull();
  await manager(page).scrollIntoViewIfNeeded();
  await page.getByLabel('或粘贴题库 JSON', { exact: true }).focus();
  await page.screenshot({ path: '/tmp/tmua-bank-import-desktop.png', fullPage: true });
  await page.getByLabel('我已复核题干、答案、双语解析和来源说明。', { exact: true }).check();
  await page.getByRole('button', { name: '确认导入到此浏览器', exact: true }).click();
  await page.getByRole('button', { name: 'Switch language to English', exact: true }).click();
  await expect(manager(page).getByRole('status')).toContainText('1 questions saved in this browser');
  await page.reload();
  await expect(manager(page).locator('summary')).toContainText('1 imported');
  await page.getByRole('button', { name: '切换到中文', exact: true }).click();
  await page.getByRole('group', { name: '难度', exact: true }).getByRole('button', { name: '基础', exact: true }).click();
  await page.getByRole('group', { name: '细分考点', exact: true }).getByRole('button', { name: '一次方程', exact: true }).click();
  await expect(page.locator('.question-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.question-table')).toContainText('原创导入示例');
  await page.getByRole('group', { name: '难度', exact: true }).getByRole('button', { name: '挑战', exact: true }).click();
  await expect(page.getByRole('button', { name: '开始训练', exact: true })).toBeDisabled();
  await openManager(page);
  const exportEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出已导入题目', exact: true }).click();
  const exported = JSON.parse(await readFile((await (await exportEvent).path())!, 'utf8'));
  expect(exported).toEqual(template);
  await page.getByRole('button', { name: '移除本地导入题', exact: true }).click();
  await page.getByRole('button', { name: '确认移除导入题', exact: true }).click();
  await preview(page, exported);
  await expect(page.getByRole('region', { name: '导入预览', exact: true })).toBeVisible();
});
test('rejects a mixed invalid batch and duplicate provenance without partial changes', async ({ page }) => {
  const invalid = structuredClone(template.questions[0]); invalid.id = 'INVALID'; invalid.correctIndex = 99;
  await preview(page, { schemaVersion: 1, questions: [template.questions[0], invalid] });
  await expect(manager(page).getByRole('alert')).toContainText('第 2 题');
  expect(await page.evaluate(key => localStorage.getItem(key), bankKey)).toBeNull();
  await importDemo(page);
  await preview(page);
  await expect(manager(page).getByRole('alert')).toContainText('重复题目 ID');
  const renamed = { ...template.questions[0], id: 'RENAMED' };
  await preview(page, { schemaVersion: 1, questions: [renamed] });
  await expect(manager(page).getByRole('alert')).toContainText('原始来源与题号重复');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).questions.length, bankKey)).toBe(1);
});
test('a failed storage write adds no questions and corrupted bank data is preserved until explicit reset', async ({ page }) => {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === key) throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, k, v); };
  }, bankKey);
  await preview(page);
  await page.getByLabel('我已复核题干、答案、双语解析和来源说明。', { exact: true }).check();
  await page.getByRole('button', { name: '确认导入到此浏览器', exact: true }).click();
  await expect(manager(page).locator('.import-message')).toContainText('未添加任何题目');
  await expect(manager(page).locator('summary')).toContainText('0 道已导入');
  await page.reload();
  await page.evaluate(key => localStorage.setItem(key, '{broken'), bankKey);
  await page.reload();
  await preview(page);
  await expect(manager(page).getByRole('alert')).toContainText('原数据未覆盖');
  await page.getByLabel('我已复核题干、答案、双语解析和来源说明。', { exact: true }).check();
  await page.getByRole('button', { name: '确认导入到此浏览器', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), bankKey)).toBe('{broken');
  await page.getByRole('button', { name: '移除本地导入题', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), bankKey)).toBe('{broken');
  await page.getByRole('button', { name: '移除本地导入题', exact: true }).click();
  await page.getByRole('button', { name: '确认移除导入题', exact: true }).click();
  await importDemo(page);
});
test('topic recommendation prioritises fresh questions in the same paper and keeps snapshots after import removal', async ({ page }) => {
  await importDemo(page);
  await manager(page).locator('summary').first().click();
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await submit(page);
  await expect(page.locator('.recommendation-panel')).toContainText(/有 \d+ 道同知识点未做题/);
  await page.screenshot({ path: '/tmp/tmua-bank-recommendations.png', fullPage: true });
  await page.getByRole('button', { name: '训练 代数 p1', exact: true }).click();
  const active = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).active, recordKey);
  expect(active.questions.map((q: {id:string}) => q.id)).not.toContain('TMUA-P1-001');
  expect(active.questions).toHaveLength(3);

  expect(active.questions.every((q: { moduleId: string; topic: { id: string } }) => q.moduleId === 'p1' && q.topic.id === 'algebra')).toBe(true);
  await goBank(page);
  await selectImported(page);
  await page.getByRole('button', { name: '替换并开始', exact: true }).click();
  await goBank(page);
  await openManager(page);
  await page.getByRole('button', { name: '移除本地导入题', exact: true }).click();
  await page.getByRole('button', { name: '确认移除导入题', exact: true }).click();
  await page.getByRole('button', { name: '继续练习', exact: true }).click();
  await expect(page.locator('.answer-prompt')).toHaveText(template.questions[0].prompt);
  await submit(page);
  await expect(page.locator('.review-column')).toContainText('Subtract 7');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: /^错题本/ }).click();
  const retired = page.locator('.mistake-row').filter({ hasText: id });
  await expect(retired).toBeVisible();
  await retired.getByRole('button', { name: '重练', exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  await submit(page);
  await expect(page.locator('.recommendation-panel')).toContainText('本次没有错题或未答题');
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: /^错题本/ }).click();
  await expect(page.locator('.mistake-row').filter({ hasText: id })).toHaveCount(0);
});
test('mobile import and validation are usable without overflow; practice clearing retains imported bank', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preview(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('或粘贴题库 JSON', { exact: true }).focus();
  await page.screenshot({ path: '/tmp/tmua-bank-import-mobile.png', fullPage: true });
  await page.getByLabel('我已复核题干、答案、双语解析和来源说明。', { exact: true }).check();
  await page.getByRole('button', { name: '确认导入到此浏览器', exact: true }).click();
  await selectImported(page);
  await submit(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: '清空本地数据', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).questions.length, bankKey)).toBe(1);
  await goBank(page);
  await selectImported(page);
  await expect(page.locator('.answer-prompt')).toHaveText(template.questions[0].prompt);
});
test('declared public-material provenance is displayed throughout practice while demo mocks keep their original bank', async ({ page }) => {
  // Synthetic browser-only fixture tests source rendering; it is not shipped as official content.
  const fixture = structuredClone(template.questions[0]) as Question;
  fixture.source = { ...fixture.source, kind: 'official-public', title: { zh: '测试来源声明（合成题）', en: 'Synthetic provenance fixture' }, url: 'https://esat-tmua.ac.uk/about-the-tests/tmua-test/', originalNumber: 'FIXTURE-1' };
  await preview(page, { schemaVersion: 1, questions: [fixture] });
  await page.getByLabel('我已复核题干、答案、双语解析和来源说明。', { exact: true }).check();
  await page.getByRole('button', { name: '确认导入到此浏览器', exact: true }).click();
  await page.getByRole('group', { name: '来源', exact: true }).getByRole('button', { name: '官方公开材料', exact: true }).click();
  await expect(page.locator('.question-table')).toContainText('PUBLIC MATERIAL');
  await selectImported(page);
  await expect(page.locator('.source-inline')).toContainText('测试来源声明（合成题）');
  await submit(page);
  await expect(page.locator('.page-heading')).toContainText('来源见解析');
  await expect(page.locator('.review-source a')).toHaveAttribute('href', fixture.source.url!);
  await page.getByRole('navigation').getByRole('button', { name: '示例模考', exact: true }).click();
  await expect(page.locator('.mock-start')).toContainText('共 6 道示例题');
});
