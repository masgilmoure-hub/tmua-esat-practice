import { test, expect, type Page } from '@playwright/test';
const errors=new WeakMap<Page,string[]>();
const papers=[{year:2018,keys:['DCEGDEADBECFCBEFABDE','CBFDACBDFBAFFEGFCCCB'],reviewNumber:29,reviewText:'三个上述解',english:'three roots'},{year:2019,keys:['AAECECFEDFHCBBACCBCE','ECADBDBEDAAFDBBFDEEB'],reviewNumber:38,reviewText:'证明充分性',english:'necessary and sufficient'}];
test.beforeEach(async({page})=>{const messages:string[]=[];errors.set(page,messages);page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(m.type()==='error')messages.push(m.text());});await page.goto('/');});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);await expect(page.locator('.math-error,.katex-error,vite-error-overlay')).toHaveCount(0);});
async function rendered(page:Page){await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('data-rendered','true');}
async function submit(page:Page,label='提交本卷 / 模块'){await page.locator('.answer-footer').getByRole('button',{name:label,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();}
for(const paper of papers){
 test(`${paper.year}: all 40 PDF pages, original keys, independent timers and full bilingual reviews`,async({page})=>{
  test.setTimeout(120_000);await page.clock.setFixedTime(new Date('2026-10-13T12:00:00Z'));await expect(page).toHaveTitle('TMUA / ESAT · Practice');
  await page.getByRole('navigation').getByRole('button',{name:'官方历年卷',exact:true}).click();await page.getByLabel('原卷年份',{exact:true}).selectOption(String(paper.year));await expect(page.locator('.archive-papers')).toContainText('原卷阅读 + 双语解析');await page.getByLabel('我能打开所选官方原卷，已准备好开始。',{exact:true}).check();await page.getByRole('button',{name:'开始原卷答题卡',exact:true}).click();
  for(let s=0;s<2;s++){
   await expect(page.getByRole('timer')).toContainText('75:00');await expect(page.locator('.explanation-steps')).toHaveCount(0);
   for(let i=0;i<20;i++){
    await page.locator('.question-number').nth(i).click();await expect(page.getByRole('spinbutton',{name:'PDF 页码',exact:true})).toHaveValue(String(i+3));await expect(page.locator('.reader-canvas canvas')).toHaveAttribute('aria-label',`原卷 PDF 第 ${i+3} 页`);await rendered(page);await page.getByRole('radio').nth(paper.keys[s].charCodeAt(i)-65).check();
    if(s===1&&i===15){await page.reload();await rendered(page);await expect(page.getByRole('radio').nth(paper.keys[s].charCodeAt(i)-65)).toBeChecked();await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();const controls=document.querySelector('.reader-controls')!;window.scrollTo(0,controls.getBoundingClientRect().top+window.scrollY-25);document.querySelector('.reader-canvas')!.scrollTop=80;});await page.screenshot({path:`/tmp/tmua-${paper.year}-reading-desktop.png`});}
   }
   await page.clock.setFixedTime(new Date(s===0?'2026-10-13T12:00:10Z':'2026-10-13T12:00:50Z'));await submit(page);
   if(s===0){await expect(page.getByRole('heading',{level:1})).toHaveText('本卷 / 模块已提交');await expect(page.getByRole('radio')).toHaveCount(0);await page.clock.setFixedTime(new Date('2026-10-13T12:00:40Z'));await page.getByRole('button',{name:'开始下一部分',exact:true}).click();}
  }
  await expect(page.locator('.result-stats')).toContainText('40 / 40');await expect(page.locator('.result-stats')).toContainText('100%');await expect(page.locator('.result-stats')).toContainText('00:20');
  for(const row of await page.locator('.section-results tbody tr').all())await expect(row).toContainText('20 / 20');
  await expect(page.locator('.explanation-steps')).toHaveCount(40);await expect(page.locator('.pitfall')).toHaveCount(40);await expect(page.getByRole('heading',{name:'知识点表现',exact:true})).toBeVisible();
  const review=page.getByLabel(`第 ${paper.reviewNumber} 题解析`,{exact:true});await expect(review).toContainText(paper.reviewText);await review.screenshot({path:`/tmp/tmua-${paper.year}-explanation-desktop.png`});
  await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(review).toContainText(paper.english);await expect(page.locator('.explanation-steps [lang="zh-CN"]')).toHaveCount(0);await expect(review.getByRole('link',{name:'官方英文详解',exact:true})).toHaveAttribute('href',new RegExp(`tmua-${paper.year}-p2-worked\\.pdf$`));
  await page.reload();await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await expect(page.locator('.records-table')).toContainText('40 / 40');await page.getByRole('button',{name:'查看结果',exact:true}).click();await expect(page.locator('.explanation-steps')).toHaveCount(40);
 });
}
const focused=[{year:2018,module:'Paper 1',topic:'统计',subtopic:'交换数据后的加权均值',number:17,key:0,english:'group sizes'},{year:2019,module:'Paper 2',topic:'逻辑与证明',subtopic:'环形座位的邻接覆盖',number:9,key:3,english:'at least 14'}];
for(const item of focused){
 test(`${item.year}: focused PDF topic training and corrected mistake remain usable on mobile`,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const [label,value] of [['试卷 / 科目',item.module],['来源','官方公开材料'],['年份',String(item.year)],['作答方式','PDF 原卷答题卡'],['知识点',item.topic],['细分考点',item.subtopic]])await page.getByRole('group',{name:label,exact:true}).getByRole('button',{name:value,exact:true}).click();
  await expect(page.getByText('找到 1 道题',{exact:true})).toBeVisible();await page.getByRole('button',{name:'开始训练',exact:true}).click();await rendered(page);await expect(page.getByRole('spinbutton',{name:'PDF 页码',exact:true})).toHaveValue(String(item.number+2));await page.getByRole('radio').nth((item.key+1)%8).check();await submit(page,'交卷并查看结果');
  await expect(page.locator('.result-stats')).toContainText('0 / 1');await expect(page.getByRole('meter',{name:item.topic,exact:true})).toHaveAttribute('aria-valuenow','0');await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(page.getByLabel('第 1 题解析',{exact:true})).toContainText(item.english);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:`/tmp/tmua-${item.year}-review-mobile.png`,fullPage:true});await page.getByRole('button',{name:'练习本次错题',exact:true}).click();await rendered(page);await page.getByRole('radio').nth(item.key).check();await submit(page,'交卷并查看结果');await expect(page.locator('.result-stats')).toContainText('1 / 1');await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await page.getByRole('button',{name:/^错题本/}).click();await expect(page.locator('.mistake-row')).toHaveCount(0);
 });
}
