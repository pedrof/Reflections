import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

function Stage({ number, title, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${
      done ? 'text-emerald-400' : active ? 'text-indigo-400' : 'text-white/30'
    }`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
        done ? 'bg-emerald-500/20 border-emerald-500/40' :
        active ? 'bg-indigo-500/20 border-indigo-500/40' :
        'border-white/10'
      }`}>
        {done ? '✓' : number}
      </div>
      {title}
    </div>
  );
}

function STARDisplay({ text }) {
  if (!text) return null;
  const sections = text.split(/\*\*(Situation|Task|Action|Result):\*\*/);
  if (sections.length <= 1) {
    return <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{text}</p>;
  }
  const labels = ['Situation', 'Task', 'Action', 'Result'];
  const colors = {
    Situation: 'text-indigo-400',
    Task: 'text-amber-400',
    Action: 'text-emerald-400',
    Result: 'text-rose-400',
  };
  return (
    <div className="space-y-4">
      {labels.map((label, i) => {
        const content = sections[i * 2 + 2];
        if (!content) return null;
        return (
          <div key={label}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${colors[label]}`}>{label}</span>
            <p className="text-sm text-white/80 mt-1 leading-relaxed">{content.trim()}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function AccomplishmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editedText, setEditedText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [selectedObjectives, setSelectedObjectives] = useState(null);
  const [selectedElements, setSelectedElements] = useState(null);

  const { data: acc, isLoading } = useQuery({
    queryKey: ['accomplishment', id],
    queryFn: () => api.get(`/accomplishments/${id}`).then((r) => r.data),
    onSuccess: (data) => {
      if (!editedText && data.editedStarText) setEditedText(data.editedStarText);
      if (!selectedObjectives) setSelectedObjectives(data.objectives.map((o) => o.objectiveId));
      if (!selectedElements) setSelectedElements(data.elements.map((e) => e.elementId));
    },
  });

  const { data: objectives } = useQuery({
    queryKey: ['objectives'],
    queryFn: () => api.get('/objectives').then((r) => r.data),
  });

  const { data: elements } = useQuery({
    queryKey: ['elements'],
    queryFn: () => api.get('/elements').then((r) => r.data),
  });

  const rewriteMut = useMutation({
    mutationFn: () => api.post(`/accomplishments/${id}/rewrite`),
    onSuccess: () => qc.invalidateQueries(['accomplishment', id]),
    onError: () => {},
  });

  const recommendMut = useMutation({
    mutationFn: () => api.post(`/accomplishments/${id}/recommend`),
    onSuccess: (res) => {
      qc.invalidateQueries(['accomplishment', id]);
      if (res.data.aiRecommendations) {
        setSelectedObjectives(res.data.aiRecommendations.objectiveIds || []);
        setSelectedElements(res.data.aiRecommendations.elementIds || []);
      }
    },
    onError: () => {},
  });

  const updateMut = useMutation({
    mutationFn: (data) => api.patch(`/accomplishments/${id}`, data),
    onSuccess: () => qc.invalidateQueries(['accomplishment', id]),
  });

  const linkMut = useMutation({
    mutationFn: (data) => api.post(`/accomplishments/${id}/link`, data),
    onSuccess: () => qc.invalidateQueries(['accomplishment', id]),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/accomplishments/${id}`),
    onSuccess: () => navigate('/accomplishments'),
  });

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (!acc) return <div className="text-white/50">Not found.</div>;

  const stage = acc.editedStarText ? 3 : acc.starText ? 2 : 1;
  const objIds = selectedObjectives ?? acc.objectives.map((o) => o.objectiveId);
  const elIds = selectedElements ?? acc.elements.map((e) => e.elementId);

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/accomplishments" className="text-xs text-white/40 hover:text-white/70 mb-2 inline-block">← Back</Link>
          <h1 className="page-title">Accomplishment Detail</h1>
          <div className="flex gap-2 mt-2">
            <span className="badge-indigo">{acc.period} FY{acc.fiscalYear}</span>
            <span className="text-xs text-white/30">
              {new Date(acc.dateOfAccomplishment).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </span>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm('Delete this accomplishment?')) deleteMut.mutate(); }}
          className="btn-danger text-xs px-3 py-1.5"
        >
          Delete
        </button>
      </div>

      {/* Progress indicator */}
      <div className="glass-card p-4 flex gap-6">
        <Stage number="1" title="Raw entry" done={stage >= 1} active={stage === 1} />
        <div className="w-8 h-px bg-white/[0.06] self-center" />
        <Stage number="2" title="AI STAR rewrite" done={stage >= 2} active={stage === 2} />
        <div className="w-8 h-px bg-white/[0.06] self-center" />
        <Stage number="3" title="Edited & linked" done={stage >= 3} active={stage === 3} />
      </div>

      {/* Stage 1: Raw text */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">1 — Raw Entry</h2>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">{acc.rawText}</p>
        {!acc.starText && (
          <button
            onClick={() => rewriteMut.mutate()}
            className="btn-primary text-xs px-3 py-1.5"
            disabled={rewriteMut.isPending}
          >
            {rewriteMut.isPending ? <><Spinner size="sm" /><span>Rewriting...</span></> : '✨ Rewrite in STAR format'}
          </button>
        )}
      </div>

      {/* Stage 2: AI STAR */}
      {acc.starText && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">2 — AI STAR Rewrite</h2>
            <button
              onClick={() => rewriteMut.mutate()}
              className="btn-secondary text-xs px-2 py-1"
              disabled={rewriteMut.isPending}
            >
              {rewriteMut.isPending ? <Spinner size="sm" /> : '↺ Regenerate'}
            </button>
          </div>
          <STARDisplay text={acc.starText} />

          {!editMode ? (
            <button onClick={() => { setEditMode(true); setEditedText(acc.editedStarText || acc.starText); }} className="btn-secondary text-xs px-3 py-1.5">
              ✎ Edit this version
            </button>
          ) : (
            <div className="space-y-3">
              <label className="label">Your edited version</label>
              <textarea
                className="textarea-field"
                rows={10}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setEditMode(false)} className="btn-secondary text-xs">Cancel</button>
                <button
                  onClick={() => updateMut.mutate({ editedStarText: editedText })}
                  className="btn-primary text-xs"
                  disabled={updateMut.isPending}
                >
                  Save edits
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage 3: Links */}
      {acc.starText && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">3 — Link to Objectives & Elements</h2>
            {!acc.aiRecommendations && (
              <button
                onClick={() => recommendMut.mutate()}
                className="btn-primary text-xs px-3 py-1.5"
                disabled={recommendMut.isPending}
              >
                {recommendMut.isPending ? <><Spinner size="sm" /><span>Analyzing...</span></> : '🔗 AI Recommendations'}
              </button>
            )}
          </div>

          {acc.aiRecommendations && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 text-xs text-white/60">
              <span className="text-indigo-400 font-medium">AI Reasoning: </span>
              {acc.aiRecommendations.reasoning}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Objectives</label>
              <div className="space-y-2">
                {objectives?.map((obj) => (
                  <label key={obj.id} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-indigo-500"
                      checked={objIds.includes(obj.id)}
                      onChange={(e) => setSelectedObjectives(
                        e.target.checked ? [...objIds, obj.id] : objIds.filter((x) => x !== obj.id)
                      )}
                    />
                    <span className="text-xs text-white/70 group-hover:text-white transition-colors leading-relaxed">
                      {obj.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Performance Elements</label>
              <div className="space-y-2">
                {elements?.map((el) => (
                  <label key={el.id} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-indigo-500"
                      checked={elIds.includes(el.id)}
                      onChange={(e) => setSelectedElements(
                        e.target.checked ? [...elIds, el.id] : elIds.filter((x) => x !== el.id)
                      )}
                    />
                    <span className="text-xs text-white/70 group-hover:text-white transition-colors leading-relaxed">
                      {el.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => linkMut.mutate({ objectiveIds: objIds, elementIds: elIds })}
            className="btn-primary text-xs px-3 py-1.5"
            disabled={linkMut.isPending}
          >
            {linkMut.isPending ? 'Saving...' : 'Confirm Links'}
          </button>
        </div>
      )}

      {/* Comms flag */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Communications Flag</div>
            <div className="text-xs text-white/40 mt-0.5">Share with your organization's comms team</div>
          </div>
          <button
            onClick={() => updateMut.mutate({ flaggedForComms: !acc.flaggedForComms })}
            className={`w-11 h-6 rounded-full transition-colors ${
              acc.flaggedForComms ? 'bg-emerald-500' : 'bg-surface-600 border border-white/[0.12]'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${
              acc.flaggedForComms ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        {acc.flaggedForComms && (
          <div>
            <label className="label">Note for comms team</label>
            <input
              className="input-field"
              placeholder="Context for the communications team..."
              defaultValue={acc.commsNote || ''}
              onBlur={(e) => updateMut.mutate({ commsNote: e.target.value || null })}
            />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="glass-card p-5">
        <label className="label">Tags</label>
        <input
          className="input-field"
          placeholder="automation, leadership, data"
          defaultValue={acc.tags?.join(', ')}
          onBlur={(e) => updateMut.mutate({
            tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
          })}
        />
      </div>
    </div>
  );
}
