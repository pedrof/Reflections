import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import api from '../../services/api.js';
import Spinner from '../../components/ui/Spinner.jsx';

function currentFiscalYear() {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

function EditableParagraph({ paragraph, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(paragraph);

  useEffect(() => { setDraft(paragraph); }, [paragraph]);

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          className="textarea-field text-sm"
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => { setDraft(paragraph); setEditing(false); }}>Cancel</button>
          <button className="btn-primary text-xs" onClick={() => { onSave(draft); setEditing(false); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p className="text-sm text-white/70 leading-relaxed pr-8">{paragraph}</p>
      <button
        onClick={() => { setDraft(paragraph); setEditing(true); }}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/70 text-xs p-0.5"
        title="Edit"
      >✎</button>
    </div>
  );
}

function Section({ label, color, items, onUpdate }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-5">
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${color} pb-1 border-b border-white/[0.06]`}>
        {label}
      </div>
      {items.map((item) =>
        item.paragraph ? (
          <div key={item.id} className="space-y-1.5">
            <div className="text-xs font-semibold text-white/80">{item.title}</div>
            <EditableParagraph paragraph={item.paragraph} onSave={(text) => onUpdate(item.id, text)} />
          </div>
        ) : null
      )}
    </div>
  );
}

async function exportToWord(report) {
  const children = [];
  const heading = (text, level) => new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
  const body = (text) => new Paragraph({
    children: [new TextRun({ text, size: 24, font: 'Calibri' })],
    spacing: { after: 160 },
    alignment: AlignmentType.JUSTIFIED,
  });
  const divider = () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    spacing: { before: 80, after: 80 },
  });

  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Annual Performance Report', bold: true, size: 36, font: 'Calibri' })], heading: HeadingLevel.TITLE, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `${report.employee?.name}  |  FY${report.fiscalYear}`, size: 24, color: '666666', font: 'Calibri' })], spacing: { after: 320 } }),
    divider(),
  );

  const objWithParagraphs = report.objectives?.filter((o) => o.paragraph) ?? [];
  if (objWithParagraphs.length) {
    children.push(heading('Objectives', HeadingLevel.HEADING_1));
    objWithParagraphs.forEach((o) => {
      children.push(
        new Paragraph({ children: [new TextRun({ text: o.title, bold: true, size: 26, font: 'Calibri' })], spacing: { before: 200, after: 80 } }),
        body(o.paragraph),
      );
    });
    children.push(divider());
  }

  const elWithParagraphs = report.elements?.filter((e) => e.paragraph) ?? [];
  if (elWithParagraphs.length) {
    children.push(heading('Performance Elements', HeadingLevel.HEADING_1));
    elWithParagraphs.forEach((e) => {
      children.push(
        new Paragraph({ children: [new TextRun({ text: e.title, bold: true, size: 26, font: 'Calibri' })], spacing: { before: 200, after: 80 } }),
        body(e.paragraph),
      );
    });
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 24 } } } },
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Yearly-Report-${report.employee?.name?.replace(/\s+/g, '-')}-FY${report.fiscalYear}.docx`);
}

function buildPlainText(report) {
  if (!report) return '';
  const lines = [`Annual Performance Report — ${report.employee?.name} — FY${report.fiscalYear}\n`];
  if (report.objectives?.some((o) => o.paragraph)) {
    lines.push('OBJECTIVES\n');
    report.objectives.forEach((o) => { if (o.paragraph) lines.push(`${o.title}\n${o.paragraph}\n`); });
  }
  if (report.elements?.some((e) => e.paragraph)) {
    lines.push('PERFORMANCE ELEMENTS\n');
    report.elements.forEach((e) => { if (e.paragraph) lines.push(`${e.title}\n${e.paragraph}\n`); });
  }
  return lines.join('\n');
}

export default function YearlyReportPage() {
  const qc = useQueryClient();
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);

  const years = Array.from({ length: 5 }, (_, i) => currentFiscalYear() - i);

  // Load saved report when FY changes
  const { isFetching } = useQuery({
    queryKey: ['yearlyReport', fiscalYear],
    queryFn: () => api.get(`/reports/yearly?fiscalYear=${fiscalYear}`).then((r) => r.data),
    retry: false,
    onSuccess: (data) => { setReport(data); setSavedAt(data.updatedAt); },
    onError: () => { setReport(null); setSavedAt(null); },
  });

  const generateMut = useMutation({
    mutationFn: () => api.post('/reports/yearly', { fiscalYear }).then((r) => r.data),
    onSuccess: (data) => {
      setReport(data);
      setSavedAt(data.updatedAt);
      qc.invalidateQueries(['yearlyReport', fiscalYear]);
    },
  });

  const saveMut = useMutation({
    mutationFn: (data) => api.patch('/reports/yearly', data).then((r) => r.data),
    onSuccess: (data) => setSavedAt(data.updatedAt),
  });

  const scheduleSave = (nextReport) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMut.mutate({ fiscalYear, objectives: nextReport.objectives, elements: nextReport.elements });
    }, 1000);
  };

  const updateObjective = (id, text) => {
    setReport((r) => {
      const next = { ...r, objectives: r.objectives.map((o) => o.id === id ? { ...o, paragraph: text } : o) };
      scheduleSave(next);
      return next;
    });
  };

  const updateElement = (id, text) => {
    setReport((r) => {
      const next = { ...r, elements: r.elements.map((e) => e.id === id ? { ...e, paragraph: text } : e) };
      scheduleSave(next);
      return next;
    });
  };

  const handleRegenerate = () => {
    if (report && !window.confirm('Regenerate will replace your saved draft with a new AI version. Continue?')) return;
    generateMut.mutate();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPlainText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWord = async () => {
    setExporting(true);
    try { await exportToWord(report); } finally { setExporting(false); }
  };

  const formatSaved = (ts) => {
    if (!ts) return null;
    return new Date(ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Draft Yearly Report</h1>
        <p className="text-white/50 text-sm mt-1">Annual performance narrative by objective and element — saved per fiscal year</p>
      </div>

      <div className="glass-card p-5 flex items-end gap-4">
        <div>
          <label className="label">Fiscal Year</label>
          <select
            className="input-field w-36"
            value={fiscalYear}
            onChange={(e) => { setFiscalYear(Number(e.target.value)); setReport(null); setSavedAt(null); }}
          >
            {years.map((y) => <option key={y} value={y}>FY{y}</option>)}
          </select>
        </div>
        {!report && !isFetching && (
          <button onClick={() => generateMut.mutate()} className="btn-primary" disabled={generateMut.isPending}>
            {generateMut.isPending ? <><Spinner size="sm" /><span>Generating...</span></> : '✨ Generate Report'}
          </button>
        )}
        {isFetching && <Spinner size="sm" />}
      </div>

      {generateMut.isError && (
        <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {generateMut.error?.response?.data?.error || 'Failed to generate report'}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">{report.employee?.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/40">Annual Performance Narrative — FY{report.fiscalYear}</span>
                {savedAt && (
                  <span className="text-xs text-emerald-400/60">
                    {saveMut.isPending ? '· Saving...' : `· Saved ${formatSaved(savedAt)}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRegenerate} className="btn-secondary text-xs px-2 py-1" disabled={generateMut.isPending}>
                {generateMut.isPending ? <Spinner size="sm" /> : '↺ Regenerate'}
              </button>
              <button onClick={handleCopy} className="btn-secondary text-xs px-3 py-1.5">
                {copied ? '✓ Copied' : '⎘ Copy text'}
              </button>
              <button onClick={handleExportWord} className="btn-primary text-xs px-3 py-1.5" disabled={exporting}>
                {exporting ? <><Spinner size="sm" /><span>Exporting...</span></> : '⬇ Word (.docx)'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
            <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              <span className="font-semibold text-amber-300">Review before submitting.</span> AI-generated content may contain inaccuracies. Hover over any paragraph and click ✎ to edit — edits save automatically.
            </p>
          </div>

          <div className="glass-card p-6 space-y-8">
            <Section label="Objectives" color="text-indigo-400" items={report.objectives} onUpdate={updateObjective} />
            <Section label="Performance Elements" color="text-emerald-400" items={report.elements} onUpdate={updateElement} />
          </div>
        </div>
      )}
    </div>
  );
}
