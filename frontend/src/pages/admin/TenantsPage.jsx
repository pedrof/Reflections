import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

function TenantForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ name, slug }); }} className="space-y-4">
      <div>
        <label className="label">Organization Name</label>
        <input className="input-field" value={name} onChange={(e) => { setName(e.target.value); if (!initial) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} required />
      </div>
      <div>
        <label className="label">Slug</label>
        <input className="input-field font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9-]+" title="Lowercase letters, numbers, and hyphens only" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

export default function TenantsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/tenants').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => api.post('/tenants', data),
    onSuccess: () => { qc.invalidateQueries(['tenants']); setShowAdd(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/tenants/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['tenants']); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tenants/${id}`),
    onSuccess: () => qc.invalidateQueries(['tenants']),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="text-white/50 text-sm mt-1">{tenants?.length ?? 0} tenants</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add organization</button>
      </div>

      {!isLoading && !tenants?.length ? (
        <EmptyState icon="🏛" title="No organizations" description="Create your first organization." action={<button onClick={() => setShowAdd(true)} className="btn-primary">Add organization</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants?.map((t) => (
            <div key={t.id} className="glass-card p-5 group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-white">{t.name}</div>
                  <div className="text-xs text-white/40 font-mono mt-0.5">{t.slug}</div>
                  <div className="text-xs text-white/40 mt-2">{t._count?.users ?? 0} users</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(t)} className="btn-secondary text-xs px-2 py-1">Edit</button>
                  <button onClick={() => { if (window.confirm(`Delete ${t.name}?`)) deleteMut.mutate(t.id); }} className="btn-danger text-xs px-2 py-1">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Organization">
        <TenantForm onSave={(data) => createMut.mutate(data)} onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Organization">
        {editing && <TenantForm initial={editing} onSave={(data) => updateMut.mutate({ id: editing.id, data })} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
