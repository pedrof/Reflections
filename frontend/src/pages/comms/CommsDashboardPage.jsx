import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

export default function CommsDashboardPage() {
  const { data: flagged, isLoading } = useQuery({
    queryKey: ['comms-accomplishments'],
    queryFn: () => api.get('/accomplishments/comms').then((r) => r.data),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Communications Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Accomplishments flagged for your team</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-lg">📢</div>
          <div className="mt-3">
            <div className="text-3xl font-semibold text-white">{flagged?.length ?? '—'}</div>
            <div className="text-xs text-white/50">Total flagged</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-lg">👥</div>
          <div className="mt-3">
            <div className="text-3xl font-semibold text-white">
              {flagged ? new Set(flagged.map((a) => a.userId)).size : '—'}
            </div>
            <div className="text-xs text-white/50">Employees represented</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/comms/accomplishments" className="btn-primary">View all flagged accomplishments</Link>
        <Link to="/comms/report" className="btn-secondary">Generate comms report</Link>
      </div>

      <div>
        <h2 className="section-title mb-4">Recent Flagged</h2>
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : flagged?.slice(0, 5).map((a) => (
          <div key={a.id} className="glass-card p-4 mb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-white/40 mb-1">{a.user?.name} · {new Date(a.dateOfAccomplishment).toLocaleDateString('en-US', { dateStyle: 'medium' })}</div>
                <p className="text-sm text-white/70 line-clamp-2">{a.editedStarText || a.starText || a.rawText}</p>
                {a.commsNote && <p className="text-xs text-indigo-400/70 mt-1 italic">Note: {a.commsNote}</p>}
              </div>
              <span className="badge-emerald shrink-0">📢</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
