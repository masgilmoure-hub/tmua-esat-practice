import { NATIVE_QUESTION_COUNT, NATIVE_PAPER_YEARS, PDF_EXPLANATION_PAPER_YEARS } from '../data/pastPapers';
import { MathText } from '../components/QuestionContent';
import { SearchableFilter } from '../components/SearchableFilter';
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useI18n } from '../i18n';
import { DIFFICULTIES, MODULES } from '../data/catalog';
import { BankManager } from './BankManager';
import type { useQuestionBank } from '../useQuestionBank';
import { filterQuestions, latestOutcomes, sampleQuestions } from '../domain';
import type { Bilingual, Filters, Question, Result } from '../types';
import { DemoNotice, Notice, PageHeading, PrivacyNote, RulesCard } from '../components/Common';

export const initialFilters = (): Filters => ({ exam: 'TMUA', moduleId: 'all', topic: 'all', subtopic: 'all', source: 'all', status: 'all', difficulty: 'all', year: 'all', delivery: 'all' });
function FilterRow({ label, choices, value, onChange }: { label: string; choices: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return <fieldset className="filter-row"><legend>{label}</legend><div className="filter-choices">{choices.map(choice => <button key={choice.id} type="button" className={`filter-chip ${choice.id === value ? 'selected' : ''}`} aria-pressed={value === choice.id} onClick={() => onChange(choice.id)}>{choice.label}</button>)}</div></fieldset>;
}

export function QuestionBank({ bank, filters, onFilters, results, onPractice, onArchive, trainingPage = false }: { bank: ReturnType<typeof useQuestionBank>; filters: Filters; onFilters: (filters: Filters) => void; results: Result[]; onPractice: (questions: Question[], limitSeconds: number | null) => void; onArchive: () => void; trainingPage?: boolean }) {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(3);
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const questions = bank.questions;
  const matched = useMemo(() => filterQuestions(questions, filters, results), [questions, filters, results]);
  const outcomes = latestOutcomes(results);
  const base = questions.filter(q => q.exam === filters.exam && (filters.moduleId === 'all' || q.moduleId === filters.moduleId) && (!filters.year || filters.year === 'all' || String(q.source.year) === filters.year) && (!filters.delivery || filters.delivery === 'all' || (filters.delivery === 'pdf' ? !!q.external : !q.external)));
  const years = [...new Set(questions.filter(q => q.exam === filters.exam && q.source.year !== null).map(q => q.source.year!))].sort((a,b) => b-a);
  const topics = new Map<string, Bilingual>(base.map(q => [q.topic.id, q.topic.name]));
  const subtopics = new Map<string, Bilingual>(base.filter(q => filters.topic === 'all' || q.topic.id === filters.topic).map(q => [q.subtopic.id, q.subtopic.name]));
  const all = { id: 'all', label: t('全部', 'All') };
  const change = (next: Partial<Filters>) => { onFilters({ ...filters, ...next }); setPage(0); };
  const pageCount = Math.max(1, Math.ceil(matched.length / 6));
  const actualPage = Math.min(page, pageCount - 1);
  const actualCount = Math.max(1, Math.min(count, matched.length || 1));
  return <>
    <PageHeading title={trainingPage ? t('有目标地练习，逐步突破。', 'Focused practice. Steady progress.') : t('把练习，做得更有方向。', 'Give your practice a clear direction.')} subtitle={t('按知识点找到题目，从每一次练习中看见进步。', 'Find questions by topic and learn from every attempt.')} />
    <a href="#training-settings" className="button outline mobile-training-link">{t('设置专项训练', 'Set up practice')}<ArrowRight size={16} /></a>
    {questions.every(q => q.source.kind === 'original-demo') ? <DemoNotice /> : <Notice>{t('题目按文件声明的来源展示。导入材料仅保存在当前浏览器，专项训练不代表完整官方模考。', 'Sources reflect file declarations. Imports are stored in this browser; focused practice is not a full official mock.')}</Notice>}
    <div className="official-entry"><div><strong>{t('想练官方历年真题？', 'Ready for official past papers?')}</strong><p className="small muted">{t(`TMUA 2016–2023 · ${NATIVE_PAPER_YEARS.join('、')} 年共 ${NATIVE_QUESTION_COUNT} 题可直接作答；其余 ${320-NATIVE_QUESTION_COUNT} 题使用原卷阅读器，其中 ${PDF_EXPLANATION_PAPER_YEARS.join("、")} 年已提供双语解析`, `TMUA 2016–2023 · ${NATIVE_QUESTION_COUNT} text questions from ${NATIVE_PAPER_YEARS.join(', ')}; ${320-NATIVE_QUESTION_COUNT} use the paper reader, including bilingual explanations for ${PDF_EXPLANATION_PAPER_YEARS.join(", ")}`)}</p></div><button className="button outline compact" onClick={onArchive}>{t('打开官方历年卷', 'Browse past papers')}<ArrowRight size={16} /></button></div>
    <BankManager bank={bank} />
    <div className="two-columns bank-layout">
      <section className="panel bank-panel" aria-label={t('题库筛选和题目', 'Question filters and list')}>
        <fieldset className="exam-tabs"><legend className="sr-only">{t('考试', 'Exam')}</legend>{(['TMUA', 'ESAT'] as const).map(exam => <button key={exam} className={filters.exam === exam ? 'selected' : ''} aria-pressed={filters.exam === exam} onClick={() => { onFilters({ ...initialFilters(), exam }); setPage(0); }}>{exam}</button>)}</fieldset>
        <div className="filters">
          <FilterRow label={t('试卷 / 科目', 'Paper / subject')} value={filters.moduleId} choices={[all, ...MODULES.filter(m => m.exam === filters.exam).map(m => ({ id: m.id, label: m.id.startsWith('p') && m.id !== 'physics' ? m.id === 'p1' ? 'Paper 1' : 'Paper 2' : m.name[lang] }))]} onChange={id => change({ moduleId: id, topic: 'all', subtopic: 'all' })} />
          <FilterRow label={t('知识点', 'Topic')} value={filters.topic} choices={[all, ...[...topics].map(([id, name]) => ({ id, label: name[lang] }))]} onChange={id => change({ topic: id, subtopic: 'all' })} />
          <SearchableFilter key={`${filters.exam}:${filters.moduleId}:${filters.topic}:${filters.year}:${filters.delivery}:${lang}`} label={t('细分考点', 'Subtopic')} value={filters.subtopic} choices={[{ ...all, searchText: '全部 All' }, ...[...subtopics].map(([id, name]) => ({ id, label: name[lang], searchText: `${name.zh} ${name.en}` }))]} onChange={id => change({ subtopic: id })} />
          <FilterRow label={t('来源', 'Source')} value={filters.source} choices={[all, { id: 'original-demo', label: t('原创示例', 'Original demo') }, { id: 'official-public', label: questions.some(q => q.source.kind === 'official-public') ? t('官方公开材料', 'Official public material') : t('官方公开材料（待导入）', 'Official public material (not imported)') }]} onChange={id => change({ source: id })} />
          <FilterRow label={t('年份', 'Year')} value={filters.year ?? 'all'} choices={[all, ...years.map(year => ({ id: String(year), label: String(year) }))]} onChange={id => change({ year: id, topic: 'all', subtopic: 'all' })} />
          <FilterRow label={t('作答方式', 'Question format')} value={filters.delivery ?? 'all'} choices={[all, { id: 'native', label: t('文字题 · 直接作答', 'Text questions · direct answers') }, { id: 'pdf', label: t('PDF 原卷答题卡', 'PDF answer sheets') }]} onChange={id => change({ delivery: id as Filters['delivery'], topic: 'all', subtopic: 'all' })} />
          <FilterRow label={t('难度', 'Difficulty')} value={filters.difficulty} choices={[all, ...Object.entries(DIFFICULTIES).map(([id, name]) => ({ id, label: name[lang] }))]} onChange={id => change({ difficulty: id as Filters['difficulty'] })} />
          <FilterRow label={t('做题状态', 'Attempt status')} value={filters.status} choices={[all, { id: 'new', label: t('未做', 'Unattempted') }, { id: 'done', label: t('已做', 'Attempted') }, { id: 'wrong', label: t('错题', 'Mistakes') }]} onChange={id => change({ status: id as Filters['status'] })} />
        </div>
        <p className="small muted difficulty-note">{t('难度为教学估计或导入文件标注，未经官方标定；旧题未标注时仍可筛选。', 'Difficulty is a teaching estimate or an imported label, not an official calibration. Unrated questions remain filterable.')}</p>
        <div className="list-toolbar"><strong aria-live="polite">{matched.every(q => q.source.kind === 'original-demo') ? t(`找到 ${matched.length} 道示例题`, `${matched.length} demo questions found`) : t(`找到 ${matched.length} 道题`, `${matched.length} questions found`)}</strong><button className="text-button" onClick={() => { onFilters({ ...initialFilters(), exam: filters.exam }); setPage(0); }}><RotateCcw size={14} />{t('重置筛选', 'Reset filters')}</button></div>
        {matched.length ? <>
          <div className="question-table-wrap"><table className="question-table"><thead><tr><th>{t('题目 / 考点', 'Question / topic')}</th><th>{t('试卷 / 科目', 'Paper / subject')}</th><th>{t('状态', 'Status')}</th><th><span className="sr-only">{t('操作', 'Action')}</span></th></tr></thead><tbody>
            {matched.slice(actualPage * 6, actualPage * 6 + 6).map(q => <tr key={q.id}>
              <td><div className="question-id">{q.source.kind === 'original-demo' ? 'DEMO' : 'PUBLIC MATERIAL'} · {q.id} · {DIFFICULTIES[q.difficulty ?? 'unrated'][lang]}</div><div lang="en" className="question-preview"><MathText text={q.prompt} format={q.format} /></div><div className="topic-label">{q.topic.name[lang]} / {q.subtopic.name[lang]}</div><div className="small muted question-provenance">{q.source.title[lang]} · {q.source.originalNumber}{q.source.year ? ` · ${q.source.year}` : ''}</div></td>
              <td className="module-cell">{q.moduleId === 'p1' ? 'Paper 1' : q.moduleId === 'p2' ? 'Paper 2' : MODULES.find(m => m.id === q.moduleId)?.name[lang]}</td>
              <td><span className={`status ${outcomes[q.id] === 'correct' ? 'correct' : outcomes[q.id] ? 'wrong' : ''}`}>{outcomes[q.id] === undefined ? t('未做', 'New') : outcomes[q.id] === 'correct' ? t('正确', 'Correct') : outcomes[q.id] === 'unanswered' ? t('未答', 'Skipped') : t('错题', 'Wrong')}</span></td>
              <td><button className="button outline compact" onClick={() => onPractice([q], null)} aria-label={t(`练习 ${q.id}`, `Practice ${q.id}`)}>{t('练习', 'Practice')}</button></td>
            </tr>)}
          </tbody></table></div>
          {pageCount > 1 ? <div className="pagination"><button className="button secondary compact" disabled={actualPage === 0} onClick={() => setPage(actualPage - 1)} aria-label={t('上一页', 'Previous page')}><ChevronLeft size={16} /></button><span>{actualPage + 1} / {pageCount}</span><button className="button secondary compact" disabled={actualPage + 1 >= pageCount} onClick={() => setPage(actualPage + 1)} aria-label={t('下一页', 'Next page')}><ChevronRight size={16} /></button></div> : null}
        </> : <div className="empty-state"><h3>{t('没有符合条件的题目', 'No matching questions')}</h3><p>{filters.source === 'official-public' && !questions.some(q => q.source.kind === 'official-public') ? t('尚未导入官方公开材料。可选择原创示例体验流程。', 'Official public material has not been imported. Select original demos to try the flow.') : t('试试其他条件。错题包含最近一次提交答错或未答的题目。', 'Try another filter. Mistakes include incorrect and unanswered questions from the latest attempt.')}</p></div>}
      </section>
      <aside className="sidebar-stack"><section className="panel training-panel" id="training-settings">
        <h2>{t('开始专项训练', 'Start focused practice')}</h2><p className="muted">{t('使用当前筛选结果随机组题', 'A random set from your current filters')}</p>
        <div className="form-field"><label htmlFor="practice-count">{t('题目数量', 'Number of questions')}</label><select id="practice-count" value={actualCount} disabled={!matched.length} onChange={e => setCount(Number(e.target.value))}>{Array.from({ length: matched.length || 1 }, (_, i) => <option key={i + 1} value={i + 1}>{t(`${i + 1} 道`, `${i + 1} question${i ? 's' : ''}`)}</option>)}</select></div>
        <label className="switch-row"><span>{t('限时训练', 'Timed practice')}</span><input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>
        {timed ? <label className="form-field">{t('时间（分钟）', 'Time limit (minutes)')}<input type="number" min="1" max="120" value={minutes} onChange={e => setMinutes(e.target.value === '' ? 1 : Math.max(1, Math.min(120, Number(e.target.value))))} /></label> : null}
        <button className="button primary full" disabled={!matched.length} onClick={() => onPractice(sampleQuestions(matched, actualCount), timed ? minutes * 60 : null)}>{t('开始训练', 'Start practice')}<ArrowRight size={18} /></button>
        <p className="small muted">{t(`本次将随机选取 ${matched.length ? actualCount : 0} 道，不重复出题。`, `${matched.length ? actualCount : 0} questions will be sampled without duplicates.`)}</p>
        <PrivacyNote />
      </section><RulesCard /></aside>
    </div>
  </>;
}
