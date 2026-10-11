import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Flag, Save, ExternalLink } from 'lucide-react';
import type { ActiveSession } from '../types';
import { formatTime, remainingSeconds } from '../domain';
import { moduleInfo } from '../data/catalog';
import { useI18n } from '../i18n';
import { ConfirmDialog, Notice, PageHeading } from '../components/Common';

function SessionClock({ session }: { session: ActiveSession }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  const remaining = remainingSeconds(session, now);
  const seconds = remaining ?? Math.max(0, Math.floor((now - session.sectionStartedAt) / 1000));
  return <div className={`timer ${remaining !== null && remaining <= 60 ? 'urgent' : ''}`} role="timer" aria-label={t('计时器', 'Timer')}><Clock size={23} /><strong>{formatTime(seconds)}</strong><span>{remaining === null ? t('已用时间', 'Elapsed') : t('剩余时间', 'Remaining')}</span></div>;
}

export function Session({ session, onAnswer, onFlag, onNavigate, onSubmit, onNextSection, canSave }: {
  session: ActiveSession; onAnswer: (id: string, answer: number) => void; onFlag: (id: string) => void;
  onNavigate: (index: number) => void; onSubmit: () => void; onNextSection: () => void; canSave: boolean;
}) {
  const { t, lang } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const section = session.sections[session.sectionIndex];
  const questions = section.questionIds.map(id => session.questions.find(q => q.id === id)!);
  const q = questions[session.questionIndex];
  const answered = questions.filter(item => session.answers[item.id] !== undefined).length;
  const flagged = questions.filter(item => session.flags.includes(item.id)).length;
  const hasNextSection = session.sectionIndex + 1 < session.sections.length;
  const linked = session.questions.some(item => !!item.external);
  const title = linked ? session.mode === 'mock' ? t('TMUA 官方原卷答题卡', 'TMUA official past-paper answer sheet') : t('官方原卷错题练习', 'Past-paper mistake practice') : session.mode === 'mock' ? t(`${session.exam} 示例模考`, `${session.exam} demo mock`) : t('专项训练', 'Focused practice');
  const submitText = session.mode === 'mock' ? t('提交本卷 / 模块', 'Submit section') : t('交卷并查看结果', 'Submit & view results');
  if (session.phase === 'between') {
    const next = session.sections[session.sectionIndex + 1];
    return <><PageHeading title={t('本卷 / 模块已提交', 'Section submitted')} subtitle={t('答案已锁定，不能返回修改。下一部分将独立计时。', 'Answers are locked. The next section uses a separate timer.')} />
      <section className="panel transition-panel"><Check className="success-icon" size={32} /><h2>{moduleInfo(next.moduleId).name[lang]}</h2><p>{linked ? t(`${next.questionIds.length} 道原卷题目 · ${next.limitSeconds === null ? '不限时' : `限时 ${formatTime(next.limitSeconds)}`}`, `${next.questionIds.length} past-paper questions · ${next.limitSeconds === null ? 'untimed' : `limit ${formatTime(next.limitSeconds)}`}`) : t(`${next.questionIds.length} 道原创示例题 · 限时 ${formatTime(next.limitSeconds ?? 0)}`, `${next.questionIds.length} original demos · time limit ${formatTime(next.limitSeconds ?? 0)}`)}</p>
        {session.expiredSections.includes(session.sectionIndex) ? <Notice tone="warning">{t('上一部分时间已到，已自动提交；未答题按未答记录。', 'The previous section timed out and was submitted automatically. Unanswered questions are recorded separately.')}</Notice> : null}
        <p className="muted">{t('此过渡页仅用于原型体验，停留时间不计入答题用时。正式考试请遵循考场流程。', 'This prototype transition page is excluded from answering time. Follow the test centre’s rules in the actual exam.')}</p>
        <button className="button primary" onClick={onNextSection}>{t('开始下一部分', 'Start next section')}<ArrowRight size={18} /></button>
      </section></>;
  }
  return <>
    <PageHeading title={title} subtitle={linked ? t('官方原卷外链 + 站内答题卡 · 原始分判分 · 非官方考试软件', 'Official PDF + local answer sheet · raw marking · not the official test player') : session.questions.every(q => q.source.kind === 'original-demo') ? t('原创示例 · 练习流程体验，非完整官方模考', 'Original demos · practice flow preview, not a full official mock') : t('本地题库专项训练 · 非完整官方模考', 'Focused practice from the local bank · not a full official mock')} />
    <Notice tone="warning">{linked ? t('请在官方 PDF 中阅读本题并在这里记录答案。计时仍在继续；题干与图表未在本站转录。A–H 为统一答题卡，请仅选择原卷列出的选项。', 'Read the question in the official PDF and record your answer here. The timer keeps running. Original text and diagrams are not reproduced here. A–H are standard slots; select only options shown in the paper.') : session.mode === 'mock' ? t(`本部分仅含 ${questions.length} 道原创示例题，按题量比例缩短计时。`, `This section has only ${questions.length} original demos with proportionally shorter timing.`) : session.questions.every(q => q.source.kind === 'original-demo') ? t('题目为原创示例。交卷后可查看完整解析和易错点。', 'These are original demos. Full explanations and pitfalls are available after submission.') : t('题目来源按导入文件标注。交卷后可查看完整解析和易错点。', 'Sources reflect the imported files. Full explanations and pitfalls are available after submission.')}</Notice>
    <div className="session-bar"><strong>{session.mode === 'mock' ? moduleInfo(section.moduleId).name[lang] : linked ? t('TMUA · 原卷错题', 'TMUA · Past-paper mistakes') : t(`${session.exam} · 专项训练`, `${session.exam} · Focused practice`)}</strong><SessionClock session={session} /></div>
    <div className="two-columns answering-layout">
      <section className="panel answer-panel" aria-label={t('答题区', 'Answer area')}>
        <div className="answer-content"><div className="question-top"><span>Question {session.questionIndex + 1} of {questions.length}</span><button className={`text-button flag-button ${session.flags.includes(q.id) ? 'flagged' : ''}`} aria-pressed={session.flags.includes(q.id)} onClick={() => onFlag(q.id)}><Flag size={19} />{session.flags.includes(q.id) ? t('已标记待检查', 'Flagged for review') : t('标记待检查', 'Flag for review')}</button></div>
          <p className="answer-prompt" lang="en" id="question-prompt">{q.prompt}</p>
          {q.external && q.source.url ? <a className="button outline original-paper-link" href={q.source.url} target="_blank" rel="noreferrer">{t(`打开原卷 · 第 ${q.source.originalNumber} 题`, `Open paper · Question ${q.source.originalNumber}`)}<ExternalLink size={16} /></a> : null}
          <fieldset className={`answers ${q.external ? 'letter-answers' : ''}`} aria-labelledby="question-prompt"><legend className="sr-only">{t('选择一个答案', 'Choose one answer')}</legend>{q.options.map((option, index) => <label key={index} className={`answer-option ${session.answers[q.id] === index ? 'selected' : ''}`}><input type="radio" name={q.id} checked={session.answers[q.id] === index} onChange={() => onAnswer(q.id, index)} /><span className="option-letter">{String.fromCharCode(65 + index)}</span>{q.external ? null : <span lang="en">{option}</span>}</label>)}</fieldset>
          <p className="small muted source-inline">{t('来源：', 'Source: ')}{q.source.title[lang]} · {q.source.originalNumber}</p>
        </div>
        <div className="answer-footer"><button className="button secondary" disabled={session.questionIndex === 0} onClick={() => onNavigate(session.questionIndex - 1)}><ChevronLeft size={18} />{t('上一题', 'Previous')}</button><button className="button primary" disabled={session.questionIndex + 1 === questions.length} onClick={() => onNavigate(session.questionIndex + 1)}>{t('下一题', 'Next')}<ChevronRight size={18} /></button></div>
      </section>
      <aside className="panel navigator-panel"><div className="navigator-heading"><h2>{t('题号导航', 'Questions')}</h2><span className="small muted">{t(`已答 ${answered} / ${questions.length}`, `${answered} / ${questions.length} answered`)}</span></div>
        <div className="question-nav" aria-label={t('题号导航', 'Question navigation')}>{questions.map((item, index) => <button key={item.id} onClick={() => onNavigate(index)} className={`question-number ${index === session.questionIndex ? 'current' : ''} ${session.answers[item.id] !== undefined ? 'answered' : ''} ${session.flags.includes(item.id) ? 'flagged' : ''}`} aria-current={index === session.questionIndex ? 'step' : undefined} aria-label={t(`第 ${index + 1} 题${session.answers[item.id] !== undefined ? '，已答' : '，未答'}${session.flags.includes(item.id) ? '，待检查' : ''}`, `Question ${index + 1}, ${session.answers[item.id] !== undefined ? 'answered' : 'unanswered'}${session.flags.includes(item.id) ? ', flagged' : ''}`)}>{index + 1}</button>)}</div>
        <div className="nav-legend"><span><i className="answered" />{t('已答', 'Answered')}</span><span><i />{t('未答', 'Unanswered')}</span><span><Flag size={16} />{t('待检查', 'Flagged')}</span></div>
        <div className="navigator-bottom"><p className="muted">{session.mode === 'mock' ? section.limitSeconds === null ? t('本卷不限时。提交后答案锁定，不能返回修改。', 'This paper is untimed. Submission locks its answers.') : t('每卷 / 模块独立计时。提交后不能返回；时间到自动提交。', 'Each section is timed separately. Submission locks the section; timeouts submit automatically.') : t('时间到自动交卷（限时模式）。未答题单独统计。', 'Timed sets submit automatically on expiry. Unanswered questions are counted separately.')}</p><button className="button primary full" onClick={() => setConfirm(true)}>{submitText}</button></div>
      </aside>
    </div>
    <p className={`autosave-note ${canSave ? '' : 'storage-error'}`}><Save size={16} />{canSave ? t('答案已在本地浏览器自动保存。刷新后可继续，倒计时不会重置。', 'Answers are autosaved in this browser. Reload to resume; the timer does not reset.') : t('当前无法写入浏览器存储，答案仅在此页面内保留，请勿刷新。', 'Browser storage is unavailable. Answers are held in this page only; do not reload.')}</p>
    <ConfirmDialog open={confirm} title={submitText} confirmLabel={submitText} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); onSubmit(); }}>
      <p>{t(`本部分已答 ${answered} / ${questions.length}，未答 ${questions.length - answered}，标记待检查 ${flagged}。`, `This section: ${answered} / ${questions.length} answered, ${questions.length - answered} unanswered, ${flagged} flagged.`)}</p><p>{hasNextSection ? t('提交后本部分答案锁定，接着进入下一部分。', 'Submission locks this section, then you can start the next one.') : linked ? t('确认后显示原始分与官方英文详解链接。未答题不计为答对。', 'Submission shows raw marks and official English solution links. Unanswered questions do not count as correct.') : t('确认交卷后将显示结果和解析。未答题不计为答对。', 'Submission shows results and explanations. Unanswered questions do not count as correct.')}</p>
    </ConfirmDialog>
  </>;
}
