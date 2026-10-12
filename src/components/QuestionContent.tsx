import { memo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Question } from '../types';

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
  const diagram = question.diagram;
  if (!diagram) return null;
  const embedded = window.__TMUA_QUESTION_IMAGES__?.[diagram.path];
  return <figure className="question-diagram"><img src={embedded ?? `${import.meta.env.BASE_URL}${diagram.path}`} alt={diagram.alt} /><figcaption>Original diagram · TMUA {question.source.year} Paper {question.moduleId === 'p2' ? '2' : '1'} · Question {question.source.originalNumber}</figcaption></figure>;
}
