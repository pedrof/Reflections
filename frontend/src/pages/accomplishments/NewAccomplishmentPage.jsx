import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api.js';

export default function NewAccomplishmentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    rawText: '',
    dateOfAccomplishment: new Date().toISOString().split('T')[0],
    tags: '',
    flaggedForComms: false,
    commsNote: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/accomplishments', data),
    onSuccess: (res) => navigate(`/accomplishments/${res.data.id}`),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      rawText: form.rawText,
      dateOfAccomplishment: form.dateOfAccomplishment,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      flaggedForComms: form.flaggedForComms,
      commsNote: form.commsNote || undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Log Accomplishment</h1>
        <p className="text-white/50 text-sm mt-1">
          Write what you did — the AI will help you shape it into STAR format
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="glass-card p-5 space-y-5">
          <div>
            <label className="label">What did you accomplish?</label>
            <textarea
              className="textarea-field"
              rows={7}
              placeholder="Describe what you did, the impact it had, and any measurable results. Don't worry about format — just capture what happened."
              value={form.rawText}
              onChange={(e) => setForm({ ...form, rawText: e.target.value })}
              required
              autoFocus
            />
            <p className="text-xs text-white/30 mt-1.5">Be specific. Include numbers, percentages, and names of systems or projects where relevant.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date of accomplishment</label>
              <input
                type="date"
                className="input-field"
                value={form.dateOfAccomplishment}
                onChange={(e) => setForm({ ...form, dateOfAccomplishment: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Tags</label>
              <input
                className="input-field"
                placeholder="automation, leadership, data"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Flag for Communications Team</div>
              <div className="text-xs text-white/40 mt-0.5">Share this accomplishment with your org's comms team</div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, flaggedForComms: !form.flaggedForComms })}
              className={`w-11 h-6 rounded-full transition-colors ${
                form.flaggedForComms ? 'bg-emerald-500' : 'bg-surface-600 border border-white/[0.12]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${
                form.flaggedForComms ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {form.flaggedForComms && (
            <div>
              <label className="label">Note for comms team (optional)</label>
              <input
                className="input-field"
                placeholder="Context for the communications team..."
                value={form.commsNote}
                onChange={(e) => setForm({ ...form, commsNote: e.target.value })}
              />
            </div>
          )}
        </div>

        {mutation.isError && (
          <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {mutation.error?.response?.data?.error || 'Something went wrong'}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save & continue to AI rewrite →'}
          </button>
        </div>
      </form>
    </div>
  );
}
