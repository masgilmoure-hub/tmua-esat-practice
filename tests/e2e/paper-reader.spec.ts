import { test, expect, type Page } from '@playwright/test';
const errors = new WeakMap<Page, string[]>();
async function startPaper(page: Page, year = '2022') {
  await page.getByRole('navigation').getByRole('button', { name: '官方历年卷', exact: true }).click();
  await page.getByLabel('原卷年份', { exact: true }).selectOption(year);
  await page.getByLabel('练习试卷', { exact: true }).selectOption('p1');
  await page.getByLabel('按每卷 75 分钟限时', { exact: true }).uncheck();
  await page.getByLabel('我能打开所选官方原卷，已准备好开始。', { exact: true }).check();
  await page.getByRole('button', { name: '开始原卷答题卡', exact: true }).click();
  await ready(page);
}
async function ready(page: Page) {
  await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('.reader-file')).toContainText('与已核实官方原卷一致');
}
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.goto('/');
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('the question bank has 320 official entries and an individual question renders locally before marking', async ({ page }) => {
  await page.getByRole('group', { name: '来源', exact: true }).getByRole('button', { name: '官方公开材料', exact: true }).click();
  await expect(page.getByText('找到 320 道题', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '练习 ARCHIVE-TMUA-2016-P1-Q01', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('3');
  await page.getByRole('radio').nth(7).check();
  await page.locator('.navigator-panel').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '交卷并查看结果', exact: true }).click();
  await expect(page.locator('.result-stats')).toContainText('1 / 1');
  await expect(page.getByRole('link', { name: '官方英文详解', exact: true })).toHaveAttribute('href', /papers\/tmua-2016-p1-worked\.pdf$/);
});

test('question navigation, uploaded PDF persistence, manual page mapping, removal and original fallback work', async ({ page }) => {
  await startPaper(page);
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('3');
  await page.getByRole('button', { name: '第 20 题，未答', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('22');
  await page.getByLabel('上传本地原卷 PDF（最大 20 MB）', { exact: true }).setInputFiles('public/papers/tmua-2022-p1-paper.pdf');
  await ready(page);
  await page.getByRole('spinbutton', { name: 'PDF 页码', exact: true }).fill('21');
  await page.getByRole('button', { name: '将当前页设为本题位置', exact: true }).click();
  await page.getByRole('radio').nth(5).check();
  await page.reload();
  await ready(page);
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('21');
  await expect(page.getByRole('radio').nth(5)).toBeChecked();
  await page.getByRole('button', { name: '移除此卷本地 PDF', exact: true }).click();
  await page.getByRole('button', { name: '确认移除 PDF', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('22');
  await expect(page.getByRole('radio').nth(5)).toBeChecked();
});

test('invalid uploads preserve the existing paper and page controls remain readable on mobile', async ({ page }) => {
  await startPaper(page);
  await page.getByLabel('上传本地原卷 PDF（最大 20 MB）', { exact: true }).setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
  await expect(page.locator('.paper-reader').getByRole('alert')).toContainText('无法读取此 PDF');
  await ready(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'PDF 下一页', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('4');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: '/tmp/tmua-reader-mobile.png', fullPage: true });
});

test('all 14 remaining PDF answer-sheet papers render their first and last question pages', async ({ page }) => {
  test.setTimeout(120_000);
  for (let year = 2016; year <= 2023; year++) for (const paper of ['p1', 'p2']) {
    if (year === 2023) continue;
    await page.getByRole('navigation').getByRole('button', { name: '官方历年卷', exact: true }).click();
    await page.getByLabel('原卷年份', { exact: true }).selectOption(String(year));
    await page.getByLabel('练习试卷', { exact: true }).selectOption(paper);
    await page.getByLabel('按每卷 75 分钟限时', { exact: true }).uncheck();
    await page.getByLabel('我能打开所选官方原卷，已准备好开始。', { exact: true }).check();
    await page.getByRole('button', { name: '开始原卷答题卡', exact: true }).click();
    if (year !== 2016 || paper !== 'p1') await page.getByRole('button', { name: '替换并开始', exact: true }).click();
    await ready(page);
    await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue('3');
    await page.getByRole('button', { name: '第 20 题，未答', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'PDF 页码', exact: true })).toHaveValue(year === 2016 ? paper === 'p1' ? '14' : '19' : '22');
    await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('data-rendered', 'true');
    expect(await page.locator('.reader-canvas canvas').evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 256) if (pixels[i] < 220 && pixels[i + 3] > 0) ink++;
      return ink;
    })).toBeGreaterThan(20);
  }
});

test('blocked PDF storage still permits the bundled paper and reports unsaved uploads', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: { open() { throw new DOMException('Blocked', 'SecurityError'); } } });
  });
  await page.reload();
  await startPaper(page);
  await expect(page.locator('.paper-reader').getByRole('alert')).toContainText('原数据已保留');
  await page.getByLabel('上传本地原卷 PDF（最大 20 MB）', { exact: true }).setInputFiles('public/papers/tmua-2022-p1-paper.pdf');
  await ready(page);
  await expect(page.locator('.paper-reader').getByRole('alert')).toContainText('PDF 未能保存');
});
