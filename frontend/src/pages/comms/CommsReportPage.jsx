import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PDFDownloadLink } from '@react-pdf/renderer';
import api from '../../services/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import CommsDocument from '../../components/reports/CommsDocument.jsx';

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return [start, end];
}

export default function CommsReportPage() {
  const [defaultStart, defaultEnd] = getMonthRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [reportData, setReportData] = useState(null);

  const previewMut = useMutation({
    mutationFn: (data) => api.post('/reports/comms/preview', data),
    onSuccess: (res) => setReportData(res.data),
  });

  const [copied, setCopied] = useState(false);

  const plainText = reportData ? [
    'ACCOMPLISHMENTS REPORT — COMMUNICATIONS TEAM',
    `Organization: ${reportData.tenant?.name}`,
    `Period: ${reportData.startDate} – ${reportData.endDate}`,
    `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`,
    `Total: ${reportData.total} accomplishments`,
    '',
    ...(reportData.groups || []).flatMap((g) => [
      `\n${g.user.name.toUpperCase()}`,
      '─'.repeat(40),
      ...(g.accomplishments || []).map((a, i) => {
        const lines = [
          `${i + 1}. ${new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
          (a.editedStarText || a.starText || a.rawText).replace(/\*\*(.*?)\*\*/g, '$1'),
        ];
        if (a.commsNote) lines.push(`Note: ${a.commsNote}`);
        return lines.join('\n');
      }),
    ]),
  ].join('\n') : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Comms Report</h1>
        <p className="text-white/50 text-sm mt-1">Generate a communications report from flagged accomplishments</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 space-y-4">
          <h2 className="section-title text-sm">Date Range</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <button
            onClick={() => previewMut.mutate({ startDate, endDate })}
            className="btn-primary w-full"
            disabled={previewMut.isPending}
          >
            {previewMut.isPending ? <><Spinner size="sm" /><span>Generating...</span></> : '📊 Generate Report'}
          </button>
        </div>

        {reportData && (
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="section-title text-sm">Report Ready</h2>
                <div className="flex gap-2">
                  <PDFDownloadLink
                    document={<CommsDocument data={reportData} />}
                    fileName={`Comms-Report-${startDate}.pdf`}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {({ loading }) => loading ? 'Building...' : '⬇ Download PDF'}
                  </PDFDownloadLink>
                </div>
              </div>
              <div className="text-sm text-white/60">
                <span className="text-white font-medium">{reportData.total}</span> accomplishments from{' '}
                <span className="text-white font-medium">{reportData.groups?.length}</span> employees
              </div>
              {reportData.groups?.map((g) => (
                <div key={g.user.id} className="text-xs text-white/50 pl-3 border-l border-white/[0.06]">
                  {g.user.name} — {g.accomplishments.length} accomplishments
                </div>
              ))}
            </div>

            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Copy to Email</h3>
                <button
                  onClick={() => { navigator.clipboard.writeText(plainText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  {copied ? '✓ Copied!' : '⎘ Copy'}
                </button>
              </div>
              <textarea readOnly className="textarea-field font-mono text-xs text-white/60" rows={10} value={plainText} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
