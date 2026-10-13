import { chooseFilter } from './filters';
import { test, expect, type Page } from '@playwright/test';
const errors=new WeakMap<Page,string[]>();
const keys=['FFGBFDGACBAECBCBABBD','DECCBDBCCECBACBEFCFE'];
test.beforeEach(async({page})=>{const messages:string[]=[];errors.set(page,messages);page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(m.type()==='error')messages.push(m.text());});await page.goto('/');});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);await expect(page.locator('.math-error,.katex-error,vite-error-overlay')).toHaveCount(0);});
async function rendered(page:Page){await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('data-rendered','true');}
async function submit(page:Page,label='提交本卷 / 模块'){await page.locator('.answer-footer').getByRole('button',{name:label,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();}
test('2021 PDF-only questions provide all 40 explanations, independent clocks, marking and persisted records',async({page})=>{
 test.setTimeout(120_000);// Freeze Date only: PDF.js still needs requestAnimationFrame for canvas rendering.
 await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z'));
 await expect(page).toHaveTitle('TMUA / ESAT · Practice');
 await page.getByRole('navigation').getByRole('button',{name:'历年真题',exact:true}).click();await page.getByLabel('原卷年份',{exact:true}).selectOption('2021');
 await expect(page.locator('.archive-papers')).toContainText('原卷阅读 + 双语解析');await page.getByRole('button',{name:'开始原卷答题卡',exact:true}).click();
 for(let s=0;s<2;s++){
  await expect(page.getByRole('timer')).toContainText('75:00');
  await expect(page.getByLabel('解析语言',{exact:true})).toHaveCount(0);await expect(page.locator('.explanation-steps')).toHaveCount(0);
  for(let i=0;i<20;i++){
   await page.locator('.question-number').nth(i).click();await rendered(page);await expect(page.getByRole('spinbutton',{name:'PDF 页码',exact:true})).toHaveValue(String(i+3));
   await expect(page.getByRole('radio')).toHaveCount(8);await page.getByRole('radio').nth(keys[s].charCodeAt(i)-65).check();
   if(s===0&&i===16){await page.reload();await rendered(page);await expect(page.getByRole('radio').nth(0)).toBeChecked();await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:'/tmp/tmua-pdf-explanations-desktop.png'});}
  }
  await page.clock.setFixedTime(new Date(s===0?'2026-10-12T12:00:10Z':'2026-10-12T12:00:50Z'));await submit(page);
  if(s===0){await expect(page.getByRole('heading',{level:1})).toHaveText('本卷 / 模块已提交');await expect(page.getByRole('radio')).toHaveCount(0);await page.clock.setFixedTime(new Date('2026-10-12T12:00:40Z'));await page.getByRole('button',{name:'开始下一部分',exact:true}).click();}
 }
 await expect(page.locator('.result-stats')).toContainText('40 / 40');await expect(page.locator('.result-stats')).toContainText('100%');await expect(page.locator('.result-stats')).toContainText('00:20');
 await expect(page.locator('.linked-review')).toHaveCount(40);await expect(page.locator('.explanation-steps')).toHaveCount(40);await expect(page.locator('.pitfall')).toHaveCount(40);
 for(const row of await page.locator('.section-results tbody tr').all())await expect(row).toContainText('20 / 20');
 await expect(page.getByLabel('第 17 题解析',{exact:true})).toContainText('八条圆');await expect(page.getByLabel('第 40 题解析',{exact:true})).toContainText('99 为奇数');
 await expect(page.getByRole('heading',{name:'知识点表现',exact:true})).toBeVisible();await expect(page.locator('.performance-panel')).not.toContainText('PDF 答题卡不计入');
 await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(page.getByLabel('第 20 题解析',{exact:true})).toContainText('logarithmic restrictions');await expect(page.locator('.explanation-steps [lang="zh-CN"]')).toHaveCount(0);
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await expect(page.locator('.records-table')).toContainText('40 / 40');await page.getByRole('button',{name:'查看结果',exact:true}).click();await expect(page.locator('.explanation-steps')).toHaveCount(40);
});
test('mobile PDF topic training shows bilingual review, recommendations and corrected mistake removal',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const [label,value] of [['试卷 / 科目','Paper 2'],['来源','官方公开材料'],['年份','2021'],['作答方式','PDF 原卷答题卡'],['知识点','逻辑与证明'],['细分考点','整除命题的反例']])await chooseFilter(page,label,value);
 await expect(page.getByText('找到 1 道题',{exact:true})).toBeVisible();await page.getByRole('button',{name:'开始训练',exact:true}).click();await rendered(page);await expect(page.getByRole('spinbutton',{name:'PDF 页码',exact:true})).toHaveValue('6');
 await page.getByRole('radio').nth(0).check();await submit(page,'交卷并查看结果');await expect(page.locator('.result-stats')).toContainText('0 / 1');await expect(page.getByLabel('第 1 题解析',{exact:true})).toContainText('仅 II');
 await expect(page.locator('.recommendation-panel')).toContainText(/有 \d+ 道同知识点未做题/);await expect(page.getByRole('meter',{name:'逻辑与证明',exact:true})).toHaveAttribute('aria-valuenow','0');
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:'/tmp/tmua-pdf-explanations-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(page.getByLabel('第 1 题解析',{exact:true})).toContainText('counterexample');
 await page.getByRole('button',{name:'练习本次错题',exact:true}).click();await rendered(page);await page.getByRole('radio').nth(2).check();await submit(page,'交卷并查看结果');await expect(page.locator('.result-stats')).toContainText('1 / 1');
 await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await page.getByRole('button',{name:/^错题本/}).click();await expect(page.locator('.mistake-row')).toHaveCount(0);
});
test('legacy PDF snapshots stay unclassified while current mistake retries receive reviewed explanations',async({page})=>{
 await page.getByRole('navigation').getByRole('button',{name:'历年真题',exact:true}).click();await page.getByLabel('原卷年份',{exact:true}).selectOption('2021');await page.getByLabel('练习试卷',{exact:true}).selectOption('p1');await page.getByRole('button',{name:'开始原卷答题卡',exact:true}).click();
 await page.evaluate(()=>{const key='tmua-esat-practice:v1';const state=JSON.parse(localStorage.getItem(key)!);for(const q of state.active.questions){delete q.external.explanationReady;q.topic={id:'unclassified-paper',name:{zh:'原卷考点未逐题标注',en:'Paper topics not classified'}};q.subtopic={id:'unclassified-question',name:{zh:'见官方原卷',en:'See the official paper'}};}localStorage.setItem(key,JSON.stringify(state));});await page.reload();await page.locator('.question-number').last().click();await submit(page);
 await expect(page.getByLabel('解析语言',{exact:true})).toHaveCount(0);await expect(page.locator('.explanation-steps')).toHaveCount(0);await expect(page.locator('.performance-panel')).toContainText('尚未逐题标注');
 await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await page.getByRole('button',{name:/^错题本/}).click();await page.locator('.mistake-row').first().getByRole('button',{name:'重练',exact:true}).click();await rendered(page);await page.getByRole('radio').nth(5).check();await submit(page,'交卷并查看结果');await expect(page.locator('.explanation-steps')).toHaveCount(1);await expect(page.locator('.result-stats')).toContainText('1 / 1');
});
