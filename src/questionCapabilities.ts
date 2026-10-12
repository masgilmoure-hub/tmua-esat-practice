import type { Question } from './types';

// Reading format and reviewed content are separate capabilities. Older PDF
// snapshots without the explicit flag continue to show only solution links.
export const hasBilingualExplanation = (q: Question) => !q.external || q.external.explanationReady === true;
export const hasTopicClassification = (q: Question) => q.topic.id !== 'unclassified-paper';
