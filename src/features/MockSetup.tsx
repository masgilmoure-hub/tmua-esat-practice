import { useState } from 'react';
import { ArrowRight, Clock, LockKeyhole } from 'lucide-react';
import { useI18n } from '../i18n';
import { MODULES } from '../data/catalog';
import { QUESTIONS } from '../data/questions';
import { formatTime, scaledLimit } from '../domain';
import type { Exam, ModuleId, Question, Section } from '../types';
import { DemoNotice, Notice, PageHeading, PrivacyNote, RulesCard } from '../components/Common';

export function MockSetup({ onStart }: { onStart: (questions: Question[], sections: Section[]) => void }) {
  const { t, lang } = useI18n();
  const [exam, setExam] = useState<Exam>('TMUA');
  const [selected, setSelected] = useState<ModuleId[]>(['m1', 'm2', 'physics']);
  const modules = MODULES.filter(m => m.exam === exam && (exam === 'TMUA' || selected.includes(m.id)));
  const sections = modules.map(m => { const questionIds = QUESTIONS.filter(q => q.moduleId === m.id).map(q => q.id); return { moduleId: m.id, questionIds, limitSeconds: scaledLimit(m.id, questionIds.length) }; });
  const totalQuestions = sections.reduce((n, s) => n + s.questionIds.length, 0);
  const totalSeconds = sections.reduce((n, s) => n + (s.limitSeconds ?? 0), 0);
  return <>
    <PageHeading title={t('熟悉节奏，再走进考场。', 'Get to know the test rhythm.')} subtitle={t('体验倒计时、题号导航和分卷交卷；这不是完整官方模考。', 'Try the timer, question navigation and section submission. This is not a full official mock.')} />
    <DemoNotice />
    <div className="two-columns">
      <section className="panel mock-panel"><h2>{t('设置示例模考', 'Set up a demo mock')}</h2>
        <fieldset className="exam-tabs"><legend className="sr-only">{t('考试', 'Exam')}</legend>{(['TMUA', 'ESAT'] as const).map(e => <button key={e} className={exam === e ? 'selected' : ''} aria-pressed={exam === e} onClick={() => setExam(e)}>{e}</button>)}</fieldset>
        {exam === 'ESAT' ? <>
          <fieldset className="module-selection"><legend>{t('选择模块', 'Choose modules')}</legend>{MODULES.filter(m => m.exam === 'ESAT').map(m => <label className={`module-option ${selected.includes(m.id) ? 'selected' : ''}`} key={m.id}><input type="checkbox" checked={selected.includes(m.id)} disabled={m.id === 'm1'} onChange={() => setSelected(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} /><span>{m.name[lang]}</span>{m.id === 'm1' ? <span className="required-note"><LockKeyhole size={13} />{t('必考', 'Required')}</span> : null}</label>)}</fieldset>
          <Notice>{t('所有考生须考 Mathematics 1，多数课程还要求两个模块。此处可选择不同组合体验流程，正式报考请核对院校课程要求。', 'All candidates take Mathematics 1; most courses require two further modules. Try different combinations here, and check your university’s course requirements before booking.')}</Notice>
        </> : <p className="muted">{t('依次体验 Paper 1（数学应用）与 Paper 2（数学推理）。两卷独立计时，已提交的试卷不可返回。', 'Take Paper 1 (applications) followed by Paper 2 (reasoning). Each has its own timer; a submitted paper cannot be revisited.')}</p>}
        <div className="mock-sections">{modules.map((m, i) => <div className="mock-section-row" key={m.id}><span className="section-number">{i + 1}</span><div><h3>{m.name[lang]}</h3><p className="muted small">{t(`官方结构：${m.questions} 题 / ${m.minutes} 分钟`, `Official structure: ${m.questions} questions / ${m.minutes} minutes`)}</p><p>{t(`当前仅 ${sections[i].questionIds.length} 道原创示例`, `Only ${sections[i].questionIds.length} original demos available`)}</p></div><span className="section-time"><Clock size={16} />{formatTime(sections[i].limitSeconds ?? 0)}</span></div>)}</div>
        <Notice tone="warning">{t('示例题数量不足，计时按“官方时长 × 示例题数 ÷ 官方题数”向下取整。本流程不代表官方难度或完整考纲覆盖。', 'Too few questions for a full mock. Timers use floor(official duration × demo count ÷ official count). This flow does not represent official difficulty or full syllabus coverage.')}</Notice>
        <div className="mock-start"><span>{t(`共 ${totalQuestions} 道示例题 · 总限时 ${formatTime(totalSeconds)}`, `${totalQuestions} demos · total limit ${formatTime(totalSeconds)}`)}</span><button className="button primary" onClick={() => onStart(QUESTIONS.filter(q => sections.some(s => s.questionIds.includes(q.id))), sections)}>{t('开始缩短版示例模考', 'Start shortened demo mock')}<ArrowRight size={18} /></button></div>
      </section><aside className="sidebar-stack"><RulesCard /><PrivacyNote /></aside>
    </div>
  </>;
}
