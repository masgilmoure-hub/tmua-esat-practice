import { test, expect, type Page } from '@playwright/test';
const key='FACCF EFBEB BFFAF EEEDF'.replaceAll(' ','');
const errors=new WeakMap<Page,string[]>();
async function start(page:Page) {
 await page.getByRole('navigation').getByRole('button',{name:'官方历年卷',exact:true}).click();
 await page.getByLabel('练习试卷',{exact:true}).selectOption('p1');
 await expect(page.getByText('20 题 · 75 分钟 · 文字作答 + 双语解析',{exact:true})).toBeVisible();
 await page.getByLabel('我已准备好开始 2023 Paper 1 整卷练习。',{exact:true}).check();
 await page.getByRole('button',{name:'开始真题整卷练习',exact:true}).click();
}
async function submit(page:Page,label='提交本卷 / 模块') {
 await page.locator('.navigator-panel').getByRole('button',{name:label,exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();
}
test.beforeEach(async({page})=>{
 const messages:string[]=[];errors.set(page,messages);
 page.on('pageerror',error=>messages.push(error.message));
 page.on('console',message=>{if(message.type()==='error')messages.push(message.text());});
 await page.goto('/');
});
test.afterEach(async({page})=>{
 expect(errors.get(page)).toEqual([]);
 await expect(page.locator('.math-error, .katex-error, vite-error-overlay')).toHaveCount(0);
});
test('all native questions render, full 75-minute marking, bilingual review, records and mistake retry work',async({page})=>{
 await page.clock.install({time:new Date('2026-10-12T12:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-12T12:01:00Z'));await start(page);
 await expect(page.getByRole('heading',{level:1})).toHaveText('TMUA 真题整卷练习');
 await expect(page.getByRole('timer')).toContainText('75:00');
 await expect(page.locator('.paper-reader')).toHaveCount(0);
 await expect(page.locator('.question-number')).toHaveCount(20);
 for(let i=0;i<20;i++) {
  await page.locator('.question-number').nth(i).click();
  await expect(page.locator('.answer-prompt')).not.toContainText('Read question');
  await expect(page.locator('.answer-prompt .katex')).not.toHaveCount(0);
  await expect(page.locator('.math-error')).toHaveCount(0);
  const image=page.locator('.question-diagram img');
  if([4,16,19].includes(i)){
   await expect(image).toBeVisible();
   await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  }else await expect(image).toHaveCount(0);
  if(i!==19)await page.getByRole('radio').nth(i===0?0:key.charCodeAt(i)-65).check();
  if(i===4){await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:'/tmp/tmua-native-desktop.png',fullPage:true});}
 }
 await page.locator('.question-number').nth(0).click();
 await page.getByRole('button',{name:'标记待检查',exact:true}).click();
 await page.clock.fastForward(5000);await page.reload();
 await expect(page.getByRole('radio').nth(0)).toBeChecked();
 await expect(page.getByRole('button',{name:'已标记待检查',exact:true})).toBeVisible();
 await expect(page.getByRole('timer')).toContainText('74:55');
 await submit(page);
 await expect(page.locator('.result-stats')).toContainText('18 / 20');
 await expect(page.locator('.result-stats')).toContainText('90%');
 await expect(page.locator('.result-stats > div').nth(3)).toContainText('1');
 await expect(page.getByRole('heading',{name:'知识点表现',exact:true})).toBeVisible();
 await expect(page.locator('.topic-performance [role=meter]')).toHaveCount(7);
 await expect(page.locator('.review-item')).toHaveCount(20);
 await page.getByLabel('解析语言',{exact:true}).selectOption('en');
 await expect(page.locator('.explanation-steps p[lang="zh-CN"]')).toHaveCount(0);
 await expect(page.locator('.explanation-steps p[lang="en"]')).not.toHaveCount(0);
 await page.getByLabel('解析语言',{exact:true}).selectOption('both');
 await expect(page.locator('.explanation-steps p[lang="zh-CN"]')).not.toHaveCount(0);
 await expect(page.locator('.review-source').first()).toContainText('TMUA 2023 Paper 1');
 await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();
 await expect(page.locator('.records-table')).toContainText('真题整卷练习');
 await page.getByRole('button',{name:/^错题本/}).click();
 await expect(page.locator('.mistake-row')).toHaveCount(2);
 await page.getByRole('button',{name:'重练',exact:true}).first().click();
 await page.getByRole('radio').nth(5).check();await submit(page,'交卷并查看结果');
 await expect(page.locator('.result-stats')).toContainText('1 / 1');
 await page.reload();
 await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();
 await page.getByRole('button',{name:/^错题本/}).click();
 await expect(page.locator('.mistake-row')).toHaveCount(1);
});
test('year, delivery, topic and subtopic filters lead to focused practice on phone with English controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('group',{name:'试卷 / 科目',exact:true}).getByRole('button',{name:'Paper 1',exact:true}).click();
 await page.getByRole('group',{name:'来源',exact:true}).getByRole('button',{name:'官方公开材料',exact:true}).click();
 await page.getByRole('group',{name:'年份',exact:true}).getByRole('button',{name:'2023',exact:true}).click();
 await page.getByRole('group',{name:'作答方式',exact:true}).getByRole('button',{name:'文字题 · 直接作答',exact:true}).click();
 await expect(page.getByText('找到 20 道题',{exact:true})).toBeVisible();
 await page.getByRole('group',{name:'知识点',exact:true}).getByRole('button',{name:'几何',exact:true}).click();
 await expect(page.getByText('找到 5 道题',{exact:true})).toBeVisible();
 await page.getByRole('group',{name:'细分考点',exact:true}).getByRole('button',{name:'内接矩形与对称性',exact:true}).click();
 await expect(page.getByText('找到 1 道题',{exact:true})).toBeVisible();
 await page.getByLabel('限时训练',{exact:true}).check();
 await page.getByLabel('时间（分钟）',{exact:true}).fill('5');
 await page.getByRole('button',{name:'开始训练',exact:true}).click();
 await expect(page.getByRole('timer')).toContainText('05:');
 await expect(page.locator('.question-diagram img')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Switch language to English',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Focused practice');
 await page.getByRole('radio').nth(5).check();
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});
 await page.screenshot({path:'/tmp/tmua-native-mobile.png',fullPage:true});
 await submit(page,'Submit & view results');
 await expect(page.locator('.result-stats')).toContainText('1 / 1');
 await expect(page.getByRole('heading',{name:'Topic performance',exact:true})).toBeVisible();
 await expect(page.locator('.explanation-steps')).toContainText('The square has side 10');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('native full paper automatically submits at 75 minutes and keeps one record',async({page})=>{
 await page.clock.install();await start(page);await page.clock.fastForward(4_501_000);
 await expect(page.locator('.result-stats')).toContainText('0 / 20');
 await expect(page.locator('.result-stats')).toContainText('75:00');
 await expect(page.locator('.result-stats > div').nth(3)).toContainText('20');
 await page.clock.fastForward(3000);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('tmua-esat-practice:v1')!));
 expect(state.results).toHaveLength(1);expect(state.results[0].expiredSections).toEqual([0]);
 expect(state.active).toBeNull();
});
