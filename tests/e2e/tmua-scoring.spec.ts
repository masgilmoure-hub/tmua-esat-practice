import { test, expect, type Page } from '@playwright/test';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', e => messages.push(e.message));
  page.on('console', m => { if (m.type() === 'error') messages.push(m.text()); });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: '历年真题', exact: true }).click();
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.locator('.math-error,.katex-error,vite-error-overlay')).toHaveCount(0);
});
async function submit(page: Page) {
  await page.locator('.answer-footer').getByRole('button', { name: '提交本卷 / 模块', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '提交本卷 / 模块', exact: true }).click();
}

test('past-paper entry has no readiness gate and remains usable in the annotated viewport', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 764 });
  await expect(page).toHaveTitle('TMUA / ESAT · Practice');
  await expect(page.getByRole('navigation').getByRole('button', { name: '历年真题', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.archive-panel .import-confirm')).toHaveCount(0);
  await expect(page.locator('.archive-panel').getByRole('checkbox')).toHaveCount(1); // Only the timer switch.
  await expect(page.getByRole('button', { name: '开始真题整卷练习', exact: true })).toBeEnabled();
  await page.getByLabel('原卷年份', { exact: true }).selectOption('2018');
  await page.getByLabel('练习试卷', { exact: true }).selectOption('p2');
  await expect(page.getByRole('button', { name: '开始原卷答题卡', exact: true })).toBeEnabled();
  await expect(page.locator('.archive-info')).toContainText('不取单卷分数平均');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/tmua-past-paper-setup-667.png', fullPage: true });
  await page.getByRole('button', { name: '开始原卷答题卡', exact: true }).click();
  await expect(page.getByRole('timer')).toContainText('75:00');
});

test('2023 full-paper score uses 20/40 -> 6.2, not the average of single-paper grades', async ({ page }) => {
  await page.getByRole('button', { name: '开始真题整卷练习', exact: true }).click();
  const keys = 'FACCFEFBEBBFFAFEEEDF';
  for (let i = 0; i < 20; i++) { await page.locator('.question-number').nth(i).click(); await page.getByRole('radio').nth(keys.charCodeAt(i) - 65).check(); }
  await submit(page);
  await expect(page.locator('.tmua-score-card')).toHaveCount(0);
  await page.getByRole('button', { name: '开始下一部分', exact: true }).click();
  await page.locator('.question-number').last().click(); await submit(page);
  await expect(page.locator('.result-stats')).toContainText('20 / 40');
  const card = page.getByRole('region', { name: '预估分数', exact: true });
  await expect(card.locator('.tmua-score-value strong')).toHaveText('6.2');
  await expect(card).toContainText('6.0–6.5'); await expect(card).toContainText('两卷总分');
  await expect(card.getByRole('link', { name: '官方回函与换算表', exact: true })).toHaveAttribute('href', 'https://www.whatdotheyknow.com/request/tmua_score_conversion_2023');
  await page.screenshot({ path: '/tmp/tmua-score-desktop.png' });
  await page.getByRole('button', { name: 'Switch language to English', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Estimated score', exact: true })).toContainText('not a prediction confidence interval');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Records', exact: true }).click();
  await page.getByRole('button', { name: 'View results', exact: true }).click();
  await expect(page.locator('.tmua-score-value strong')).toHaveText('6.2');
});

test('mobile untimed single-paper score is labelled Paper 2 and partial focused retries have no score', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('原卷年份', { exact: true }).selectOption('2018');
  await page.getByLabel('练习试卷', { exact: true }).selectOption('p2');
  await page.getByLabel('按每卷 75 分钟限时', { exact: true }).uncheck();
  await page.getByRole('button', { name: '开始原卷答题卡', exact: true }).click();
  const keys = 'CBFDACBDFBA';
  for (let i = 0; i < 11; i++) { await page.locator('.question-number').nth(i).click(); await page.getByRole('radio').nth(keys.charCodeAt(i) - 65).check(); }
  await page.locator('.question-number').last().click(); await submit(page);
  await expect(page.locator('.result-stats')).toContainText('11 / 20');
  await expect(page.locator('.tmua-score-value strong')).toHaveText('6.5');
  await expect(page.locator('.tmua-score-card')).toContainText('Paper 2');
  await expect(page.locator('.tmua-score-card')).toContainText('本次不限时');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: '/tmp/tmua-score-mobile.png' });
  await page.getByRole('button', { name: '练习本次错题', exact: true }).click();
  await page.locator('.question-number').last().click();
  await page.locator('.answer-footer').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await expect(page.locator('.tmua-score-card')).toHaveCount(0);
});
