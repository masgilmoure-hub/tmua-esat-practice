import data from './data/local-papers.json';
export const LOCAL_PAPERS = data.papers;
export const localPaper = (year: number | null, moduleId: string) => LOCAL_PAPERS.find(paper => paper.year === year && paper.moduleId === moduleId);
export const localPaperUrl = (filename: string) => new URL(`papers/${filename}`, window.location.href).href;
export async function localPaperBlob(filename: string): Promise<Blob> {
  const embedded = (globalThis as typeof globalThis & { __TMUA_LOCAL_PAPERS__?: Record<string, string> }).__TMUA_LOCAL_PAPERS__?.[filename];
  if (embedded) return new Blob([Uint8Array.from(atob(embedded), char => char.charCodeAt(0))], { type: 'application/pdf' });
  const response = await fetch(localPaperUrl(filename));
  if (!response.ok) throw new Error('asset');
  return response.blob();
}
export function openLocalPaper(filename: string) {
  const embedded = (globalThis as typeof globalThis & { __TMUA_LOCAL_PAPERS__?: Record<string, string> }).__TMUA_LOCAL_PAPERS__?.[filename];
  if (!embedded) { window.open(localPaperUrl(filename), '_blank', 'noopener,noreferrer'); return; }
  const blob = new Blob([Uint8Array.from(atob(embedded), char => char.charCodeAt(0))], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
