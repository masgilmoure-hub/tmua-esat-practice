import { chooseFilter } from './filters';
import { test, expect, type Page } from '@playwright/test';
const keys=['FACCF EFBEB BFFAF EEEDF','HFCGA FEDDA GCCFB BFDHD'].map(key=>key.replaceAll(' ',''));
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const messages:string[]=[];errors.set(page,messages);
 page.on('pageerror',error=>messages.push(error.message));
 page.on('console',message=>{if(message.type()==='error')messages.push(message.text());});
 await page.goto('/');
});
test.afterEach(async({page})=>{
 expect(errors.get(page)).toEqual([]);
 await expect(page.locator('.math-error,.katex-error,vite-error-overlay')).toHaveCount(0);
});
async function finishFromFooter(page:Page,label='提交本卷 / 模块'){
 await page.locator('.answer-footer').getByRole('button',{name:label,exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();
}
test('all 40 native questions, independently timed papers, last-question submission and complete bilingual results work',async({page})=>{
 await page.clock.install({time:new Date('2026-10-12T12:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-12T12:01:00Z'));
 await page.getByRole('navigation').getByRole('button',{name:'历年真题',exact:true}).click();
 await expect(page.getByText('20 题 · 75 分钟 · 文字作答 + 双语解析',{exact:true})).toHaveCount(2);

 await page.getByRole('button',{name:'开始真题整卷练习',exact:true}).click();
 await expect(page.getByRole('timer')).toContainText('75:00');
 for(let section=0;section<2;section++){
  for(let i=0;i<20;i++){
   await page.locator('.question-number').nth(i).click();
   await expect(page.locator('.paper-reader')).toHaveCount(0);
   await expect(page.locator('.math-error')).toHaveCount(0);
   await expect(page.locator('.answer-prompt .katex')).not.toHaveCount(0);
   if(section===0&&i===19)continue;
   await page.getByRole('radio').nth(section===1&&i===2?0:keys[section].charCodeAt(i)-65).check();
  }
  await expect(page.locator('.answer-footer').getByRole('button',{name:'下一题',exact:true})).toHaveCount(0);
  await expect(page.locator('.answer-footer').getByRole('button',{name:'提交本卷 / 模块',exact:true})).toBeEnabled();
  if(section===1){
   await expect(page.locator('.answer-prompt')).toContainText('only if');
   await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});
   await page.screenshot({path:'/tmp/tmua-p2-desktop.png',fullPage:true});
  }
  await page.clock.fastForward(section===0?12_000:8_000);
  await finishFromFooter(page);
  if(section===0){
   await expect(page.getByRole('heading',{level:1})).toHaveText('本卷 / 模块已提交');
   await expect(page.locator('.transition-panel')).toContainText('20 道原卷题目 · 限时 75:00');
   await expect(page.locator('.result-stats')).toHaveCount(0);
   await page.clock.fastForward(60_000);
   await page.getByRole('button',{name:'开始下一部分',exact:true}).click();
   await expect(page.getByRole('timer')).toContainText('75:00');
   await expect(page.locator('.session-bar')).toContainText('Paper 2');
   await expect(page.locator('.notice').filter({hasText:'20 道真题'})).toContainText('Paper 2');
  }
 }
 await expect(page.locator('.result-stats')).toContainText('38 / 40');
 await expect(page.locator('.result-stats')).toContainText('95%');
 await expect(page.locator('.result-stats')).toContainText('00:20');
 await expect(page.locator('.section-results tbody tr')).toHaveCount(2);
 for(const row of await page.locator('.section-results tbody tr').all())await expect(row).toContainText('19 / 20');
 await expect(page.locator('.review-item')).toHaveCount(40);
 await expect(page.locator('.linked-review')).toHaveCount(0);
 await expect(page.locator('.topic-performance [role=meter]')).toHaveCount(8);
 await expect(page.getByRole('link',{name:'官方英文详解',exact:true}).last()).toHaveAttribute('href',/tmua-2023-p2-worked\.pdf$/);
 await page.getByLabel('解析语言',{exact:true}).selectOption('en');
 await expect(page.locator('.explanation-steps [lang="zh-CN"]')).toHaveCount(0);
 await expect(page.getByLabel('第 40 题解析',{exact:true})).toContainText('Statement 3 is true');
 await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();
 await page.getByRole('button',{name:/^错题本/}).click();
 await expect(page.locator('.mistake-row')).toHaveCount(2);
 const missed=page.locator('.mistake-row').filter({hasText:'ARCHIVE-TMUA-2023-P2-Q03'});
 await missed.getByRole('button',{name:'重练',exact:true}).click();
 await expect(page.locator('.answer-prompt')).toContainText('counterexample');
 await page.getByRole('radio').nth(2).check();await finishFromFooter(page,'交卷并查看结果');
 await expect(page.locator('.result-stats')).toContainText('1 / 1');
 await page.reload();
 await page.getByRole('navigation').getByRole('button',{name:'练习记录',exact:true}).click();
 await page.getByRole('button',{name:/^错题本/}).click();
 await expect(page.locator('.mistake-row')).toHaveCount(1);
});
test('Paper 2 topic filtering and original truth-table options work on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('group',{name:'试卷 / 科目',exact:true}).getByRole('button',{name:'Paper 2',exact:true}).click();
 await page.getByRole('group',{name:'来源',exact:true}).getByRole('button',{name:'官方公开材料',exact:true}).click();
 await page.getByRole('group',{name:'年份',exact:true}).getByRole('button',{name:'2023',exact:true}).click();
 await page.getByRole('group',{name:'作答方式',exact:true}).getByRole('button',{name:'文字题 · 直接作答',exact:true}).click();
 await expect(page.getByText('找到 20 道题',{exact:true})).toBeVisible();
 await page.getByRole('group',{name:'知识点',exact:true}).getByRole('button',{name:'逻辑与证明',exact:true}).click();
 await expect(page.getByText('找到 8 道题',{exact:true})).toBeVisible();
 await chooseFilter(page, '细分考点', '条件命题的等价表述');
 await expect(page.getByText('找到 1 道题',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'开始训练',exact:true}).click();
 await expect(page.getByRole('radio')).toHaveCount(8);
 await expect(page.locator('.answers .answer-option').nth(6)).toContainText('Statement I: No; Statement II: No; Statement III: Yes');
 await page.getByRole('radio').nth(6).check();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});
 await page.screenshot({path:'/tmp/tmua-p2-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Switch language to English',exact:true}).click();
 await finishFromFooter(page,'Submit & view results');
 await expect(page.locator('.result-stats')).toContainText('1 / 1');
 await expect(page.locator('.explanation-steps')).toContainText('No, No, Yes');
 await expect(page.locator('.review-source')).toContainText('Paper 2');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
