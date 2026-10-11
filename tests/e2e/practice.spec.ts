import { test, expect, type Page } from '@playwright/test';

const storageKey = 'tmua-esat-practice:v1';
const consoleErrors = new WeakMap<Page, string[]>();
const submit = async (page: Page, mock = false) => {
  const label = mock ? '提交本卷 / 模块' : '交卷并查看结果';
  await page.locator('.navigator-panel').getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
};
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page)).toEqual([]);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
});

test('loads without console errors and all six filters plus language toggle work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.reload();
  await expect(page).toHaveTitle('TMUA / ESAT · Practice');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('把练习，做得更有方向。');
  await expect(page.getByText('找到 6 道示例题')).toBeVisible();
  await page.getByRole('group', { name: '试卷 / 科目', exact: true }).getByRole('button', { name: 'Paper 1', exact: true }).click();
  await expect(page.getByText('找到 3 道示例题')).toBeVisible();
  await page.getByRole('group', { name: '知识点', exact: true }).getByRole('button', { name: '代数', exact: true }).click();
  await page.getByRole('group', { name: '细分考点', exact: true }).getByRole('button', { name: '二次方程', exact: true }).click();
  await page.getByRole('group', { name: '做题状态', exact: true }).getByRole('button', { name: '未做', exact: true }).click();
  await expect(page.getByText('找到 1 道示例题')).toBeVisible();
  await page.getByRole('group', { name: '来源', exact: true }).getByRole('button', { name: '官方公开材料（待导入）', exact: true }).click();
  await expect(page.getByText('没有符合条件的题目')).toBeVisible();
  await expect(page.getByRole('button', { name: '开始训练', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  await page.getByRole('group', { name: '考试', exact: true }).getByRole('button', { name: 'ESAT', exact: true }).click();
  await expect(page.getByText('找到 15 道示例题')).toBeVisible();
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.locator('.pagination')).toContainText('2 / 3');
  await page.getByRole('button', { name: 'Switch language to English', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Give your practice a clear direction.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('15 demo questions found')).toBeVisible();
  expect(errors).toEqual([]);
});

test('single question answers, flags, explanation languages, result record and reload work', async ({ page }) => {
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await expect(page.locator('.answer-prompt')).toHaveText('The roots of x² − 5x + 6 = 0 are a and b. What is a² + b²?');
  await expect(page.getByText('完整解析 / Explanation')).toHaveCount(0);
  await page.getByRole('radio').nth(2).check();
  await page.getByRole('button', { name: '标记待检查', exact: true }).click();
  await expect(page.getByRole('button', { name: '已标记待检查', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('radio').nth(2)).toBeChecked();
  await expect(page.getByRole('button', { name: '已标记待检查', exact: true })).toBeVisible();
  await submit(page);
  await expect(page.locator('.result-stats')).toContainText('1 / 1');
  await expect(page.locator('.result-stats')).toContainText('100%');
  await expect(page.getByText('完整解析 / Explanation')).toBeVisible();
  await expect(page.locator('.pitfall')).toContainText('平方和不等于和的平方');
  await page.getByLabel('解析语言', { exact: true }).selectOption('en');
  await expect(page.locator('.explanation-steps')).toContainText('By Vieta’s formulas');
  await expect(page.locator('.explanation-steps')).not.toContainText('由韦达定理');
  await page.getByLabel('解析语言', { exact: true }).selectOption('zh');
  await expect(page.locator('.explanation-steps')).toContainText('由韦达定理');
  await expect(page.locator('.explanation-steps')).not.toContainText('By Vieta’s formulas');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await expect(page.locator('.records-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: '查看结果', exact: true }).click();
  await expect(page.locator('.result-stats')).toContainText('100%');
});

test('training honours question count, navigation and unanswered statistics', async ({ page }) => {
  await page.getByLabel('题目数量', { exact: true }).selectOption('3');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(5);
  await expect(page.getByText('Question 1 of 3', { exact: true })).toBeVisible();
  await page.getByRole('radio').nth(0).check();
  await page.getByRole('button', { name: '下一题', exact: true }).click();
  await expect(page.getByText('Question 2 of 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '上一题', exact: true }).click();
  await expect(page.getByRole('radio').nth(0)).toBeChecked();
  await page.getByRole('button', { name: '第 3 题，未答', exact: true }).click();
  await expect(page.getByText('Question 3 of 3', { exact: true })).toBeVisible();
  await submit(page);
  await expect(page.locator('.result-stats > div').nth(3).locator('strong')).toHaveText('2');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(state.results[0].questions).toHaveLength(3);
  expect(new Set(state.results[0].questions.map((q: { id: string }) => q.id)).size).toBe(3);
});

test('wrong answer enters notebook, correct retry removes it and status filters reflect latest submission', async ({ page }) => {
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await page.getByRole('radio').nth(0).check();
  await submit(page);
  await expect(page.locator('.result-stats')).toContainText('0%');
  await page.getByRole('navigation').getByRole('button', { name: '题库', exact: true }).click();
  await page.getByRole('group', { name: '做题状态', exact: true }).getByRole('button', { name: '错题', exact: true }).click();
  await expect(page.getByText('找到 1 道示例题')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: /^错题本/ }).click();
  await expect(page.locator('.mistake-row')).toHaveCount(1);
  await page.getByRole('button', { name: '重练', exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  await submit(page);
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: /^错题本/ }).click();
  await expect(page.getByText('暂无错题', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: '题库', exact: true }).click();
  await expect(page.getByText('找到 0 道示例题')).toBeVisible();
  await page.getByRole('group', { name: '做题状态', exact: true }).getByRole('button', { name: '已做', exact: true }).click();
  await expect(page.getByText('找到 1 道示例题')).toBeVisible();
});

test('timed practice resumes absolute countdown and automatically submits once', async ({ page }) => {
  await page.clock.install();
  await page.getByLabel('题目数量', { exact: true }).selectOption('1');
  await page.getByLabel('限时训练', { exact: true }).check();
  await page.getByLabel('时间（分钟）', { exact: true }).fill('1');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await expect(page.getByRole('timer')).toContainText('01:00');
  await page.clock.fastForward(20_000);
  await expect(page.getByRole('timer')).toContainText('00:40');
  await page.getByRole('navigation').getByRole('button', { name: '题库', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续练习', exact: true })).toBeVisible();
  await page.clock.fastForward(41_000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('每一次复盘，都是进步。');
  await expect(page.locator('.result-stats')).toContainText('01:00');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(state.active).toBeNull();
  expect(state.results).toHaveLength(1);
  expect(state.results[0].expiredSections).toEqual([0]);
  expect(state.results[0].questions).toHaveLength(1);
});

test('expired saved set is submitted after reload without resetting the deadline', async ({ page }) => {
  await page.getByLabel('限时训练', { exact: true }).check();
  await page.getByLabel('时间（分钟）', { exact: true }).fill('1');
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.active.sectionStartedAt = Date.now() - 70_000;
    state.active.startedAt = state.active.sectionStartedAt;
    localStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  await page.reload();
  await expect(page.locator('.result-stats')).toContainText('01:00');
  await expect(page.locator('.result-stats > div').nth(3).locator('strong')).toHaveText('3');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(state.results).toHaveLength(1);
});

test('TMUA shortened mock locks paper one and starts a fresh timer for paper two', async ({ page }) => {
  await page.clock.install();
  await page.getByRole('navigation').getByRole('button', { name: '示例模考', exact: true }).click();
  await expect(page.locator('.mock-section-row')).toHaveCount(2);
  await page.getByRole('button', { name: '开始缩短版示例模考', exact: true }).click();
  await expect(page.getByRole('timer')).toContainText('11:15');
  await page.getByRole('radio').nth(2).check();
  await page.clock.fastForward(5_000);
  await submit(page, true);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('本卷 / 模块已提交');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.clock.fastForward(30_000);
  await page.getByRole('button', { name: '开始下一部分', exact: true }).click();
  await expect(page.locator('.session-bar')).toContainText('Paper 2');
  await expect(page.getByRole('timer')).toContainText('11:15');
  await expect(page.getByRole('button', { name: '上一题', exact: true })).toBeDisabled();
  await page.clock.fastForward(3_000);
  await submit(page, true);
  await expect(page.locator('.section-results tbody tr')).toHaveCount(2);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(state.results[0].questions).toHaveLength(6);
  expect(state.results[0].elapsedSeconds).toBe(8);
  expect(state.results[0].sectionElapsed).toEqual([5, 3]);
});

test('ESAT chosen modules are independent, Mathematics 1 is required, timeout leads to next module', async ({ page }) => {
  await page.clock.install();
  await page.getByRole('navigation').getByRole('button', { name: '示例模考', exact: true }).click();
  await page.getByRole('group', { name: '考试', exact: true }).getByRole('button', { name: 'ESAT', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Mathematics 1/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Mathematics 2', exact: true }).uncheck();
  await expect(page.locator('.mock-section-row')).toHaveCount(2);
  await page.getByRole('button', { name: '开始缩短版示例模考', exact: true }).click();
  await expect(page.getByRole('timer')).toContainText('04:26');
  await page.clock.fastForward(267_000);
  await expect(page.getByText('上一部分时间已到，已自动提交；未答题按未答记录。')).toBeVisible();
  await page.getByRole('button', { name: '开始下一部分', exact: true }).click();
  await expect(page.locator('.session-bar')).toContainText('Physics');
  await expect(page.getByRole('timer')).toContainText('04:26');
  await submit(page, true);
  await expect(page.locator('.section-results tbody tr')).toHaveCount(2);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(state.results[0].sections.map((s: { moduleId: string }) => s.moduleId)).toEqual(['m1', 'physics']);
  expect(state.results[0].sectionElapsed[0]).toBe(266);
});

test('replacing an unfinished set and clearing local data both require confirmation', async ({ page }) => {
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  await page.getByRole('navigation').getByRole('button', { name: '题库', exact: true }).click();
  await page.getByRole('button', { name: '练习 TMUA-P1-002', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('替换未完成的练习？');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '继续练习', exact: true }).click();
  await expect(page.getByRole('radio').nth(2)).toBeChecked();
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: '清空本地数据', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续练习', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '清空本地数据', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续练习', exact: true })).toHaveCount(0);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(state.active).toBeNull(); expect(state.results).toEqual([]);
});

test('invalid local records are preserved and user can explicitly reset storage', async ({ page }) => {
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('本地记录格式无法读取');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('{broken');
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await expect(page.locator('.autosave-note')).toContainText('仅在此页面内保留');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('{broken');
  await page.getByRole('navigation').getByRole('button', { name: '练习记录', exact: true }).click();
  await page.getByRole('button', { name: '清空本地数据', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('mobile bank and answer screen are readable with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  await expect(page.getByRole('radio').nth(2)).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Switch language to English', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Focused practice');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('storage write failures are visible while answering and submitting still work in memory', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'tmua-esat-practice:v1') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('浏览器存储不可用或已满');
  await page.getByRole('button', { name: '练习 TMUA-P1-001', exact: true }).click();
  await page.getByRole('radio').nth(2).check();
  await expect(page.locator('.autosave-note')).toContainText('请勿刷新');
  await submit(page);
  await expect(page.locator('.result-stats')).toContainText('100%');
  await expect(page.getByRole('alert')).toBeVisible();
});
