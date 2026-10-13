import { test, expect, type Page } from '@playwright/test';
import { chooseFilter } from './filters';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.locator('vite-error-overlay,.math-error,.katex-error')).toHaveCount(0);
});

test('compact subtopic dropdown searches both languages and applies only the chosen option', async ({ page }) => {
  await expect(page).toHaveTitle('TMUA / ESAT · Practice');
  const input = page.getByRole('combobox', { name: '细分考点', exact: true });
  await expect(input).toHaveValue('全部');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.subtopic-filter').getByRole('option')).toHaveCount(0);
  expect((await page.locator('.subtopic-filter').boundingBox())!.height).toBeLessThan(50);
  expect((await page.locator('.filters').boundingBox())!.height).toBeLessThan(750);
  await page.screenshot({ path: '/tmp/tmua-subtopic-after-desktop.png' });
  const tableTop = (await page.locator('.list-toolbar').boundingBox())!.y;
  await input.fill('combined mean');
  await expect(page.locator('.subtopic-filter').getByRole('option', { name: '交换数据后的加权均值', exact: true })).toBeVisible();
  await expect(page.getByText('找到 326 道题', { exact: true })).toBeVisible();
  expect((await page.locator('.list-toolbar').boundingBox())!.y).toBe(tableTop);
  await page.screenshot({ path: '/tmp/tmua-subtopic-search-desktop.png' });
  await page.locator('.subtopic-filter').getByRole('option', { name: '交换数据后的加权均值', exact: true }).click();
  await expect(input).toHaveValue('交换数据后的加权均值');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('找到 1 道题', { exact: true })).toBeVisible();
  await expect(page.locator('.question-table')).toContainText('ARCHIVE-TMUA-2018-P1-Q17');
  await page.getByRole('button', { name: 'Switch language to English', exact: true }).click();
  const english = page.getByRole('combobox', { name: 'Subtopic', exact: true });
  await expect(english).toHaveValue('A combined mean after exchanging observations');
  await english.fill('交换数据');
  await expect(page.locator('.subtopic-filter').getByRole('option', { name: 'A combined mean after exchanging observations', exact: true })).toBeVisible();
  await english.press('Escape');
  await page.getByRole('button', { name: 'Clear subtopic filter', exact: true }).click();
  await expect(english).toHaveValue('All');
  await expect(page.getByText('326 questions found', { exact: true })).toBeVisible();
});

test('keyboard navigation, unmatched searches, dismissal and dependent resets preserve valid filters', async ({ page }) => {
  await chooseFilter(page, '试卷 / 科目', 'Paper 1');
  await chooseFilter(page, '知识点', '代数');
  const input = page.getByRole('combobox', { name: '细分考点', exact: true });
  await input.focus();
  await expect(page.locator('.subtopic-filter').getByRole('option', { name: '全部', exact: true })).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowDown');
  const active = await input.getAttribute('aria-activedescendant');
  expect(active).toBeTruthy();
  await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('role', 'option');
  await input.fill('二次方程');
  await input.press('Enter');
  await expect(input).toHaveValue('二次方程');
  const before = await page.locator('.list-toolbar strong').innerText();
  await input.fill('zzzz-no-such-subtopic');
  await expect(page.getByRole('status')).toHaveText('没有匹配的考点，请换个关键词。');
  await expect(page.locator('.subtopic-filter').getByRole('option')).toHaveCount(0);
  await input.press('Enter');
  await expect(page.locator('.list-toolbar strong')).toHaveText(before);
  await input.press('Escape');
  await expect(input).toHaveValue('二次方程');
  await input.click();
  await input.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await chooseFilter(page, '年份', '2018');
  await expect(input).toHaveValue('全部');
  await chooseFilter(page, '知识点', '统计');
  await input.fill('交换数据'); await input.press('Enter');
  await expect(page.getByText('找到 1 道题', { exact: true })).toBeVisible();
  await input.click();
  await page.locator('.page-heading').click();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toHaveValue('交换数据后的加权均值');
  await chooseFilter(page, '年份', '2019');
  await expect(input).toHaveValue('全部');
  await expect(page.locator('.subtopic-filter').getByRole('option')).toHaveCount(0);
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await expect(input).toHaveValue('全部');
  await expect(page.getByText('找到 326 道题', { exact: true })).toBeVisible();
});

test.describe('touchscreen subtopic search', () => {
 test.use({ hasTouch: true });
 test('mobile dropdown scrolls long options without overflow and starts the selected focused practice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const input = page.getByRole('combobox', { name: '细分考点', exact: true });
  await input.click();
  const list = page.getByRole('listbox', { name: '细分考点', exact: true });
  expect(await list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await input.fill('cycle');
  await expect(page.locator('.subtopic-filter').getByRole('option', { name: '环形座位的邻接覆盖', exact: true })).toBeVisible();
  const box = (await page.locator('.searchable-filter-popup').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '/tmp/tmua-subtopic-search-mobile.png' });
  await page.locator('.subtopic-filter').getByRole('option', { name: '环形座位的邻接覆盖', exact: true }).tap();
  await expect(input).toHaveValue('环形座位的邻接覆盖');
  await expect(page.getByText('找到 1 道题', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('11');
  await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.getByRole('radio')).toHaveCount(8);
});

});
