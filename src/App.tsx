import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { LanguageProvider, useI18n } from './i18n';
import { useQuestionBank } from './useQuestionBank';
import { usePracticeStore } from './usePracticeStore';
import { Header, type Page } from './components/Header';
import { ConfirmDialog, Notice } from './components/Common';
import { QuestionBank, initialFilters } from './features/QuestionBank';
import { PastPapers } from './features/PastPapers';
import { MockSetup } from './features/MockSetup';
import { Session } from './features/Session';
import { Results } from './features/Results';
import { History } from './features/History';
import { closeSection, createSession, isExpired, startNextSection } from './domain';
import type { ActiveSession, Filters, Language, Question, Section } from './types';

type PendingStart = { questions: Question[]; sections: Section[]; mode: ActiveSession['mode'] };
function PracticeApp({ store }: { store: ReturnType<typeof usePracticeStore> }) {
  const { state, setState, issue, clear } = store;
  const { t } = useI18n();
  const bank = useQuestionBank();
  const [page, setPage] = useState<Page>(() => state.active ? 'session' : 'bank');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<PendingStart | null>(null);

  const finish = useCallback(() => {
    const active = state.active;
    if (!active || active.phase !== 'answering') return;
    const now = Date.now();
    setState(current => {
      if (!current.active || current.active.id !== active.id || current.active.sectionIndex !== active.sectionIndex || current.active.phase !== 'answering') return current;
      const ended = closeSection(current.active, now);
      return { ...current, active: ended.active, results: ended.result ? [...current.results, ended.result].slice(-200) : current.results };
    });
    if (active.sectionIndex + 1 < active.sections.length) setPage('session');
    else { setSelectedResult(active.id); setPage('result'); }
  }, [state.active, setState]);

  useEffect(() => {
    const active = state.active;
    if (!active || active.phase !== 'answering' || active.sections[active.sectionIndex].limitSeconds === null) return;
    const check = () => { if (isExpired(active)) finish(); };
    check();
    const timer = window.setInterval(check, 250);
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [state.active, finish]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [page]);
  const activate = (plan: PendingStart) => {
    const active = createSession(plan.questions, plan.sections, plan.mode);
    setState(s => ({ ...s, active }));
    setPendingStart(null); setPage('session');
  };
  const requestStart = (plan: PendingStart) => { if (state.active) setPendingStart(plan); else activate(plan); };
  const practice = (questions: Question[], limitSeconds: number | null) => {
    if (!questions.length) return;
    requestStart({ questions, sections: [{ moduleId: questions[0].moduleId, questionIds: questions.map(q => q.id), limitSeconds }], mode: 'practice' });
  };
  const updateActive = (change: (active: ActiveSession) => ActiveSession) => setState(s => s.active ? { ...s, active: change(s.active) } : s);
  const result = state.results.find(r => r.id === selectedResult);
  const storageMessage = issue === 'unavailable' ? t('浏览器存储不可用或已满。当前练习仅保留在页面内，请勿刷新。', 'Browser storage is unavailable or full. This attempt is held in memory only; do not reload.') : t('本地记录格式无法读取，原数据未覆盖。当前练习仅保留在页面内；可在“练习记录”中明确清空后恢复保存。', 'Local records could not be read and were not overwritten. New attempts are held in memory; explicitly clear local data in Records to restore saving.');
  return <>
    <a className="skip-link" href="#main">{t('跳到主要内容', 'Skip to main content')}</a>
    <Header page={page} sessionMode={state.active?.mode} linkedSession={state.active?.questions.some(q => !!q.external)} onNavigate={setPage} />
    <main id="main" className="main-container">
      {issue ? <Notice tone="error">{storageMessage}</Notice> : null}
      {state.active && page !== 'session' ? <div className="resume-banner"><div><strong>{t('有一份未完成的练习', 'You have an unfinished set')}</strong><p>{t('答案已保留；限时练习仍在计时。', 'Your answers are retained; timed sets keep counting down.')}</p></div><button className="button outline compact" onClick={() => setPage('session')}>{t('继续练习', 'Resume')}<ArrowRight size={16} /></button></div> : null}
      {page === 'bank' || page === 'practice' ? <QuestionBank bank={bank} filters={filters} onFilters={setFilters} results={state.results} onPractice={practice} onArchive={() => setPage('past-papers')} trainingPage={page === 'practice'} /> : null}
      {page === 'past-papers' ? <PastPapers onStart={(questions, sections) => requestStart({ questions, sections, mode: 'mock' })} /> : null}
      {page === 'mock' ? <MockSetup onStart={(questions, sections) => requestStart({ questions, sections, mode: 'mock' })} /> : null}
      {page === 'session' && state.active ? <Session key={`${state.active.id}-${state.active.sectionIndex}-${state.active.phase}`} session={state.active}
        onAnswer={(id, answer) => updateActive(active => isExpired(active) || active.phase !== 'answering' ? active : { ...active, answers: { ...active.answers, [id]: answer } })}
        onFlag={id => updateActive(active => isExpired(active) || active.phase !== 'answering' ? active : { ...active, flags: active.flags.includes(id) ? active.flags.filter(item => item !== id) : [...active.flags, id] })}
        onNavigate={index => updateActive(active => active.phase === 'answering' && index >= 0 && index < active.sections[active.sectionIndex].questionIds.length ? { ...active, questionIndex: index } : active)}
        onSubmit={finish} onNextSection={() => updateActive(active => startNextSection(active))} canSave={!issue} /> : null}
      {page === 'result' && result ? <Results key={result.id} result={result} results={state.results} questions={bank.questions} onRetry={practice} onBank={() => setPage('bank')} /> : null}
      {page === 'history' ? <History questions={bank.questions} results={state.results} onResult={id => { setSelectedResult(id); setPage('result'); }} onPractice={practice} onClear={() => { clear(); setSelectedResult(null); }} onBank={() => setPage('bank')} /> : null}
      {(page === 'session' && !state.active) || (page === 'result' && !result) ? <Notice>{t('这份练习已结束或记录已清空。', 'This attempt has ended or the record was cleared.')} <button className="text-button" onClick={() => setPage('bank')}>{t('返回题库', 'Back to question bank')}</button></Notice> : null}
    </main>
    <footer className="site-footer"><span>TMUA / ESAT practice</span><span>{t('练习原型 · 本地题库与记录 · 无账号', 'Practice prototype · local bank and records · no accounts')}</span></footer>
    <ConfirmDialog open={pendingStart !== null} title={t('替换未完成的练习？', 'Replace your unfinished set?')} confirmLabel={t('替换并开始', 'Replace & start')} danger onCancel={() => setPendingStart(null)} onConfirm={() => { if (pendingStart) activate(pendingStart); }}><p>{t('开始新练习将丢弃尚未提交的答案。已完成的练习记录不受影响。', 'Starting a new set discards unsubmitted answers. Completed records are kept.')}</p></ConfirmDialog>
  </>;
}

export default function App() {
  const store = usePracticeStore();
  const changeLanguage = useCallback((language: Language) => store.setState(s => ({ ...s, language })), [store.setState]);
  useEffect(() => { document.documentElement.lang = store.state.language === 'zh' ? 'zh-CN' : 'en'; }, [store.state.language]);
  return <LanguageProvider lang={store.state.language} onChange={changeLanguage}><PracticeApp store={store} /></LanguageProvider>;
}
