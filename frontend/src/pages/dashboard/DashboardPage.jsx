import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';
import { reflectionsSayings } from '../../constants/sayings.js';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';
import api from '../../services/api.js';

const saying = reflectionsSayings[Math.floor(Math.random() * reflectionsSayings.length)];

function StatCard({ label, value, icon, color = 'indigo' }) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center text-lg`}>{icon}</div>
      </div>
      <div className="mt-3">
        <div className="text-3xl font-semibold text-white">{value}</div>
        <div className="text-xs text-white/50 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function AccomplishmentFeedItem({ acc }) {
  return (
    <Link to={`/accomplishments/${acc.id}`} className="block glass-card p-4 hover:border-indigo-500/30 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/80 line-clamp-2 group-hover:text-white transition-colors">
            {acc.editedStarText || acc.starText || acc.rawText}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-white/30">
              {new Date(acc.dateOfAccomplishment).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-white/20">·</span>
            <span className="badge-indigo">{acc.period} FY{acc.fiscalYear}</span>
            {acc.flaggedForComms && <span className="badge-emerald">comms</span>}
          </div>
        </div>
        {acc.starText && (
          <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-1.5" title="STAR rewrite complete" />
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: accomplishments, isLoading: loadingAcc } = useQuery({
    queryKey: ['accomplishments'],
    queryFn: () => api.get('/accomplishments').then((r) => r.data),
  });

  const { data: objectives } = useQuery({
    queryKey: ['objectives'],
    queryFn: () => api.get('/objectives').then((r) => r.data),
  });

  const { data: elements } = useQuery({
    queryKey: ['elements'],
    queryFn: () => api.get('/elements').then((r) => r.data),
  });

  const flagged = accomplishments?.filter((a) => a.flaggedForComms).length || 0;
  const recent = accomplishments?.slice(0, 5) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">
          Good {getTimeOfDay()}, {user?.name?.split(' ')[0]}
        </p>
      </div>

      {/* Saying */}
      <div className="glass-card p-5 border-l-2 border-indigo-500">
        <p className="text-sm text-white/60 italic leading-relaxed">"{saying}"</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Accomplishments" value={accomplishments?.length ?? '—'} icon="✦" color="indigo" />
        <StatCard label="Objectives" value={objectives?.length ?? '—'} icon="⊞" color="emerald" />
        <StatCard label="Elements" value={elements?.length ?? '—'} icon="⚙" color="amber" />
        <StatCard label="Flagged for Comms" value={flagged} icon="📢" color="rose" />
      </div>

      {/* Recent accomplishments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Accomplishments</h2>
          <Link to="/accomplishments/new" className="btn-primary text-xs px-3 py-1.5">
            + New
          </Link>
        </div>

        {loadingAcc ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : recent.length ? (
          <div className="space-y-3">
            {recent.map((a) => <AccomplishmentFeedItem key={a.id} acc={a} />)}
            {accomplishments.length > 5 && (
              <Link to="/accomplishments" className="block text-center text-sm text-indigo-400 hover:text-indigo-300 py-2">
                View all {accomplishments.length} accomplishments →
              </Link>
            )}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-white/40 text-sm mb-4">No accomplishments yet. Start recording your work.</p>
            <Link to="/accomplishments/new" className="btn-primary">Log your first accomplishment</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
