import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

function AccomplishmentCard({ acc }) {
  return (
    <Link
      to={`/accomplishments/${acc.id}`}
      className="glass-card p-5 block hover:border-indigo-500/30 transition-all group hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex gap-2 flex-wrap">
          <span className="badge-indigo">{acc.period} FY{acc.fiscalYear}</span>
          {acc.flaggedForComms && <span className="badge-emerald">📢 comms</span>}
          {acc.starText && <span className="badge text-emerald-400/70 text-[10px]">✓ STAR</span>}
        </div>
        <span className="text-xs text-white/30 shrink-0">
          {new Date(acc.dateOfAccomplishment).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <p className="text-sm text-white/70 line-clamp-3 group-hover:text-white/90 transition-colors leading-relaxed">
        {acc.editedStarText || acc.starText || acc.rawText}
      </p>
      {acc.tags?.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {acc.tags.map((t) => (
            <span key={t} className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function AccomplishmentsPage() {
  const [search, setSearch] = useState('');
  const [filterFY, setFilterFY] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterComms, setFilterComms] = useState('');

  const params = new URLSearchParams();
  if (filterFY) params.set('fiscalYear', filterFY);
  if (filterPeriod) params.set('period', filterPeriod);
  if (filterComms) params.set('flaggedForComms', filterComms);

  const { data: accomplishments, isLoading } = useQuery({
    queryKey: ['accomplishments', filterFY, filterPeriod, filterComms],
    queryFn: () => api.get(`/accomplishments?${params}`).then((r) => r.data),
  });

  const filtered = accomplishments?.filter((a) => {
    if (!search) return true;
    const text = `${a.rawText} ${a.starText || ''} ${a.editedStarText || ''} ${a.tags.join(' ')}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }) || [];

  const currentYear = new Date().getFullYear();
  const fyOptions = [currentYear + 1, currentYear, currentYear - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Accomplishments</h1>
          <p className="text-white/50 text-sm mt-1">{accomplishments?.length ?? 0} total</p>
        </div>
        <Link to="/accomplishments/new" className="btn-primary">+ Log accomplishment</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="input-field max-w-xs"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input-field w-40" value={filterFY} onChange={(e) => setFilterFY(e.target.value)}>
          <option value="">All FY</option>
          {fyOptions.map((y) => <option key={y} value={y}>FY{y}</option>)}
        </select>
        <select className="input-field w-36" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="">All Periods</option>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input-field w-44" value={filterComms} onChange={(e) => setFilterComms(e.target.value)}>
          <option value="">All</option>
          <option value="true">Flagged for comms</option>
          <option value="false">Not flagged</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((a) => <AccomplishmentCard key={a.id} acc={a} />)}
        </div>
      ) : (
        <EmptyState
          icon="✦"
          title="No accomplishments found"
          description={search ? 'Try adjusting your search or filters.' : 'Start recording your work to build your performance record.'}
          action={!search && <Link to="/accomplishments/new" className="btn-primary">Log your first accomplishment</Link>}
        />
      )}
    </div>
  );
}
