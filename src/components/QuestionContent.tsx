import { memo, useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Question } from '../types';
import { useI18n } from '../i18n';

// Only explicit $...$ / $$...$$ segments are math. Plain imported text remains plain.
// KaTeX disallows trusted commands such as HTML, scripts and external links.
export const MathText = memo(function MathText({ text, format }: { text: string; format?: 'latex' }) {
  if (format !== 'latex') return <>{text}</>;
  return <>{text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).map((part, i) => {
    if (!part.startsWith('$')) return <span key={i}>{part}</span>;
    const display = part.startsWith('$$');
    const formula = part.slice(display ? 2 : 1, display ? -2 : -1);
    try {
      const html = katex.renderToString(formula, { displayMode: display, throwOnError: true, trust: false, strict: 'error', maxExpand: 1000 });
      return <span key={i} className={display ? 'math-display' : 'math-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span key={i} className="math-error">{part}</span>;
    }
  })}</>;
});

export function QuestionDiagram({ question }: { question: Question }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = modal.current;
    if (!dialog) return;
    if (expanded && !dialog.open) dialog.showModal();
    else if (!expanded && dialog.open) dialog.close();
  }, [expanded]);
  const diagram = question.diagram;
  if (!diagram) return null;
  const embedded = window.__TMUA_QUESTION_IMAGES__?.[diagram.path];
  const src = embedded ?? `${import.meta.env.BASE_URL}${diagram.path}`;
  const caption = `Original diagram · TMUA ${question.source.year} Paper ${question.moduleId === 'p2' ? '2' : '1'} · Question ${question.source.originalNumber}`;
  return <><figure className="question-diagram"><img src={src} alt={diagram.alt} /><figcaption>{caption}</figcaption><button className="text-button" onClick={() => setExpanded(true)}>{t('查看大图', 'Enlarge diagram')}</button></figure>
    <dialog ref={modal} className="diagram-modal" aria-labelledby={`diagram-title-${question.id}`} onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)}>
      <div className="diagram-modal-header"><strong id={`diagram-title-${question.id}`}>{caption}</strong><button className="button secondary compact" onClick={() => setExpanded(false)}>{t('关闭大图', 'Close diagram')}</button></div>
      <p className="small muted">{t('可滚动查看原图；限时练习仍在计时。', 'Scroll to inspect the original image; timed practice keeps counting down.')}</p>
      <div className="diagram-original">{expanded ? <img src={src} alt={diagram.alt} /> : null}</div>
    </dialog></>;
}
