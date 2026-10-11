import { useRef, useState } from 'react';
import { ChevronDown, Download, ExternalLink, Trash2, Upload } from 'lucide-react';
import { useI18n } from '../i18n';
import { DIFFICULTIES, moduleInfo } from '../data/catalog';
import { MAX_BANK_BYTES, parseQuestionBank, type BankValidation } from '../questionBank';
import { ConfirmDialog, Notice } from '../components/Common';
import type { Bilingual } from '../types';
import type { useQuestionBank } from '../useQuestionBank';
import template from '../../examples/local-import-demo.json';

const bilingual = (zh: string, en: string): Bilingual => ({ zh, en });

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BankManager({ bank }: { bank: ReturnType<typeof useQuestionBank> }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState('');
  const [validation, setValidation] = useState<BankValidation | null>(null);
  const [checked, setChecked] = useState(false);
  const [reading, setReading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: Bilingual } | null>(null);
  const editVersion = useRef(0);
  const edit = (next: string) => { editVersion.current++; setText(next); setValidation(null); setChecked(false); setMessage(null); setReading(false); };
  const validate = () => { setValidation(parseQuestionBank(text, bank.questions)); setChecked(false); setMessage(null); };
  const importBank = () => {
    if (!validation?.ok || !checked) return;
    const result = bank.add(validation.questions);
    if (result === 'saved') {
      const count = validation.questions.length;
      edit('');
      setMessage({ ok: true, text: bilingual(`已保存 ${count} 道题到当前浏览器。尚未同步给其他学生或设备。`, `${count} questions saved in this browser. They have not been shared with other students or devices.`) });
    } else {
      setMessage({ ok: false, text: result === 'full' ? bilingual('本地导入题库最多 500 道、1 MB。请先导出备份，再移除已有导入题。', 'Local imports are limited to 500 questions and 1 MB. Export a backup before clearing imported questions.') : result === 'invalid' ? bilingual('题库已变化或存在重复数据，请重新校验。未添加任何题目。', 'The bank changed or contains duplicates. Validate again. No questions were added.') : result === 'blocked' ? bilingual('原题库数据无法读取，已保留原数据。请明确移除本地导入题后重试。', 'Existing bank data could not be read and was preserved. Explicitly clear local imports before retrying.') : bilingual('保存失败，浏览器存储可能已满或被禁用。未添加任何题目，请保留原文件。', 'Saving failed: browser storage may be full or disabled. No questions were added; keep your source file.') });
    }
  };
  return <details className="panel bank-manager">
    <summary><Upload size={17} /><span>{t('管理本地题库', 'Manage local question bank')}</span><span className="small muted">{t(`${bank.imported.length} 道已导入`, `${bank.imported.length} imported`)}</span><ChevronDown className="manager-chevron" size={17} /></summary>
    <div className="bank-manager-content">
      <h2>{t('导入你审核过的题目', 'Import questions you have reviewed')}</h2>
      <p className="muted small">{t('导入题目只在当前浏览器用于专项训练，不会更新已发布网站或同步给学生。来源和难度按文件声明展示，工具只校验结构；请复核内容与使用条件。', 'Imported questions are for focused practice in this browser only. They do not update the published site or sync to students. Source and difficulty reflect the file’s declarations; validate content and usage rights yourself.')}</p>
      {bank.issue ? <Notice tone="error">{bank.issue === 'unavailable' ? t('本地题库存储不可用或已满。保存失败时不会添加题目。', 'Local bank storage is unavailable or full. Failed saves do not add questions.') : t('已有本地题库无法读取或版本不支持，原数据未覆盖。移除本地导入题可恢复导入。', 'The saved local bank is unreadable or uses an unsupported version. Original data was preserved; clear local imports to restore importing.')}</Notice> : null}
      <div className="bank-manager-actions">
        <button className="button secondary compact" onClick={() => downloadJson(template, 'local-import-demo.json')}><Download size={15} />{t('下载示例模板', 'Download demo template')}</button>
        <button className="button secondary compact" disabled={!bank.imported.length} onClick={() => downloadJson({ schemaVersion: 1, questions: bank.imported }, 'local-question-bank.json')}><Download size={15} />{t('导出已导入题目', 'Export imported questions')}</button>
        <button className="text-button" disabled={!bank.imported.length && !bank.issue} onClick={() => setConfirmClear(true)}><Trash2 size={15} />{t('移除本地导入题', 'Clear local imports')}</button>
      </div>
      <div className="import-inputs">
        <div className="form-field"><label htmlFor="bank-file">{t('选择 JSON 文件（最大 1 MB）', 'Choose a JSON file (up to 1 MB)')}</label><input id="bank-file" type="file" accept=".json,application/json" onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = '';
          if (!file) return;
          edit('');
          if (file.size > MAX_BANK_BYTES) { setMessage({ ok: false, text: bilingual('文件超过 1 MB，请分批导入。', 'The file exceeds 1 MB. Import smaller batches.') }); return; }
          const version = editVersion.current;
          setReading(true);
          try { const value = await file.text(); if (version === editVersion.current) { setText(value); setValidation(null); } }
          catch { if (version === editVersion.current) setMessage({ ok: false, text: bilingual('无法读取文件，请重选或粘贴内容。', 'Could not read the file. Choose it again or paste its contents.') }); }
          finally { if (version === editVersion.current) setReading(false); }
        }} /></div>
        <div className="form-field"><label htmlFor="bank-json">{t('或粘贴题库 JSON', 'Or paste question bank JSON')}</label><textarea id="bank-json" value={text} onChange={e => edit(e.target.value)} rows={6} spellCheck={false} placeholder={'{ "schemaVersion": 1, "questions": [...] }'} /></div>
      </div>
      <button className="button outline" disabled={!text.trim() || reading} onClick={validate}>{reading ? t('读取中…', 'Reading…') : t('校验并预览', 'Validate & preview')}</button>
      {validation && !validation.ok ? <div className="import-errors" role="alert"><strong>{t('未导入任何题目，请修正以下问题：', 'Nothing was imported. Fix these issues:')}</strong><ul>{validation.issues.slice(0, 20).map((item, i) => <li key={i}>{item.index === undefined ? '' : t(`第 ${item.index + 1} 题：`, `Question ${item.index + 1}: `)}{item.message[lang]}</li>)}</ul>{validation.issues.length > 20 ? <p>{t(`还有 ${validation.issues.length - 20} 项问题。`, `${validation.issues.length - 20} more issues.`)}</p> : null}</div> : null}
      {validation?.ok ? <section className="import-preview" aria-label={t('导入预览', 'Import preview')}>
        <h3>{t(`校验通过，待导入 ${validation.questions.length} 道题`, `${validation.questions.length} questions validated, ready to import`)}</h3>
        <p className="small muted">{t('只新增，不覆盖已有题目。以下展示前 5 道题的来源、原始题号和难度。', 'Adds new questions without overwriting. The first 5 questions show source, original number and difficulty.')}</p>
        <ul>{validation.questions.slice(0, 5).map(q => <li key={q.id}><strong>{q.id}</strong><p lang="en">{q.prompt}</p><span className="small muted">{q.exam} · {moduleInfo(q.moduleId).name[lang]} · {q.source.kind === 'original-demo' ? t('原创示例', 'Original demo') : t('官方公开材料（文件声明）', 'Official public material (file declaration)')} · {q.source.title[lang]} · {q.source.originalNumber}{q.source.year ? ` · ${q.source.year}` : ''} · {DIFFICULTIES[q.difficulty ?? 'unrated'][lang]}</span><p className="small muted">{q.source.rightsNote}{q.source.url ? <> · <a href={q.source.url} target="_blank" rel="noreferrer">{t('查看原始来源', 'View original source')}<ExternalLink size={12} /></a></> : null}</p></li>)}</ul>
        <label className="import-confirm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} /><span>{t('我已复核题干、答案、双语解析和来源说明。', 'I have reviewed the questions, answers, bilingual explanations and provenance.')}</span></label>
        <button className="button primary" disabled={!checked} onClick={importBank}>{t('确认导入到此浏览器', 'Import into this browser')}</button>
      </section> : null}
      {message ? <div className={`import-message ${message.ok ? 'success' : 'error'}`} role={message.ok ? 'status' : 'alert'}>{message.text[lang]}</div> : null}
      <ConfirmDialog open={confirmClear} title={t('移除本地导入题？', 'Clear local imports?')} confirmLabel={t('确认移除导入题', 'Clear imported questions')} danger onCancel={() => setConfirmClear(false)} onConfirm={() => {
        setConfirmClear(false);
        const ok = bank.clear();
        edit('');
        setMessage({ ok, text: ok ? bilingual('本地导入题已移除。内置示例、练习记录和历史解析仍保留。', 'Local imports cleared. Built-in demos, attempt records and historical explanations are retained.') : bilingual('移除失败，浏览器存储不可用。原数据未更改。', 'Could not clear imports. Storage is unavailable; original data was not changed.') });
      }}><p>{t('请先导出需要保留的题目。本操作只移除当前浏览器的导入题库；历史记录和未完成练习保存的题目快照仍可使用。', 'Export any questions you want to keep first. This clears only the imported bank in this browser. Historical records and active question snapshots remain usable.')}</p></ConfirmDialog>
    </div>
  </details>;
}
