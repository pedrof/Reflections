import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

function ItemForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ title, description }); }} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="textarea-field"
          rows={5}
          placeholder="Paste the full description from your supervisor here..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

function ItemList({ items, onEdit, onDelete, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id} className="glass-card p-4 group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30 font-mono">{idx + 1}</span>
                <h3 className="text-sm font-medium text-white">{item.title}</h3>
              </div>
              <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{item.description}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(item)}
                className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] text-xs"
              >
                ✎
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="w-7 h-7 rounded flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceTab({ resource, label, emptyIcon, emptyTitle }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: items, isLoading } = useQuery({
    queryKey: [resource],
    queryFn: () => api.get(`/${resource}`).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => api.post(`/${resource}`, data),
    onSuccess: () => { qc.invalidateQueries([resource]); setShowModal(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/${resource}/${id}`, data),
    onSuccess: () => { qc.invalidateQueries([resource]); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/${resource}/${id}`),
    onSuccess: () => qc.invalidateQueries([resource]),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">{label}</h2>
          <p className="text-xs text-white/40 mt-0.5">Copy and paste from your supervisor's evaluation plan</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-1.5">
          + Add {label.slice(0, -1)}
        </button>
      </div>

      {!isLoading && !items?.length ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description="Add your supervisor-assigned items to link with your accomplishments."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Add first {label.slice(0, -1).toLowerCase()}
            </button>
          }
        />
      ) : (
        <ItemList
          items={items}
          loading={isLoading}
          onEdit={(item) => setEditing(item)}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Add ${label.slice(0, -1)}`} size="lg">
        <ItemForm
          onSave={(data) => createMut.mutate(data)}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${label.slice(0, -1)}`} size="lg">
        {editing && (
          <ItemForm
            initial={editing}
            onSave={(data) => updateMut.mutate({ id: editing.id, data })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export default function SetupPage() {
  const [tab, setTab] = useState('objectives');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Setup</h1>
        <p className="text-white/50 text-sm mt-1">Configure your objectives and performance elements</p>
      </div>

      <div className="flex gap-1 p-1 bg-surface-800 rounded-lg w-fit border border-white/[0.06]">
        {[['objectives', 'Objectives'], ['elements', 'Elements']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === key
                ? 'bg-indigo-500 text-white shadow-glow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'objectives' ? (
          <ResourceTab
            resource="objectives"
            label="Objectives"
            emptyIcon="⊞"
            emptyTitle="No objectives yet"
          />
        ) : (
          <ResourceTab
            resource="elements"
            label="Elements"
            emptyIcon="⚙"
            emptyTitle="No performance elements yet"
          />
        )}
      </div>
    </div>
  );
}
