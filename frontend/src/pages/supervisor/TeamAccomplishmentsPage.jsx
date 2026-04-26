import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

export default function TeamAccomplishmentsPage() {
  const [search, setSearch] = useState('');
  const [filterFY, setFilterFY] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  const params = new URLSearchParams();
  if (filterFY) params.set('fiscalYear', filterFY);
  if (filterPeriod) params.set('period', filterPeriod);

  const { data: accomplishments, isLoading } = useQuery({
    queryKey: ['team-accomplishments', filterFY, filterPeriod],
    queryFn: () => api.get(`/accomplishments/team?${params}`).then((r) => r.data),
  });

  const filtered = accomplishments?.filter((a) => {
    if (!search) return true;
    const text = `${a.user?.name} ${a.rawText} ${a.starText || ''} ${a.tags.join(' ')}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }) || [];

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Team Activity</h1>
          <p className="text-white/50 text-sm mt-1">All accomplishments across your team</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input className="input-field max-w-xs" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field w-40" value={filterFY} onChange={(e) => setFilterFY(e.target.value)}>
          <option value="">All FY</option>
          {[currentYear + 1, currentYear, currentYear - 1].map((y) => <option key={y} value={y}>FY{y}</option>)}
        </select>
        <select className="input-field w-36" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="">All Periods</option>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Accomplishment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-t border-white/[0.04] ${i % 2 ? 'bg-white/[0.02]' : ''} hover:bg-indigo-500/5`}>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{a.user?.name}</td>
                  <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                    {new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3"><span className="badge-indigo">{a.period} FY{a.fiscalYear}</span></td>
                  <td className="px-4 py-3 text-white/70 max-w-sm">
                    <p className="line-clamp-2">{a.editedStarText || a.starText || a.rawText}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {a.starText && <span className="badge-emerald">STAR</span>}
                      {a.flaggedForComms && <span className="badge text-amber-400 bg-amber-500/10 border-amber-500/20">📢</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="📊" title="No accomplishments found" description="Your team hasn't logged any accomplishments yet." />
      )}
    </div>
  );
}
