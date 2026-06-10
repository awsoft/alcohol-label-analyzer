import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, ClipboardCheck, Download, FileSpreadsheet, HelpCircle, Loader2, Upload, X, XCircle, Zap } from 'lucide-react';
import { verifyLabel } from '../services/geminiService';
import { prepareImageForAnalysis } from '../services/imageProcessingService';
import { BeverageCategorySelector } from './BeverageCategorySelector';
import {
  ApplicationData,
  FieldMatchStatus,
  VerificationLabelType,
  VerificationReport,
} from '../shared/analysisTypes';
import { BeverageCategory } from '../types';

const LABEL_TYPE_OPTIONS: { value: VerificationLabelType; name: string }[] = [
  { value: 'front', name: 'Front Label' },
  { value: 'back', name: 'Back Label' },
  { value: 'neck', name: 'Neck Label' },
];

interface ApplicationVerificationProps {
  disabled?: boolean;
}

// ---- Shared display maps ----

const FIELD_STATUS_CHIP: Record<FieldMatchStatus, string> = {
  MATCH: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  MISMATCH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  NOT_FOUND: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  NOT_EXPECTED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const OVERALL_DISPLAY = {
  PASS: { label: 'PASS — label matches the application', cls: 'bg-green-700 text-green-50', Icon: CheckCircle },
  FAIL: { label: 'FAIL — issues found', cls: 'bg-red-700 text-red-50', Icon: AlertTriangle },
  NEEDS_REVIEW: { label: 'NEEDS REVIEW — agent judgment required', cls: 'bg-yellow-600 text-yellow-50', Icon: HelpCircle },
} as const;

const emptyApplication = (): ApplicationData => ({
  brandName: '',
  classType: '',
  alcoholContent: '',
  netContents: '',
  bottlerName: '',
  countryOfOrigin: '',
});

const hasRequiredFields = (app: ApplicationData) =>
  !!(app.brandName.trim() && app.classType.trim() && app.alcoholContent.trim() && app.netContents.trim());

// ---- Small async pool for batch runs ----

const runPool = async <T,>(items: T[], worker: (item: T) => Promise<void>, concurrency: number) => {
  const queue = [...items];
  const lanes = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) await worker(item);
    }
  });
  await Promise.all(lanes);
};

// ---- Minimal CSV helpers (quoted fields supported) ----

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
};

const toCsvCell = (value: string) => /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const CSV_TEMPLATE =
  'image,brand_name,class_type,alcohol_content,net_contents,bottler_name,country_of_origin,beverage_category,label_type\n' +
  'front-label.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45% Alc./Vol. (90 Proof),750 mL,,,distilled-spirits,front\n' +
  'back-label.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45% Alc./Vol. (90 Proof),750 mL,,,distilled-spirits,back\n';

const downloadText = (filename: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ---- Result rendering (shared by single + batch detail) ----

const VerificationResult: React.FC<{ report: VerificationReport; elapsedMs?: number }> = ({ report, elapsedMs }) => {
  const overall = OVERALL_DISPLAY[report.overallResult];
  const warn = report.warningStatement;
  const Check: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <span className={`inline-flex items-center mr-4 text-sm ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
      {ok ? <CheckCircle className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}{label}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg flex items-center justify-between ${overall.cls}`}>
        <div className="flex items-center">
          <overall.Icon className="h-6 w-6 mr-3 flex-shrink-0" />
          <span className="font-bold text-lg">{overall.label}</span>
        </div>
        {elapsedMs !== undefined && (
          <span className="inline-flex items-center text-sm opacity-90"><Zap className="h-4 w-4 mr-1" />{(elapsedMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {report.imageQualityNote && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Image quality:</strong> {report.imageQualityNote}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600">
              <th className="py-2 pr-3 font-medium">Field</th>
              <th className="py-2 pr-3 font-medium">Application</th>
              <th className="py-2 pr-3 font-medium">On Label</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {report.fields.map((f, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-700 align-top">
                <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{f.field}</td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{f.applicationValue}</td>
                <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{f.labelValue}</td>
                <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${FIELD_STATUS_CHIP[f.status] ?? ''}`}>{f.status.replace('_', ' ')}</span></td>
                <td className="py-2 text-slate-600 dark:text-slate-400">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`p-4 rounded-lg border ${warn.status === 'PASS' ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : warn.status === 'FAIL' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'}`}>
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Government Health Warning — {warn.status.replace('_', ' ')}</div>
        <div className="mb-1">
          <Check ok={warn.present} label="Present" />
          <Check ok={warn.exactWording} label="Exact wording" />
          <Check ok={warn.formattingCorrect} label='"GOVERNMENT WARNING:" caps + bold' />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{warn.note}</p>
      </div>
    </div>
  );
};

// ---- Application data form fields ----

const FieldInput: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; disabled?: boolean;
}> = ({ label, value, onChange, placeholder, required, disabled }) => (
  <label className="block">
    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {label}{required && <span className="text-red-500"> *</span>}
    </span>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50"
    />
  </label>
);

// ---- Batch row model ----

interface BatchRow {
  id: string;
  fileName: string;
  previewUrl: string;
  base64: string;
  mimeType: string;
  app: ApplicationData;
  labelType: VerificationLabelType;
  category?: BeverageCategory;
  state: 'idle' | 'running' | 'done' | 'error';
  report?: VerificationReport;
  error?: string;
  ms?: number;
}

const BATCH_CONCURRENCY = 4;

export const ApplicationVerification: React.FC<ApplicationVerificationProps> = ({ disabled = false }) => {
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [category, setCategory] = useState<BeverageCategory>('distilled-spirits');
  const [error, setError] = useState<string | null>(null);

  // ---- Single mode state ----
  const [app, setApp] = useState<ApplicationData>(emptyApplication());
  const [labelType, setLabelType] = useState<VerificationLabelType>('front');
  const [image, setImage] = useState<{ base64: string; mimeType: string; previewUrl: string; name: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{ report: VerificationReport; ms: number } | null>(null);

  // ---- Batch mode state ----
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchTotalMs, setBatchTotalMs] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const setAppField = (key: keyof ApplicationData) => (v: string) => {
    setApp(prev => ({ ...prev, [key]: v }));
    setResult(null);
  };

  const handleSingleImage = async (file: File) => {
    try {
      const prepared = await prepareImageForAnalysis(file);
      setImage({ ...prepared, name: file.name });
      setResult(null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to process the image.');
    }
  };

  const handleVerify = async () => {
    if (!image || !hasRequiredFields(app)) return;
    setIsVerifying(true);
    setError(null);
    setResult(null);
    const t0 = performance.now();
    try {
      const report = await verifyLabel({
        images: [{ base64: image.base64, mimeType: image.mimeType }],
        application: app,
        beverageCategory: category,
        labelType,
      });
      setResult({ report, ms: performance.now() - t0 });
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ---- Batch handlers ----

  const addBatchFiles = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const prepared = await prepareImageForAnalysis(file);
        const row: BatchRow = {
          id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          fileName: file.name,
          previewUrl: prepared.previewUrl,
          base64: prepared.base64,
          mimeType: prepared.mimeType,
          app: emptyApplication(),
          labelType: 'front',
          state: 'idle',
        };
        setRows(prev => [...prev, row]);
      } catch (e: any) {
        setError(`${file.name}: ${e?.message || 'failed to process'}`);
      }
    }
  };

  const importCsv = async (file: File) => {
    setError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) { setError('CSV has no data rows.'); return; }
    const header = parsed[0].map(h => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    if (col('image') === -1 || col('brand_name') === -1) {
      setError('CSV must include at least "image" and "brand_name" columns (download the template for the full format).');
      return;
    }
    const validCategories: BeverageCategory[] = ['distilled-spirits', 'wine', 'malt-beverages'];
    let matched = 0;
    const unmatched: string[] = [];
    setRows(prev => {
      const next = [...prev];
      for (const r of parsed.slice(1)) {
        const get = (name: string) => { const i = col(name); return i === -1 ? '' : (r[i] ?? '').trim(); };
        const imageName = get('image').toLowerCase();
        const target = next.find(row => row.fileName.toLowerCase() === imageName);
        if (!target) { unmatched.push(get('image')); continue; }
        matched++;
        const csvCategory = get('beverage_category') as BeverageCategory;
        const csvLabelType = get('label_type').toLowerCase() as VerificationLabelType;
        Object.assign(target, {
          app: {
            brandName: get('brand_name'),
            classType: get('class_type'),
            alcoholContent: get('alcohol_content'),
            netContents: get('net_contents'),
            bottlerName: get('bottler_name'),
            countryOfOrigin: get('country_of_origin'),
          },
          category: validCategories.includes(csvCategory) ? csvCategory : undefined,
          labelType: (['front', 'back', 'neck'] as const).includes(csvLabelType) ? csvLabelType : target.labelType,
          state: 'idle' as const,
          report: undefined,
          error: undefined,
        });
      }
      return next;
    });
    if (unmatched.length > 0) {
      setError(`CSV rows matched: ${matched}. No uploaded image found for: ${unmatched.slice(0, 5).join(', ')}${unmatched.length > 5 ? '…' : ''}`);
    }
  };

  const updateRowField = (rowId: string, key: keyof ApplicationData, value: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, app: { ...r.app, [key]: value }, state: 'idle', report: undefined, error: undefined } : r));
  };

  const removeRow = (rowId: string) => setRows(prev => prev.filter(r => r.id !== rowId));

  const readyRows = rows.filter(r => hasRequiredFields(r.app));

  const runBatch = async () => {
    if (readyRows.length === 0) return;
    setIsBatchRunning(true);
    setBatchTotalMs(null);
    setError(null);
    const t0 = performance.now();
    const targets = rows.filter(r => hasRequiredFields(r.app)).map(r => r.id);
    setRows(prev => prev.map(r => targets.includes(r.id) ? { ...r, state: 'running', report: undefined, error: undefined } : r));

    await runPool(targets, async (rowId) => {
      const row = rows.find(r => r.id === rowId);
      if (!row) return;
      const rt0 = performance.now();
      try {
        const report = await verifyLabel({
          images: [{ base64: row.base64, mimeType: row.mimeType }],
          application: row.app,
          beverageCategory: row.category ?? category,
          labelType: row.labelType,
        });
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, state: 'done', report, ms: performance.now() - rt0 } : r));
      } catch (e: any) {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, state: 'error', error: e?.message || 'Verification failed', ms: performance.now() - rt0 } : r));
      }
    }, BATCH_CONCURRENCY);

    setBatchTotalMs(performance.now() - t0);
    setIsBatchRunning(false);
  };

  const exportResults = () => {
    const lines = ['image,label_type,result,brand_name,class_type,alcohol_content,net_contents,warning,time_s'];
    for (const r of rows) {
      const statusOf = (field: string) => r.report?.fields.find(f => f.field.toLowerCase().includes(field))?.status ?? '';
      lines.push([
        r.fileName,
        r.labelType,
        r.state === 'error' ? `ERROR: ${r.error ?? ''}` : r.report?.overallResult ?? 'NOT RUN',
        statusOf('brand'), statusOf('class'), statusOf('alcohol'), statusOf('net'),
        r.report?.warningStatement.status ?? '',
        r.ms ? (r.ms / 1000).toFixed(1) : '',
      ].map(toCsvCell).join(','));
    }
    downloadText('verification-results.csv', lines.join('\n'));
  };

  const doneRows = rows.filter(r => r.state === 'done');
  const summary = {
    pass: doneRows.filter(r => r.report?.overallResult === 'PASS').length,
    fail: doneRows.filter(r => r.report?.overallResult === 'FAIL').length,
    review: doneRows.filter(r => r.report?.overallResult === 'NEEDS_REVIEW').length,
    errors: rows.filter(r => r.state === 'error').length,
  };

  const rowChip = (row: BatchRow) => {
    if (row.state === 'running') return <span className="inline-flex items-center text-xs text-sky-600 dark:text-sky-400"><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Verifying…</span>;
    if (row.state === 'error') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">ERROR</span>;
    if (row.state === 'done' && row.report) {
      const cls = row.report.overallResult === 'PASS' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : row.report.overallResult === 'FAIL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{row.report.overallResult.replace('_', ' ')}{row.ms ? ` · ${(row.ms / 1000).toFixed(1)}s` : ''}</span>;
    }
    return <span className="text-xs text-slate-400">{hasRequiredFields(row.app) ? 'Ready' : 'Fill required fields'}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <ClipboardCheck className="h-8 w-8 text-sky-600 dark:text-sky-400 mr-3" />
          <h2 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Verify Label Against Application</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Enter the application data, upload the label, and get a field-by-field match verdict — including the exact Government Warning check.
        </p>
      </div>

      {/* Single / Batch toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg inline-flex">
          {(['single', 'batch'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'}`}
            >
              {t === 'single' ? 'Single Application' : `Batch${rows.length ? ` (${rows.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-700 border border-red-500 rounded-lg flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-300 mt-0.5 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {tab === 'single' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Application data form */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Application Data</h3>
              <FieldInput label="Brand Name" required value={app.brandName} onChange={setAppField('brandName')} placeholder='e.g. OLD TOM DISTILLERY' disabled={disabled || isVerifying} />
              <FieldInput label="Class / Type" required value={app.classType} onChange={setAppField('classType')} placeholder='e.g. Kentucky Straight Bourbon Whiskey' disabled={disabled || isVerifying} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Alcohol Content" required value={app.alcoholContent} onChange={setAppField('alcoholContent')} placeholder='e.g. 45% Alc./Vol.' disabled={disabled || isVerifying} />
                <FieldInput label="Net Contents" required value={app.netContents} onChange={setAppField('netContents')} placeholder='e.g. 750 mL' disabled={disabled || isVerifying} />
              </div>
              <FieldInput label="Bottler / Producer (optional)" value={app.bottlerName ?? ''} onChange={setAppField('bottlerName')} placeholder='e.g. Old Tom Distillery Co., Bardstown, KY' disabled={disabled || isVerifying} />
              <FieldInput label="Country of Origin (imports only)" value={app.countryOfOrigin ?? ''} onChange={setAppField('countryOfOrigin')} placeholder='e.g. Product of France' disabled={disabled || isVerifying} />
            </div>

            {/* Label image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Label Image</h3>
                <label className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <span className="mr-2">Label type:</span>
                  <select
                    value={labelType}
                    onChange={e => { setLabelType(e.target.value as VerificationLabelType); setResult(null); }}
                    disabled={disabled || isVerifying}
                    className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                  >
                    {LABEL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.name}</option>)}
                  </select>
                </label>
              </div>
              {image ? (
                <div className="relative bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-3">
                  <button onClick={() => { setImage(null); setResult(null); }} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600" aria-label="Remove image">
                    <X className="h-4 w-4" />
                  </button>
                  <img src={image.previewUrl} alt="Label preview" className="w-full h-auto max-h-80 object-contain rounded" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">{image.name}</p>
                </div>
              ) : (
                <div
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/') && !disabled) handleSingleImage(f); }}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-400 rounded-lg p-8 text-center bg-slate-50 dark:bg-slate-700/50"
                >
                  <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Drag a label image here, or</p>
                  <input type="file" accept="image/*" className="hidden" id="verify-file-input" disabled={disabled}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleSingleImage(f); e.target.value = ''; }} />
                  <label htmlFor="verify-file-input" className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white ${disabled ? 'bg-slate-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'}`}>
                    Select Image
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <BeverageCategorySelector selectedCategory={category} onCategoryChange={setCategory} disabled={disabled || isVerifying} />
          </div>

          <div className="max-w-md mx-auto">
            <button
              onClick={handleVerify}
              disabled={disabled || isVerifying || !image || !hasRequiredFields(app)}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center justify-center space-x-2 text-lg disabled:cursor-not-allowed"
            >
              {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              <span>{isVerifying ? 'Verifying…' : !image ? 'Upload a Label Image' : !hasRequiredFields(app) ? 'Fill Required Fields' : 'Verify Label'}</span>
            </button>
          </div>

          {result && (
            <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-5">
              <VerificationResult report={result.report} elapsedMs={result.ms} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Batch mode */}
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" accept="image/*" multiple className="hidden" id="batch-file-input" disabled={disabled || isBatchRunning}
                onChange={e => { if (e.target.files) addBatchFiles(e.target.files); e.target.value = ''; }} />
              <label htmlFor="batch-file-input" className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white ${disabled || isBatchRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'}`}>
                <Upload className="h-4 w-4 mr-2" />Add Label Images
              </label>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ''; }} />
              <button onClick={() => csvInputRef.current?.click()} disabled={disabled || isBatchRunning || rows.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-slate-600 hover:bg-slate-700 text-white disabled:bg-slate-400 disabled:cursor-not-allowed">
                <FileSpreadsheet className="h-4 w-4 mr-2" />Import Application CSV
              </button>
              <button onClick={() => downloadText('application-template.csv', CSV_TEMPLATE)}
                className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
                Download CSV template
              </button>
              <div className="flex-grow" />
              {doneRows.length > 0 && (
                <button onClick={exportResults} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-slate-600 hover:bg-slate-700 text-white">
                  <Download className="h-4 w-4 mr-2" />Export Results CSV
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each image is one application. Fill the fields inline, or upload all images first and import a CSV (matched by file name; optional <code>label_type</code> column: front/back/neck). Pick the label type per row — placement rules differ: e.g. the Government Warning may be on any label, and wine requires brand name and class/type on the front (brand) label. The category selector below applies to rows without a CSV category.
            </p>

            {rows.length === 0 ? (
              <div
                onDrop={e => { e.preventDefault(); if (!disabled && !isBatchRunning) addBatchFiles(e.dataTransfer.files); }}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center bg-slate-50 dark:bg-slate-700/50"
              >
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">Drop label images here to start a batch — one image per application.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map(row => (
                  <div key={row.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <div className="p-3 flex items-center gap-3">
                      <img src={row.previewUrl} alt={row.fileName} className="h-14 w-14 object-contain bg-slate-100 dark:bg-slate-700 rounded flex-shrink-0" />
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-grow min-w-0">
                        {([['brandName', 'Brand name'], ['classType', 'Class/type'], ['alcoholContent', 'Alcohol content'], ['netContents', 'Net contents']] as const).map(([key, ph]) => (
                          <input key={key} type="text" value={row.app[key] ?? ''} placeholder={`${ph} *`}
                            onChange={e => updateRowField(row.id, key, e.target.value)}
                            disabled={disabled || isBatchRunning}
                            className="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50" />
                        ))}
                        <select
                          value={row.labelType}
                          onChange={e => setRows(prev => prev.map(r => r.id === row.id ? { ...r, labelType: e.target.value as VerificationLabelType, state: 'idle', report: undefined, error: undefined } : r))}
                          disabled={disabled || isBatchRunning}
                          aria-label={`Label type for ${row.fileName}`}
                          className="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                        >
                          {LABEL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {rowChip(row)}
                        {row.report && (
                          <button onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">
                            {expandedRow === row.id ? 'Hide' : 'Detail'}
                          </button>
                        )}
                        <button onClick={() => removeRow(row.id)} disabled={isBatchRunning} aria-label={`Remove ${row.fileName}`}
                          className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-40"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="px-3 pb-1 -mt-2 text-[11px] text-slate-400 truncate">{row.fileName}{row.state === 'error' && row.error ? ` — ${row.error}` : ''}</div>
                    {expandedRow === row.id && row.report && (
                      <div className="border-t border-slate-200 dark:border-slate-600 p-4">
                        <VerificationResult report={row.report} elapsedMs={row.ms} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              <div className="max-w-md mx-auto">
                <BeverageCategorySelector selectedCategory={category} onCategoryChange={setCategory} disabled={disabled || isBatchRunning} />
              </div>
            )}

            {rows.length > 0 && (
              <div className="max-w-md mx-auto space-y-3">
                <button
                  onClick={runBatch}
                  disabled={disabled || isBatchRunning || readyRows.length === 0}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center justify-center space-x-2 text-lg disabled:cursor-not-allowed"
                >
                  {isBatchRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  <span>{isBatchRunning ? `Verifying ${rows.filter(r => r.state === 'running').length} of ${readyRows.length}…` : `Verify All (${readyRows.length})`}</span>
                </button>
                {(doneRows.length > 0 || summary.errors > 0) && !isBatchRunning && (
                  <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-green-600 dark:text-green-400 font-medium">{summary.pass} pass</span>
                    {' · '}<span className="text-red-600 dark:text-red-400 font-medium">{summary.fail} fail</span>
                    {' · '}<span className="text-yellow-600 dark:text-yellow-400 font-medium">{summary.review} review</span>
                    {summary.errors > 0 && <>{' · '}<span className="text-red-600 dark:text-red-400 font-medium">{summary.errors} errors</span></>}
                    {batchTotalMs !== null && <> — {(batchTotalMs / 1000).toFixed(1)}s total</>}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
