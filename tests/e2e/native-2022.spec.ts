import { test, expect, type Page } from '@playwright/test';
const keys=['CDFCHFEBECADADHBDBFB','BECBFCFCAGCFEDFDEEBE'];
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const messages:string[]=[];errors.set(page,messages);page.on('pageerror',error=>messages.push(error.message));page.on('console',message=>{if(message.type()==='error')messages.push(message.text());});await page.goto('/');
});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);await expect(page.locator('.math-error,.katex-error,vite-error-overlay')).toHaveCount(0);});
async function finish(page:Page,label='提交本卷 / 模块') {await page.locator('.answer-footer').getByRole('button',{name:label,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();}
test('2022 batch: all 40 questions and diagrams render, both papers grade 20/20 with separate timers',async({page})=>{
 await page.clock.install({time:new Date('2026-10-12T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-12T12:01:00Z'));
 await page.getByRole('navigation').getByRole('button',{name:'官方历年卷',exact:true}).click();await page.getByLabel('原卷年份',{exact:true}).selectOption('2022');
 await page.getByLabel('我已准备好开始 2022 Paper 1 + Paper 2 整卷练习。',{exact:true}).check();await page.getByRole('button',{name:'开始真题整卷练习',exact:true}).click();
 for(let s=0;s<2;s++){
  await expect(page.getByRole('timer')).toContainText('75:00');
  for(let i=0;i<20;i++){
   await page.locator('.question-number').nth(i).click();await expect(page.locator('.paper-reader')).toHaveCount(0);await expect(page.locator('.answer-prompt .katex')).not.toHaveCount(0);await expect(page.locator('.math-error')).toHaveCount(0);
   await page.getByRole('radio').nth(keys[s].charCodeAt(i)-65).check();
   if((s===0&&[3,16].includes(i))||(s===1&&[10,17].includes(i))){
    const image=page.locator('.question-diagram img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
   }
   if(s===1&&i===17){await page.getByRole('button',{name:'查看大图',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();});await page.screenshot({path:'/tmp/tmua-2022-graph-desktop.png'});await page.clock.fastForward(3000);await page.getByRole('dialog').getByRole('button',{name:'关闭大图',exact:true}).click();}
  }
  await page.clock.fastForward(10_000);await finish(page);
  if(s===0){await expect(page.getByRole('heading',{level:1})).toHaveText('本卷 / 模块已提交');await page.clock.fastForward(30_000);await page.getByRole('button',{name:'开始下一部分',exact:true}).click();}
 }
 await expect(page.locator('.result-stats')).toContainText('40 / 40');await expect(page.locator('.result-stats')).toContainText('100%');await expect(page.locator('.result-stats')).toContainText('00:23');
 await expect(page.locator('.review-item')).toHaveCount(40);for(const row of await page.locator('.section-results tbody tr').all())await expect(row).toContainText('20 / 20');
 await expect(page.getByLabel('第 18 题解析',{exact:true})).toContainText('边界补充');await expect(page.getByLabel('第 40 题解析',{exact:true})).toContainText('完整值域');
 await page.getByLabel('解析语言',{exact:true}).selectOption('en');await expect(page.getByLabel('第 20 题解析',{exact:true})).toContainText('squaring is equivalent');
 await expect(page.locator('.review-source').first()).toContainText('2022');await page.reload();await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();await expect(page.locator('.records-table')).toContainText('40 / 40');
});
test('2022 mobile graph question supports full-resolution inspection and direct marking without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const [label,value] of [['试卷 / 科目','Paper 2'],['来源','官方公开材料'],['年份','2022'],['作答方式','文字题 · 直接作答'],['知识点','函数'],['细分考点','变量指数函数的图像']])await page.getByRole('group',{name:label,exact:true}).getByRole('button',{name:value,exact:true}).click();
 await expect(page.getByText('找到 1 道题',{exact:true})).toBeVisible();await page.getByRole('button',{name:'开始训练',exact:true}).click();await page.getByRole('radio').nth(4).check();
 await page.getByRole('button',{name:'查看大图',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect.poll(()=>dialog.getByRole('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>700)).toBe(true);
 expect(await page.locator('.diagram-original').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/tmua-2022-graph-mobile.png'});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('radio').nth(4)).toBeChecked();
 await finish(page,'交卷并查看结果');await expect(page.locator('.result-stats')).toContainText('1 / 1');await expect(page.locator('.explanation-steps')).toContainText('区间端点不包括');
});
