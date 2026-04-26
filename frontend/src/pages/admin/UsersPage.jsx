import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', debouncedSearch],
    queryFn: () => api.get(`/users/all${debouncedSearch ? `?q=${debouncedSearch}` : ''}`).then((r) => r.data),
  });

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => setDebouncedSearch(v), 300);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">All Users</h1>
          <p className="text-white/50 text-sm mt-1">Search across all organizations</p>
        </div>
        <input
          className="input-field max-w-xs"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700">
                {['Name', 'Email', 'Organization', 'Roles', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map((u, i) => (
                <tr key={u.id} className={`border-t border-white/[0.04] ${i % 2 ? 'bg-white/[0.02]' : ''} hover:bg-indigo-500/5`}>
                  <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-white/50">{u.email}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-white/70 text-xs">{u.tenant?.name}</div>
                      <div className="text-white/30 text-[10px] font-mono">{u.tenant?.slug}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r) => <span key={r} className="badge-indigo">{r}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'badge-emerald' : 'badge-rose'}>
                      {u.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users?.length && (
            <div className="text-center py-12 text-white/40 text-sm">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
