import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

export default function CommsAccomplishmentsPage() {
  const [search, setSearch] = useState('');

  const { data: accomplishments, isLoading } = useQuery({
    queryKey: ['comms-accomplishments'],
    queryFn: () => api.get('/accomplishments/comms').then((r) => r.data),
  });

  const filtered = accomplishments?.filter((a) => {
    if (!search) return true;
    const text = `${a.user?.name} ${a.rawText} ${a.starText || ''} ${a.commsNote || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Flagged Accomplishments</h1>
          <p className="text-white/50 text-sm mt-1">All accomplishments flagged for communications</p>
        </div>
        <input
          className="input-field max-w-xs"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700 text-left">
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Accomplishment</th>
                <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-t border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.02]'} hover:bg-indigo-500/5 transition-colors`}>
                  <td className="px-4 py-3 text-white/80 font-medium whitespace-nowrap">{a.user?.name}</td>
                  <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">
                    {new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3 text-white/70 max-w-md">
                    <p className="line-clamp-2">{a.editedStarText || a.starText || a.rawText}</p>
                  </td>
                  <td className="px-4 py-3 text-indigo-400/70 text-xs italic max-w-xs">
                    {a.commsNote || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="📢" title="No flagged accomplishments" description="Accomplishments flagged by employees will appear here." />
      )}
    </div>
  );
}
