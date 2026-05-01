import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import api from '../../services/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import WARDocument from '../../components/reports/WARDocument.jsx';
import CopyToEmailBlock from '../../components/reports/CopyToEmailBlock.jsx';
import { useAuthStore } from '../../store/auth.store.js';

async function exportWARToWord(data) {
  const children = [];
  const divider = () => new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    spacing: { before: 80, after: 80 },
  });
  const body = (text) => new Paragraph({
    children: [new TextRun({ text, size: 24, font: 'Calibri' })],
    spacing: { after: 160 },
    alignment: AlignmentType.JUSTIFIED,
  });

  children.push(
    new Paragraph({ children: [new TextRun({ text: 'Weekly Activity Report', bold: true, size: 36, font: 'Calibri' })], heading: HeadingLevel.TITLE, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `${data.employee?.name}  |  ${data.startDate} – ${data.endDate}`, size: 24, color: '666666', font: 'Calibri' })], spacing: { after: 320 } }),
    divider(),
  );

  if (data.narrative) {
    children.push(
      new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
      body(data.narrative),
      divider(),
    );
  }

  if (data.accomplishments?.length) {
    children.push(new Paragraph({ text: 'Accomplishments', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }));
    data.accomplishments.forEach((a, i) => {
      const text = a.editedStarText || a.starText || a.rawText || '';
      const date = new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      children.push(
        new Paragraph({ children: [new TextRun({ text: `#${i + 1} — ${date}`, bold: true, size: 22, font: 'Calibri', color: '6366f1' })], spacing: { before: 160, after: 60 } }),
        body(text.replace(/\*\*(Situation|Task|Action|Result):\*\*/g, '$1: ')),
      );
    });
  }

  if (data.objectivesCovered?.length) {
    children.push(divider(), new Paragraph({ text: 'Objectives Supported', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }));
    data.objectivesCovered.forEach((o) => children.push(
      new Paragraph({ children: [new TextRun({ text: `• ${o.title}`, size: 24, font: 'Calibri' })], spacing: { after: 60 } }),
    ));
  }

  if (data.elementsCovered?.length) {
    children.push(divider(), new Paragraph({ text: 'Performance Elements Demonstrated', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }));
    data.elementsCovered.forEach((e) => children.push(
      new Paragraph({ children: [new TextRun({ text: `• ${e.title}`, size: 24, font: 'Calibri' })], spacing: { after: 60 } }),
    ));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 24 } } } },
    sections: [{ properties: {}, children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `WAR-${data.employee?.name?.replace(/\s+/g, '-')}-${data.startDate}.docx`);
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  return [mon.toISOString().split('T')[0], fri.toISOString().split('T')[0]];
}

export default function WARPage() {
  const { user } = useAuthStore();
  const [defaultStart, defaultEnd] = getWeekRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selected, setSelected] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [wordExporting, setWordExporting] = useState(false);

  const params = new URLSearchParams({ fiscalYear: '', period: '' });

  const { data: accomplishments, isLoading } = useQuery({
    queryKey: ['accomplishments'],
    queryFn: () => api.get('/accomplishments').then((r) => r.data),
  });

  const inRange = accomplishments?.filter((a) => {
    const d = a.dateOfAccomplishment.split('T')[0];
    return d >= startDate && d <= endDate;
  }) || [];

  const previewMut = useMutation({
    mutationFn: (data) => api.post('/reports/war/preview', data),
    onSuccess: (res) => setReportData(res.data),
  });

  const handleGenerate = () => {
    previewMut.mutate({
      startDate,
      endDate,
      accomplishmentIds: selected.length ? selected : inRange.map((a) => a.id),
    });
  };

  const toggleSelect = (id) => setSelected((s) =>
    s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Weekly Activity Report</h1>
        <p className="text-white/50 text-sm mt-1">Generate a WAR from your accomplishments</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: inputs */}
        <div className="space-y-5">
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
          </div>

          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">Accomplishments in range</h2>
              <span className="text-xs text-white/40">{inRange.length} found</span>
            </div>
            {isLoading ? (
              <Spinner size="sm" />
            ) : inRange.length ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {inRange.map((a) => (
                  <label key={a.id} className="flex items-start gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-white/[0.03]">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-indigo-500 shrink-0"
                      checked={selected.length === 0 || selected.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                        {a.editedStarText || a.starText || a.rawText}
                      </p>
                      <span className="badge-indigo mt-1 inline-block">{a.period}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">No accomplishments in this date range.</p>
            )}

            <button
              onClick={handleGenerate}
              className="btn-primary w-full"
              disabled={previewMut.isPending || !inRange.length}
            >
              {previewMut.isPending ? <><Spinner size="sm" /><span>Generating...</span></> : '✨ Generate WAR'}
            </button>
          </div>
        </div>

        {/* Right: preview */}
        <div className="space-y-4">
          {reportData ? (
            <>
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="section-title text-sm">Preview</h2>
                  <div className="flex gap-2">
                    <PDFDownloadLink
                      document={<WARDocument data={reportData} />}
                      fileName={`WAR-${user?.name?.replace(/\s+/g, '-')}-${startDate}.pdf`}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {({ loading }) => loading ? 'Building PDF...' : '⬇ PDF'}
                    </PDFDownloadLink>
                    <button
                      className="btn-primary text-xs px-3 py-1.5"
                      disabled={wordExporting}
                      onClick={async () => { setWordExporting(true); try { await exportWARToWord(reportData); } finally { setWordExporting(false); } }}
                    >
                      {wordExporting ? <><Spinner size="sm" /><span>Exporting...</span></> : '⬇ Word (.docx)'}
                    </button>
                  </div>
                </div>

                <div className="bg-surface-700 rounded-lg p-4 space-y-3">
                  <div className="border-b border-white/[0.06] pb-3">
                    <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Weekly Activity Report</div>
                    <div className="text-sm font-medium text-white mt-1">{reportData.employee?.name}</div>
                    <div className="text-xs text-white/50">{reportData.startDate} – {reportData.endDate}</div>
                  </div>

                  {reportData.narrative && (
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Summary</div>
                      <p className="text-xs text-white/70 leading-relaxed">{reportData.narrative}</p>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1.5">
                      {reportData.accomplishments?.length} Accomplishments
                    </div>
                    {reportData.accomplishments?.map((a, i) => (
                      <div key={a.id} className="text-xs text-white/60 py-1.5 border-b border-white/[0.04] last:border-0">
                        {i + 1}. {(a.editedStarText || a.starText || a.rawText)?.slice(0, 100)}...
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <CopyToEmailBlock data={reportData} />
            </>
          ) : (
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center h-64">
              <div className="text-3xl mb-3">📋</div>
              <p className="text-sm text-white/40">Configure your date range and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
