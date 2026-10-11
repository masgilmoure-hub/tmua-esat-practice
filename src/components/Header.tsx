import { BookOpen } from 'lucide-react';
import { useI18n } from '../i18n';

export type Page = 'bank' | 'practice' | 'past-papers' | 'mock' | 'history' | 'session' | 'result';
export function Header({ page, sessionMode, linkedSession, onNavigate }: { page: Page; sessionMode?: 'practice' | 'mock'; linkedSession?: boolean; onNavigate: (page: Page) => void }) {
  const { lang, t, toggle } = useI18n();
  const selected = page === 'session' ? linkedSession ? 'past-papers' : sessionMode === 'mock' ? 'mock' : 'practice' : page === 'result' ? 'history' : page;
  const nav = [{ id: 'bank', label: t('题库', 'Question bank') }, { id: 'practice', label: t('专项训练', 'Practice') }, { id: 'past-papers', label: t('官方历年卷', 'Past papers') }, { id: 'mock', label: t('示例模考', 'Demo mock') }, { id: 'history', label: t('练习记录', 'Records') }] as const;
  return <header className="header"><div className="header-inner">
    <button className="brand" onClick={() => onNavigate('bank')} aria-label={t('返回题库首页', 'Go to question bank')}><BookOpen size={30} strokeWidth={1.7} /><span><strong>TMUA / ESAT</strong><small>practice</small></span></button>
    <nav aria-label={t('主导航', 'Main navigation')}>{nav.map(item => <button key={item.id} className={selected === item.id ? 'nav-item active' : 'nav-item'} aria-current={selected === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>)}</nav>
    <div className="header-tools"><button className="language-toggle" onClick={toggle} aria-label={lang === 'zh' ? 'Switch language to English' : '切换到中文'}><span className={lang === 'zh' ? 'selected' : ''}>中</span><span className="muted"> / </span><span className={lang === 'en' ? 'selected' : ''}>EN</span></button><span className="header-storage">{t('仅保存在此浏览器', 'Saved in this browser')}</span></div>
  </div></header>;
}
