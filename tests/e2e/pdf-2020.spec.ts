import { chooseFilter } from './filters';
import { test, expect, type Page } from '@playwright/test';
const errors=new WeakMap<Page,string[]>();
const keys=['CCBDACADCAEDFECCAAEC','EFCGAAHEFFGDDADDEGEC'];
test.beforeEach(async({page})=>{const messages:string[]=[];errors.set(page,messages);page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(m.type()==='error')messages.push(m.text());});await page.goto('/');});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);await expect(page.locator('.math-error,.katex-error,vite-error-overlay')).toHaveCount(0);});
async function rendered(page:Page){await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('data-rendered','true');}
async function submit(page:Page,label='提交本卷 / 模块'){await page.locator('.answer-footer').getByRole('button',{name:label,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();}
test('2020 full papers: all 40 PDF pages and reviewed explanations, independent clocks, official grading and saved results',async({page})=>{
 test.setTimeout(120_000);
 // Fix Date without pausing animation frames needed by PDF.js.
 await page.clock.setFixedTime(new Date('2026-10-13T12:00:00Z'));
 await expect(page).toHaveTitle('TMUA / ESAT · Practice');
 await page.getByRole('navigation').getByRole('button',{name:'历年真题',exact:true}).click();await page.getByLabel('原卷年份',{exact:true}).selectOption('2020');await expect(page.locator('.archive-papers')).toContainText('原卷阅读 + 双语解析');await page.getByRole('button',{name:'开始原卷答题卡',exact:true}).click();
 for(let s=0;s<2;s++){
  await expect(page.getByRole('timer')).toContainText('75:00');await expect(page.locator('.explanation-steps')).toHaveCount(0);
  for(let i=0;i<20;i++){
   await page.locator('.question-number').nth(i).click();await rendered(page);await expect(page.getByRole('spinbutton',{name:'PDF 页码',exact:true})).toHaveValue(String(i+3));await expect(page.getByRole('radio')).toHaveCount(8);await page.getByRole('radio').nth(keys[s].charCodeAt(i)-65).check();
   if(s===1&&i===10){await page.reload();await rendered(page);await expect(page.getByRole('radio').nth(6)).toBeChecked();await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();const controls=document.querySelector('.reader-controls')!;window.scrollTo(0,controls.getBoundingClientRect().top+window.scrollY-25);document.querySelector('.reader-canvas')!.scrollTop=90;});await page.screenshot({path:'/tmp/tmua-2020-reading-desktop.png'});}
  }
  await page.clock.setFixedTime(new Date(s===0?'2026-10-13T12:00:10Z':'2026-10-13T12:00:50Z'));await submit(page);
  if(s===0){await expect(page.getByRole('heading',{level:1})).toHaveText('本卷 / 模块已提交');await expect(page.getByRole('radio')).toHaveCount(0);await page.clock.setFixedTime(new Date('2026-10-13T12:00:40Z'));await page.getByRole('button',{name:'开始下一部分',exact:true}).click();}
 }
 await expect(page.locator('.result-stats')).toContainText('40 / 40');await expect(page.locator('.result-stats')).toContainText('100%');await expect(page.locator('.result-stats')).toContainText('00:20');
 for(const row of await page.locator('.section-results tbody tr').all())await expect(row).toContainText('20 / 20');
 await expect(page.locator('.explanation-steps')).toHaveCount(40);await expect(page.locator('.pitfall')).toHaveCount(40);await expect(page.getByRole('heading',{name:'知识点表现',exact:true})).toBeVisible();
 const boundary=page.getByLabel('第 17 题解析',{exact:true});await expect(boundary).toContainText('边界补充');await expect(boundary).toContainText('保留官方 A 判分');await expect(page.getByLabel('第 40 题解析',{exact:true})).toContainText('措辞有歧义');await boundary.screenshot({path:'/tmp/tmua-2020-explanation-desktop.png'});
 await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(boundary).toContainText('complete condition');await expect(page.getByLabel('第 40 题解析',{exact:true})).toContainText('global-function interpretation');await expect(page.locator('.explanation-steps [lang="zh-CN"]')).toHaveCount(0);
 await expect(boundary.getByRole('link',{name:'官方英文详解',exact:true})).toHaveAttribute('href',/tmua-2020-p1-worked\.pdf$/);
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await expect(page.locator('.records-table')).toContainText('40 / 40');await page.getByRole('button',{name:'查看结果',exact:true}).click();await expect(page.locator('.explanation-steps')).toHaveCount(40);
});
test('2020 focused PDF training filters by topic, shows reviewed integer bounds and corrects a mistake on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const [label,value] of [['试卷 / 科目','Paper 2'],['来源','官方公开材料'],['年份','2020'],['作答方式','PDF 原卷答题卡'],['知识点','代数'],['细分考点','不同整数的均值中位数与极差']])await chooseFilter(page,label,value);
 await expect(page.getByText('找到 1 道题',{exact:true})).toBeVisible();await page.getByRole('button',{name:'开始训练',exact:true}).click();await rendered(page);await expect(page.getByRole('spinbutton',{name:'PDF 页码',exact:true})).toHaveValue('19');await page.getByRole('radio').nth(0).check();await submit(page,'交卷并查看结果');
 await expect(page.locator('.result-stats')).toContainText('0 / 1');await expect(page.getByLabel('第 1 题解析',{exact:true})).toContainText('极差至少');await expect(page.locator('.recommendation-panel')).toContainText(/有 \d+ 道同知识点未做题/);await expect(page.getByRole('meter',{name:'代数',exact:true})).toHaveAttribute('aria-valuenow','0');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(page.getByLabel('第 1 题解析',{exact:true})).toContainText('range is therefore at least');await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:'/tmp/tmua-2020-review-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'练习本次错题',exact:true}).click();await rendered(page);await page.getByRole('radio').nth(4).check();await submit(page,'交卷并查看结果');await expect(page.locator('.result-stats')).toContainText('1 / 1');await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await page.getByRole('button',{name:/^错题本/}).click();await expect(page.locator('.mistake-row')).toHaveCount(0);
});
