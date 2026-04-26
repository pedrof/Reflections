import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

const ALL_ROLES = ['employee', 'supervisor', 'comms', 'super_admin'];

function UserForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    password: '',
    roles: initial?.roles || ['employee'],
    isActive: initial?.isActive ?? true,
  });

  const toggleRole = (r) => setForm((f) => ({
    ...f,
    roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
  }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!initial} disabled={!!initial} />
        </div>
      </div>
      {!initial && (
        <div>
          <label className="label">Password</label>
          <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
      )}
      <div>
        <label className="label">Roles</label>
        <div className="flex gap-2 flex-wrap">
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleRole(r)}
              className={`badge cursor-pointer transition-all ${
                form.roles.includes(r) ? 'badge-indigo' : 'bg-surface-700 text-white/40 border border-white/[0.06]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {initial && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="accent-indigo-500"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          <span className="text-sm text-white/70">Active</span>
        </label>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries(['users']); setShowAdd(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['users']); setEditing(null); },
  });

  const deactivateMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries(['users']),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="text-white/50 text-sm mt-1">{users?.length ?? 0} members</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add member</button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : users?.length ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Roles</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-t border-white/[0.04] ${i % 2 ? 'bg-white/[0.02]' : ''} hover:bg-indigo-500/5`}>
                  <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-white/50">{u.email}</td>
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
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setEditing(u)} className="btn-secondary text-xs px-2 py-1">Edit</button>
                      {u.isActive && (
                        <button onClick={() => deactivateMut.mutate(u.id)} className="btn-danger text-xs px-2 py-1">Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="👥" title="No team members" description="Add your first team member." action={<button onClick={() => setShowAdd(true)} className="btn-primary">Add member</button>} />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member" size="md">
        <UserForm onSave={(data) => createMut.mutate(data)} onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Team Member" size="md">
        {editing && <UserForm initial={editing} onSave={(data) => updateMut.mutate({ id: editing.id, data })} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
