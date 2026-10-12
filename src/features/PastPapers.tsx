import { useState } from 'react';
import { ArrowRight, ExternalLink, FileText } from 'lucide-react';
import { useI18n } from '../i18n';
import { PAST_PAPERS, PAST_PAPER_SOURCE, PAST_PAPER_YEARS, pastPaperPlan, isNativePaper } from '../data/pastPapers';
import type { Question, Section } from '../types';
import { Notice, PageHeading, PrivacyNote } from '../components/Common';

export function PastPapers({ onStart }: { onStart: (questions: Question[], sections: Section[]) => void }) {
  const { t } = useI18n();
  const [year, setYear] = useState(PAST_PAPER_YEARS[0]);
  const [selection, setSelection] = useState<'both' | 'p1' | 'p2'>('both');
  const [timed, setTimed] = useState(true);
  const [ready, setReady] = useState(false);
  const papers = PAST_PAPERS.filter(paper => paper.year === year);
  const included = papers.filter(paper => selection === 'both' || paper.moduleId === selection);
  const allNative = included.every(isNativePaper);
  return <>
    <PageHeading title={t('用官方原卷，认真练一次。', 'Practise with the official past papers.')} subtitle={t('TMUA 2016–2023 · 16 份原卷 · 40 道文字题 + 280 道 PDF 答题卡', 'TMUA 2016–2023 · 16 papers · 40 text questions + 280 PDF answer slots')} />
    <Notice>{t('2023 Paper 1 与 Paper 2 的全部 40 道题已支持站内文字作答、原图、双语解析和考点表现。其余试卷仍使用 PDF 阅读器与答题卡。每卷均可独立限时 75 分钟，只计算原始分；本站不是 UAT-UK 官方考试软件。', 'All 40 questions in 2023 Paper 1 and Paper 2 support direct text answers, original diagrams, bilingual explanations and topic results. Other papers use the PDF reader and answer sheet. Each paper can be timed for 75 minutes. Raw marks only; this is not the UAT-UK test player.')} </Notice>
    <div className="two-columns archive-layout">
      <section className="panel archive-panel"><h2>{t('选择年份与试卷', 'Choose a year and paper')}</h2>
        <div className="archive-fields">
          <div className="form-field"><label htmlFor="archive-year">{t('原卷年份', 'Paper year')}</label><select id="archive-year" value={year} onChange={e => { setYear(Number(e.target.value)); setReady(false); }}>{PAST_PAPER_YEARS.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
          <div className="form-field"><label htmlFor="archive-papers">{t('练习试卷', 'Papers to practise')}</label><select id="archive-papers" value={selection} onChange={e => { setSelection(e.target.value as typeof selection); setReady(false); }}><option value="both">{t('Paper 1 + Paper 2 · 40 题', 'Paper 1 + Paper 2 · 40 questions')}</option><option value="p1">Paper 1 · 20 {t('题', 'questions')}</option><option value="p2">Paper 2 · 20 {t('题', 'questions')}</option></select></div>
        </div>
        <div className="archive-papers">{included.map(paper => <article key={paper.id} className="archive-paper"><FileText size={24} /><div><h3>TMUA {paper.year} · Paper {paper.moduleId === 'p1' ? '1' : '2'}</h3><p className="small muted">{isNativePaper(paper) ? t('20 题 · 75 分钟 · 文字作答 + 双语解析', '20 questions · 75 minutes · direct answers + bilingual explanations') : t('20 题 · 75 分钟 · PDF 阅读器答题卡', '20 questions · 75 minutes · PDF answer sheet')}</p></div><a className="button outline compact" href={paper.paperUrl} target="_blank" rel="noreferrer">{t('打开官方原卷', 'Open official paper')}<ExternalLink size={14} /></a></article>)}</div>
        <ol className="archive-instructions"><li>{allNative ? t('题干、公式、选项与图形已录入，可直接在站内作答，无需先打开 PDF。', 'The text, formulas, options and diagrams are ready for direct answers; no PDF is needed.') : t('先打开所选官方原卷，确认 PDF 可以阅读；推荐电脑或平板并排查看。', 'Open the selected papers and confirm the PDFs load. A desktop or tablet with side-by-side viewing is recommended.')}</li><li>{allNative ? t(`按原卷顺序完成 ${included.length * 20} 题，可使用题号导航与待检查标记。`, `Answer all ${included.length * 20} questions in the original order, with navigation and review flags.`) : t('准备好后开始答题卡。按原卷题号选答案；A–H 为统一答题卡，只有原卷列出的选项有效。', 'Start the answer sheet when ready. Match the original question number. A–H are standard answer slots; only options shown in the paper apply.')}</li><li>{allNative ? t('每卷独立计时。交卷后查看原始分、双语解析、易错点、知识点表现并重练错题。', 'Each paper is timed separately. Submit for raw marks, bilingual explanations, pitfalls, topic results and mistake retries.') : t('每卷独立计时。交卷后查看答对数、正确率、错题与官方英文解析链接。', 'Each paper has its own timer. Submit to see raw results, mistakes and official English solution links.')}</li></ol>
        <label className="switch-row"><span>{t('按每卷 75 分钟限时', '75-minute limit per paper')}</span><input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>
        <label className="import-confirm"><input type="checkbox" checked={ready} onChange={e => setReady(e.target.checked)} /><span>{allNative ? t(`我已准备好开始 ${year} ${selection === 'both' ? 'Paper 1 + Paper 2' : selection === 'p1' ? 'Paper 1' : 'Paper 2'} 整卷练习。`, `I am ready to begin the complete ${year} ${selection === 'both' ? 'Paper 1 + Paper 2' : selection === 'p1' ? 'Paper 1' : 'Paper 2'}.`) : t('我能打开所选官方原卷，已准备好开始。', 'I can open the selected official papers and am ready to begin.')}</span></label>
        <button className="button primary" disabled={!ready} onClick={() => { const plan = pastPaperPlan(year, selection, timed); onStart(plan.questions, plan.sections); }}>{allNative ? t('开始真题整卷练习', 'Start complete past paper') : t('开始原卷答题卡', 'Start past-paper answer sheet')}<ArrowRight size={18} /></button>
      </section>
      <aside className="sidebar-stack"><section className="panel archive-info"><h2>{t('原始来源与使用说明', 'Sources and use')}</h2><p>{t('UAT-UK 将这些试卷列为可用于 TMUA 备考的历史材料。当前考试使用计算机；历年卷练习不等同于完整模拟现行考场软件。', 'UAT-UK lists these historical papers for TMUA preparation. The current test is computer-based; this flow does not reproduce the live test player.')}</p><p className="small muted">{t('原卷与英文详解作者：Cambridge Assessment / Cambridge University Press & Assessment；由 UAT-UK 提供公开入口。本网站与上述机构无隶属或背书关系。', 'Original papers and solutions: Cambridge Assessment / Cambridge University Press & Assessment, linked through UAT-UK. This website has no affiliation or endorsement.')}</p><a href={PAST_PAPER_SOURCE.archiveUrl} target="_blank" rel="noreferrer">{t('官方历年资料库', 'Official past-paper archive')}<ExternalLink size={13} /></a><a href={PAST_PAPER_SOURCE.termsUrl} target="_blank" rel="noreferrer">{t('官方使用条款', 'Official terms of use')}<ExternalLink size={13} /></a><p className="small muted">{t('来源与答案核实：2026-10-11。只报告原始分与正确率，不换算官方 1–9 分。', 'Sources and answer keys checked: 11 Oct 2026. Reports raw marks and accuracy without official 1–9 conversion.')}</p></section><PrivacyNote /></aside>
    </div>
  </>;
}
