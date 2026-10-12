import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useI18n } from '../i18n';
import { localPaper, localPaperBlob } from '../localPapers';
import { PAST_PAPERS } from '../data/pastPapers';
import { pdfBytes, questionNumbers, readPaper, removePaper, writePaper, type PaperFile } from '../paperFiles';
import { ConfirmDialog } from '../components/Common';
import type { Question } from '../types';

export default function PaperReader({ question }: { question: Question }) {
  const { t, lang } = useI18n();
  const inputId = useId();
  const key = `${question.source.year}-${question.moduleId}`;
  const number = Number(question.source.originalNumber);
  const bundled = localPaper(question.source.year, question.moduleId);
  const canonical = PAST_PAPERS.find(paper => paper.year === question.source.year && paper.moduleId === question.moduleId);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [record, setRecord] = useState<PaperFile | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [painted, setPainted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState<'invalid' | 'size' | 'unavailable' | 'render' | 'unreadable' | 'asset' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [personal, setPersonal] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const task = useRef<PDFDocumentLoadingTask | null>(null);
  const operation = useRef(0);
  const blocked = useRef(false);

  async function load(file: Blob, saved: PaperFile | null, name: string, token: number, bundledPages?: Record<string, number>) {
    const { bytes, hash } = await pdfBytes(file);
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = (globalThis as typeof globalThis & { __TMUA_PDF_WORKER_URL__?: string }).__TMUA_PDF_WORKER_URL__ ?? workerUrl;
    if (token !== operation.current) return;
    setDocument(null);
    await task.current?.destroy();
    const loading = pdfjs.getDocument({ data: bytes, enableXfa: false, useSystemFonts: true });
    // Password-protected papers are not supported; fail visibly rather than wait forever.
    loading.onPassword = () => { void loading.destroy(); };
    task.current = loading;
    const pdf = await loading.promise;
    if (pdf.numPages > 500) { await loading.destroy(); throw new Error('size'); }
    let pages = saved?.pages ?? bundledPages ?? {};
    if (!saved && !bundledPages) {
      pages = {};
      for (let i = 1; i <= pdf.numPages; i++) {
        if (token !== operation.current) return;
        const sheet = await pdf.getPage(i);
        const content = await sheet.getTextContent();
        const viewport = sheet.getViewport({ scale: 1 });
        const items = content.items.filter(item => 'str' in item);
        for (const n of questionNumbers(items, viewport.width, viewport.height)) if (!pages[String(n)]) pages[String(n)] = i;
        sheet.cleanup();
      }
    }
    if (token !== operation.current) return;
    const next: PaperFile = { key, file, name, hash, pages };
    if (!saved && !bundledPages) {
      try { if (blocked.current) throw new Error('Protected storage'); await writePaper(next); }
      catch { setMessage('unavailable'); }
    }
    setRecord(next); setDocument(pdf); setPersonal(saved !== null || !bundledPages);
  }

  useEffect(() => {
    const token = ++operation.current;
    void (async () => {
      let saved: PaperFile | null = null;
      try { saved = await readPaper(key); }
      catch { if (token === operation.current) { blocked.current = true; setMessage('unreadable'); } }
      if (token !== operation.current) return;
      try {
        if (saved) await load(saved.file, saved, saved.name, token);
        else if (bundled) await load(await localPaperBlob(bundled.paperFile), null, bundled.paperFile, token, bundled.pages);
      } catch { if (token === operation.current) setMessage(saved ? 'invalid' : 'asset'); }
      finally { if (token === operation.current) setBusy(false); }
    })();
    return () => { operation.current++; void task.current?.destroy(); };
    // The component is keyed by paper; question changes keep this document alive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (document && record) setPage(Math.min(document.numPages, record.pages[String(number)] ?? 1));
  }, [number, document, record]);

  useEffect(() => {
    if (!document || !canvas.current) return;
    let alive = true;
    let rendering: RenderTask | undefined;
    setPainted(false);
    void document.getPage(page).then(sheet => {
      if (!alive || !canvas.current) return;
      const size = sheet.getViewport({ scale: 1 });
      const viewport = sheet.getViewport({ scale: Math.min(zoom * 1.6, 2000 / size.width, 2800 / size.height) });
      canvas.current.width = Math.floor(viewport.width); canvas.current.height = Math.floor(viewport.height);
      rendering = sheet.render({ canvas: canvas.current, viewport });
      return rendering.promise;
    }).then(() => { if (alive) setPainted(true); }).catch(error => {
      if (alive && error?.name !== 'RenderingCancelledException') setMessage('render');
    });
    return () => { alive = false; rendering?.cancel(); };
  }, [document, page, zoom]);

  const matched = record && canonical && record.hash === canonical.paperSha256;
  return <section className="paper-reader" aria-label={t('站内原卷阅读器', 'In-page paper reader')}>
    <div className="reader-heading"><strong>{t('原卷阅读器', 'Paper reader')}</strong><span className="small muted">{t('题干、公式和图表保持原卷显示', 'Original questions, formulae and diagrams')}</span></div>
    <div className="reader-upload"><label htmlFor={inputId}>{t('上传本地原卷 PDF（最大 20 MB）', 'Upload a local paper PDF (up to 20 MB)')}</label><input id={inputId} type="file" accept=".pdf,application/pdf" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      const token = ++operation.current; setBusy(true); setMessage(null);
      try { await load(file, null, file.name, token); }
      catch (error) { if (token === operation.current) setMessage(error instanceof Error && error.message === 'size' ? 'size' : 'invalid'); }
      finally { if (token === operation.current) setBusy(false); }
    }} /></div>
    {message ? <p className="reader-error" role="alert">{message === 'asset' ? t('内置原卷加载失败，可以上传本地 PDF 继续。', 'The bundled paper could not load. Upload a local PDF to continue.') : message === 'size' ? t('PDF 需在 20 MB、500 页以内。原文件未替换。', 'PDF must be at most 20 MB and 500 pages. The saved file was not replaced.') : message === 'invalid' ? t('无法读取此 PDF，可能损坏、加密或格式不正确。请重新选择原卷。', 'Could not read this PDF. It may be damaged, encrypted or invalid. Choose the original paper again.') : message === 'render' ? t('本页渲染失败，可尝试翻页或用原始链接阅读。', 'This page could not render. Try another page or the original link.') : message === 'unreadable' ? t('已有本地 PDF 无法读取，原数据已保留。可明确移除后重新上传。', 'The saved PDF could not be read and was preserved. Explicitly remove it before uploading again.') : t('PDF 未能保存，本次仅在页面内使用。刷新可能恢复旧文件或需要重新上传。', 'The PDF could not be saved and is available in this page only. Reloading may restore the old file or require another upload.')}</p> : null}
    {busy ? <p className="small muted" role="status">{t('正在读取原卷与题号…', 'Reading the paper and question numbers…')}</p> : null}
    {record ? <><p className="small reader-file">{record.name} · {matched ? t('与已核实官方原卷一致', 'Matches the verified official paper') : t('未匹配官方原卷校验值', 'Does not match the verified official file')}</p>{!matched ? <p className="reader-warning" role="note">{t('请核对本地文件是否对应当前年份与试卷。判分仍采用所选官方原卷答案，文件不对应时结果无效。', 'Check that this file corresponds to the selected year and paper. Marking still uses that official key; results are invalid for a different paper.')}</p> : null}</> : !busy ? <p className="small muted">{t('上传已下载的原卷后，可以在这里直接阅读题干、公式和图表。', 'Upload your downloaded paper to read its questions, formulae and diagrams here.')}</p> : null}
    {document ? <><div className="reader-controls"><button className="button secondary compact" disabled={page <= 1 || busy} onClick={() => setPage(page - 1)} aria-label={t('PDF 上一页', 'Previous PDF page')}><ChevronLeft size={16} /></button><label>{t('PDF 页码', 'PDF page')}<input aria-label={t('PDF 页码', 'PDF page')} type="number" min={1} max={document.numPages} value={page} disabled={busy} onChange={event => setPage(Math.max(1, Math.min(document.numPages, Number(event.target.value) || 1)))} /><span>/ {document.numPages}</span></label><button className="button secondary compact" disabled={page >= document.numPages || busy} onClick={() => setPage(page + 1)} aria-label={t('PDF 下一页', 'Next PDF page')}><ChevronRight size={16} /></button><label className="reader-zoom">{t('缩放', 'Zoom')}<select value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div><div className="reader-canvas"><canvas ref={canvas} style={{ width: `${zoom * 100}%` }} role="img" aria-label={t(`原卷 PDF 第 ${page} 页`, `Original PDF page ${page}`)} data-rendered={painted} /></div><div className="reader-bottom"><span className="small muted">{t(`当前第 ${number} 题；自动定位可手动校正。`, `Question ${number}; automatic page mapping can be corrected.`)}</span><button className="text-button" disabled={busy} onClick={async () => {
      if (!record) return;
      const next = { ...record, pages: { ...record.pages, [String(number)]: page } };
      setRecord(next); setPersonal(true);
      try { if (blocked.current) throw new Error('Protected'); await writePaper(next); }
      catch { setMessage('unavailable'); }
    }}>{t('将当前页设为本题位置', 'Use this page for this question')}</button></div></> : null}
    {(personal || message === 'unreadable') ? <button className="text-button reader-remove" onClick={() => setConfirm(true)}><Trash2 size={14} />{t('移除此卷本地 PDF', 'Remove this local PDF')}</button> : null}
    <ConfirmDialog open={confirm} title={t('移除此卷本地 PDF？', 'Remove this local PDF?')} confirmLabel={t('确认移除 PDF', 'Remove PDF')} onCancel={() => setConfirm(false)} danger onConfirm={async () => {
      setConfirm(false);
      try {
        await removePaper(key); const token = ++operation.current;
        await task.current?.destroy(); task.current = null;
        setDocument(null); setRecord(null); setMessage(null); setPersonal(false); blocked.current = false;
        if (bundled) { setBusy(true); try { await load(await localPaperBlob(bundled.paperFile), null, bundled.paperFile, token, bundled.pages); } finally { if (token === operation.current) setBusy(false); } }
      }
      catch { setMessage('unavailable'); }
    }}><p>{t('只删除此浏览器保存的原卷文件和页码定位，不删除答案、练习记录或错题。', 'Removes only this browser’s paper file and page mapping. Answers, attempt records and mistakes are retained.')}</p></ConfirmDialog>
    <span className="sr-only">{lang === 'zh' ? 'PDF 内容保留原始语言' : 'PDF content keeps its original language'}</span>
  </section>;
}
