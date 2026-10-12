import { test, expect, type Page } from '@playwright/test';
const recordKey = 'tmua-esat-practice:v1';
const errors = new WeakMap<Page, string[]>();
async function openArchive(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: '官方历年卷', exact: true }).click();
}
async function start(page: Page) {
  await page.getByLabel('我能打开所选官方原卷，已准备好开始。', { exact: true }).check();
  await page.getByRole('button', { name: '开始原卷答题卡', exact: true }).click();
}
async function submit(page: Page) {
  await page.locator('.navigator-panel').getByRole('button', { name: '提交本卷 / 模块', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '提交本卷 / 模块', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
});
test('year selection, original PDF links, two 75-minute papers, reload, marking and records work', async ({ page }) => {
  await page.clock.install();
  await page.getByRole('button', { name: '打开官方历年卷', exact: true }).click();
  await expect(page).toHaveTitle('TMUA / ESAT · Practice');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('用官方原卷，认真练一次。');
  await expect(page.getByLabel('原卷年份', { exact: true }).locator('option')).toHaveCount(8);
  await expect(page.getByRole('button', { name: '开始原卷答题卡', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: '打开官方原卷', exact: true }).first()).toHaveAttribute('href', /TMUA-2023-paper-1\.pdf$/);
  await expect(page.getByRole('link', { name: '官方英文详解', exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/tmua-papers-desktop.png', fullPage: true });
  await start(page);
  await expect(page.getByRole('timer')).toContainText('75:00');
  await expect(page.locator('.question-number')).toHaveCount(20);
  await expect(page.getByRole('radio')).toHaveCount(8);
  await expect(page.locator('.answer-prompt')).toContainText('Read question 1 in the official TMUA 2023 Paper 1');
  await expect(page.getByRole('link', { name: '打开原卷 · 第 1 题', exact: true })).toHaveAttribute('target', '_blank');
  await page.getByRole('radio').nth(5).check(); // Official key: 2023 Paper 1 question 1 = F.
  await page.getByRole('button', { name: '标记待检查', exact: true }).click();
  await page.clock.fastForward(5000);
  await page.reload();
  await expect(page.getByRole('radio').nth(5)).toBeChecked();
  await expect(page.getByRole('button', { name: '已标记待检查', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toContainText('74:55');
  await submit(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('本卷 / 模块已提交');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.locator('.transition-panel')).toContainText('20 道原卷题目 · 限时 75:00');
  await page.clock.fastForward(30000);
  await page.getByRole('button', { name: '开始下一部分', exact: true }).click();
  await expect(page.getByRole('timer')).toContainText('75:00');
  await page.getByRole('radio').nth(7).check(); // Official key: 2023 Paper 2 question 1 = H.
  await submit(page);
  await expect(page.locator('.result-stats > div').nth(0)).toContainText('2 / 40');
  await expect(page.locator('.result-stats > div').nth(1)).toContainText('5%');
  await expect(page.locator('.result-stats > div').nth(2)).toContainText('00:05');
  await expect(page.locator('.result-stats > div').nth(3)).toContainText('38');
  await expect(page.locator('.section-results tbody tr')).toHaveCount(2);
  await expect(page.getByLabel('解析语言', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '知识点表现', exact: true })).toHaveCount(0);
  await expect(page.locator('.linked-review').first()).toContainText('尚未提供本题的双语解析');
  await expect(page.getByRole('link', { name: '官方英文详解', exact: true }).first()).toHaveAttribute('href', /tmua-2023-p1-worked\.pdf$/);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await expect(page.locator('.records-table')).toContainText('官方历年原卷练习');
  await page.getByRole('button', { name: '查看结果', exact: true }).click();
  await expect(page.locator('.result-stats')).toContainText('2 / 40');
});
test('single paper can be untimed and past-paper mistakes remain retryable', async ({ page }) => {
  await openArchive(page);
  await page.getByLabel('原卷年份', { exact: true }).selectOption('2018');
  await page.getByLabel('练习试卷', { exact: true }).selectOption('p2');
  await page.getByLabel('按每卷 75 分钟限时', { exact: true }).uncheck();
  await expect(page.getByRole('link', { name: '打开官方原卷', exact: true })).toHaveCount(1);
  await start(page);
  await expect(page.getByRole('timer')).toContainText('已用时间');
  await expect(page.locator('.navigator-bottom')).toContainText('本卷不限时');
  await page.getByRole('radio').nth(2).check(); // Official key: 2018 Paper 2 question 1 = C.
  await submit(page);
  await expect(page.locator('.result-stats')).toContainText('1 / 20');
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: /^错题本/ }).click();
  await expect(page.locator('.mistake-row')).toHaveCount(19);
  await page.locator('.mistake-row').first().getByRole('button', { name: '重练', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('官方原卷专项训练');
  await expect(page.getByRole('link', { name: '打开原卷 · 第 2 题', exact: true })).toHaveAttribute('href', /TMUA-2018-paper-2\.pdf$/);
  await page.getByRole('radio').nth(1).check(); // Official key: 2018 Paper 2 question 2 = B.
  await page.locator('.navigator-panel').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await expect(page.locator('.result-stats')).toContainText('100%');
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: /^错题本/ }).click();
  await expect(page.locator('.mistake-row')).toHaveCount(18);
});
test('full-paper deadlines auto-submit once and keep the next paper timer independent', async ({ page }) => {
  await page.clock.install();
  await openArchive(page);
  await start(page);
  await page.clock.fastForward(4_501_000);
  await expect(page.getByText('上一部分时间已到，已自动提交；未答题按未答记录。')).toBeVisible();
  await page.getByRole('button', { name: '开始下一部分', exact: true }).click();
  await expect(page.getByRole('timer')).toContainText('75:00');
  await page.clock.fastForward(4_501_000);
  await expect(page.locator('.result-stats')).toContainText('0 / 40');
  await expect(page.locator('.result-stats')).toContainText('150:00');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), recordKey);
  expect(state.results).toHaveLength(1); expect(state.active).toBeNull();
  expect(state.results[0].expiredSections).toEqual([0, 1]);
});
test('mobile archive and letter grid fit the viewport and English controls preserve selections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openArchive(page);
  await page.getByLabel('原卷年份', { exact: true }).selectOption('2016');
  await page.getByLabel('练习试卷', { exact: true }).selectOption('p1');
  await page.getByLabel('我能打开所选官方原卷，已准备好开始。', { exact: true }).check();
  await page.getByLabel('原卷年份', { exact: true }).selectOption('2017');
  await expect(page.getByRole('button', { name: '开始原卷答题卡', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Switch language to English', exact: true }).click();
  await expect(page.getByLabel('Paper year', { exact: true })).toHaveValue('2017');
  await expect(page.getByLabel('Papers to practise', { exact: true })).toHaveValue('p1');
  await page.getByLabel('I can open the selected official papers and am ready to begin.', { exact: true }).check();
  await page.getByRole('button', { name: 'Start past-paper answer sheet', exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  await expect(page.getByRole('radio').nth(2)).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const slots = page.locator('.letter-answers .answer-option');
  const first = (await slots.nth(0).boundingBox())!, second = (await slots.nth(1).boundingBox())!, third = (await slots.nth(2).boundingBox())!;
  expect(first.y).toBe(second.y); expect(third.y).toBeGreaterThan(first.y);
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: '/tmp/tmua-papers-mobile.png', fullPage: true });
});
