import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api.js';
import Spinner from '../../components/ui/Spinner.jsx';

function currentFiscalYear() {
  const now = new Date();
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

function Section({ label, color, items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-4">
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${color} pb-1 border-b border-white/[0.06]`}>
        {label}
      </div>
      {items.map((item) =>
        item.paragraph ? (
          <div key={item.id} className="space-y-1.5">
            <div className="text-xs font-semibold text-white/80">{item.title}</div>
            <p className="text-sm text-white/70 leading-relaxed">{item.paragraph}</p>
          </div>
        ) : null
      )}
    </div>
  );
}

function buildPlainText(report) {
  if (!report) return '';
  const lines = [`Annual Performance Report — ${report.employee?.name} — FY${report.fiscalYear}\n`];
  if (report.objectives?.some((o) => o.paragraph)) {
    lines.push('OBJECTIVES\n');
    report.objectives.forEach((o) => {
      if (o.paragraph) lines.push(`${o.title}\n${o.paragraph}\n`);
    });
  }
  if (report.elements?.some((e) => e.paragraph)) {
    lines.push('PERFORMANCE ELEMENTS\n');
    report.elements.forEach((e) => {
      if (e.paragraph) lines.push(`${e.title}\n${e.paragraph}\n`);
    });
  }
  return lines.join('\n');
}

export default function YearlyReportPage() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentFiscalYear() - i);

  const generateMut = useMutation({
    mutationFn: () => api.post('/reports/yearly', { fiscalYear }).then((r) => r.data),
    onSuccess: (data) => setReport(data),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPlainText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Draft Yearly Report</h1>
        <p className="text-white/50 text-sm mt-1">
          AI-generated annual performance narrative by objective and element
        </p>
      </div>

      <div className="glass-card p-5 flex items-end gap-4">
        <div>
          <label className="label">Fiscal Year</label>
          <select
            className="input-field w-36"
            value={fiscalYear}
            onChange={(e) => { setFiscalYear(Number(e.target.value)); setReport(null); }}
          >
            {years.map((y) => (
              <option key={y} value={y}>FY{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => generateMut.mutate()}
          className="btn-primary"
          disabled={generateMut.isPending}
        >
          {generateMut.isPending
            ? <><Spinner size="sm" /><span>Generating...</span></>
            : '✨ Generate Report'}
        </button>
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
              <div className="text-xs text-white/40">Annual Performance Narrative — FY{report.fiscalYear}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => generateMut.mutate()} className="btn-secondary text-xs px-2 py-1" disabled={generateMut.isPending}>
                {generateMut.isPending ? <Spinner size="sm" /> : '↺ Regenerate'}
              </button>
              <button onClick={handleCopy} className="btn-primary text-xs px-3 py-1.5">
                {copied ? '✓ Copied' : '⎘ Copy text'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
            <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              <span className="font-semibold text-amber-300">Review before submitting.</span> AI-generated content may contain inaccuracies. Verify all facts and figures reflect actual work before using in a formal evaluation.
            </p>
          </div>

          <div className="glass-card p-6 space-y-8">
            <Section label="Objectives" color="text-indigo-400" items={report.objectives} />
            <Section label="Performance Elements" color="text-emerald-400" items={report.elements} />
          </div>
        </div>
      )}
    </div>
  );
}
