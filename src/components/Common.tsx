import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertCircle, ExternalLink, Info } from 'lucide-react';
import { useI18n } from '../i18n';
import { OFFICIAL_LINKS, RULES_VERIFIED } from '../data/catalog';

export function PageHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>;
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'error' }) {
  return <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'note'}>{tone === 'info' ? <Info size={18} /> : <AlertCircle size={18} />}<div>{children}</div></div>;
}
export function DemoNotice() {
  const { t } = useI18n();
  return <Notice tone="warning">{t('当前题库为原创示例题，用于验证练习流程，不是官方真题。', 'All current questions are original demos for testing the practice flow, not official exam questions.')}</Notice>;
}
export function PrivacyNote() {
  const { t } = useI18n();
  return <p className="privacy-note"><Info size={17} /><span>{t('练习记录和错题仅保存在当前浏览器，尚未跨设备同步。清除浏览器数据会删除记录。', 'Practice records and mistakes are saved in this browser only and are not synced across devices. Clearing browser data deletes them.')}</span></p>;
}
export function RulesCard() {
  const { t } = useI18n();
  return <section className="panel rules-panel" aria-label={t('考试结构', 'Test structure')}>
    <h2>{t('考试结构', 'Test structure')}</h2>
    <div className="rule-line"><strong>TMUA</strong><span>{t('每卷 20 题 / 75 分钟，共两卷', '20 questions / 75 min per paper, two papers')}</span></div>
    <div className="rule-line"><strong>ESAT</strong><span>{t('每模块 27 题 / 40 分钟，独立计时', '27 questions / 40 min per module, timed separately')}</span></div>
    <p className="muted small">{t('示例题不足，仅提供按题量比例缩短的流程体验。无计算器；不换算官方 1–9 分。', 'The demo uses fewer questions and proportionally shorter timers. No calculator; no conversion to official 1–9 scores.')}</p>
    <div className="official-links">{(['TMUA', 'ESAT'] as const).map(exam => <a key={exam} href={OFFICIAL_LINKS[exam]} target="_blank" rel="noreferrer">{exam} {t('官方说明', 'official guide')}<ExternalLink size={13} /></a>)}</div>
    <p className="small rule-status">{RULES_VERIFIED ? t('规则核实日期：2026-10-11。考点分类为原型分类，并非完整考纲。', 'Rules checked: 11 Oct 2026. Prototype topic tags are not the complete syllabus.') : t('官方网页访问待恢复，规则暂按用户提供的结构实现，尚未核实最新考纲。', 'Official access is pending. Structure follows the user-provided rules; the latest specification is not yet verified.')}</p>
  </section>;
}
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, danger = false }: { open: boolean; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { t } = useI18n();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby={id} onCancel={e => { e.preventDefault(); onCancel(); }}>
    <h2 id={id}>{title}</h2><div className="dialog-content">{children}</div>
    <div className="dialog-actions"><button autoFocus className="button secondary" onClick={onCancel}>{t('取消', 'Cancel')}</button><button className={`button ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>;
}
