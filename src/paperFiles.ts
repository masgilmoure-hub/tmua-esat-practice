export const PDF_DATABASE = 'tmua-esat-files:v1';
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export interface PaperFile {
  key: string;
  file: Blob;
  name: string;
  hash: string;
  pages: Record<string, number>;
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDF_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('papers', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database upgrade blocked'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('papers', mode);
    const request = action(tx.objectStore('papers'));
    tx.oncomplete = () => { database.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { database.close(); reject(tx.error ?? request.error ?? new Error('Storage unavailable')); };
  });
}
export async function readPaper(key: string): Promise<PaperFile | null> {
  const value: unknown = await transaction('readonly', store => store.get(key));
  if (value === undefined) return null;
  if (!value || typeof value !== 'object' || !('key' in value) || value.key !== key
    || !('file' in value) || !(value.file instanceof Blob) || value.file.size > MAX_PDF_BYTES
    || !('name' in value) || typeof value.name !== 'string'
    || !('hash' in value) || typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash)
    || !('pages' in value) || !value.pages || typeof value.pages !== 'object' || Array.isArray(value.pages)
    || Object.entries(value.pages).some(([q, page]) => !/^(?:[1-9]|1[0-9]|20)$/.test(q) || !Number.isInteger(page) || Number(page) < 1 || Number(page) > 500)) throw new Error('Unreadable saved paper');
  return value as PaperFile;
}
export const writePaper = (paper: PaperFile) => transaction('readwrite', store => store.put(paper));
export const removePaper = (key: string) => transaction('readwrite', store => store.delete(key));

export async function pdfBytes(file: Blob): Promise<{ bytes: Uint8Array; hash: string }> {
  if (!file.size || file.size > MAX_PDF_BYTES) throw new Error('size');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('format');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  return { bytes, hash };
}

export interface PositionedText { str: string; transform: number[] }
// Only store a question-to-page index, never extracted question text.
export function questionNumbers(items: PositionedText[], width: number, height: number): number[] {
  const rows = new Map<number, PositionedText[]>();
  for (const item of items) {
    const y = Math.round(item.transform[5] / 3) * 3;
    if (!item.str.trim() || y < height * .2) continue;
    const row = rows.get(y) ?? []; row.push(item); rows.set(y, row);
  }
  const found = new Set<number>();
  for (const row of rows.values()) {
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    const first = row[0];
    if (first.transform[4] > width * .14) continue;
    const digits = (s: string) => s.trim().replace(/[Ͳͳʹ͵Ͷͷ͸͹ͺͻ]/g, c => String('Ͳͳʹ͵Ͷͷ͸͹ͺͻ'.indexOf(c)));
    let label = digits(first.str);
    if (/^[12]$/.test(label) && row[1] && /^\d$/.test(digits(row[1].str)) && row[1].transform[4] - first.transform[4] < 15) label += digits(row[1].str);
    const match = /^([1-9]|1[0-9]|20)(?:\s|$)/.exec(label);
    if (match) found.add(Number(match[1]));
  }
  return [...found];
}
