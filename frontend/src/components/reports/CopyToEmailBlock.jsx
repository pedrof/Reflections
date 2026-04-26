import { useState } from 'react';

function formatSTAR(text) {
  if (!text) return '';
  return text
    .replace(/\*\*Situation:\*\*/g, 'Situation:')
    .replace(/\*\*Task:\*\*/g, 'Task:')
    .replace(/\*\*Action:\*\*/g, 'Action:')
    .replace(/\*\*Result:\*\*/g, 'Result:');
}

export default function CopyToEmailBlock({ data }) {
  const [copied, setCopied] = useState(false);

  const text = [
    'WEEKLY ACTIVITY REPORT',
    `Employee: ${data.employee?.name || ''}`,
    `Period: ${data.startDate} – ${data.endDate}`,
    `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
    '',
    'SUMMARY',
    data.narrative || '(No summary generated)',
    '',
    'ACCOMPLISHMENTS',
    ...(data.accomplishments || []).map((a, i) => {
      const text = a.editedStarText || a.starText || a.rawText;
      return `${i + 1}.\n${formatSTAR(text)}\n`;
    }),
    ...(data.objectivesCovered?.length ? [
      'OBJECTIVES SUPPORTED',
      ...data.objectivesCovered.map((o) => `- ${o.title}`),
      '',
    ] : []),
    ...(data.elementsCovered?.length ? [
      'PERFORMANCE ELEMENTS DEMONSTRATED',
      ...data.elementsCovered.map((e) => `- ${e.title}`),
    ] : []),
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Copy to Email</h3>
        <button onClick={handleCopy} className="btn-secondary text-xs px-3 py-1.5">
          {copied ? '✓ Copied!' : '⎘ Copy'}
        </button>
      </div>
      <textarea
        readOnly
        className="textarea-field font-mono text-xs text-white/60"
        rows={12}
        value={text}
      />
    </div>
  );
}
