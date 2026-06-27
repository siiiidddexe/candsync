import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';

const COLORS = ['#6366f1','#3b82f6','#10b981','#22c55e','#f59e0b','#ef4444','#94a3b8','#8b5cf6','#ec4899','#f97316'];

function StatusModal({ status, onClose, onSaved }) {
  const [form, setForm] = useState({ name: status?.name || '', color: status?.color || '#6366f1', order_index: status?.order_index ?? 0 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (status) {
        await api.put(`/statuses/${status.id}`, form);
        toast.success('Status updated');
      } else {
        await api.post('/statuses', form);
        toast.success('Status created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold">{status ? 'Edit Status' : 'New Status'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Shortlisted" />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-7 h-7 rounded-full border border-slate-200 cursor-pointer p-0.5" />
            </div>
          </div>
          <div>
            <label className="label">Order</label>
            <input type="number" className="input" value={form.order_index} onChange={e => setForm(p => ({ ...p, order_index: Number(e.target.value) }))} min="0" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Statuses() {
  const { can } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);

  const fetchStatuses = async () => {
    try {
      const { data } = await api.get('/statuses');
      setStatuses(data);
    } catch { toast.error('Failed to load statuses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatuses(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete status "${name}"? Candidates with this status will be unset.`)) return;
    try {
      await api.delete(`/statuses/${id}`);
      toast.success('Status deleted');
      fetchStatuses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Statuses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage candidate pipeline stages</p>
        </div>
        {can('statuses', 'create') && (
          <button className="btn-primary" onClick={() => setModal(null)}>
            <PlusIcon className="w-4 h-4" /> New Status
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : statuses.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <TagIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No statuses yet</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {statuses.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-sm font-medium text-slate-800">{s.name}</span>
              <span className="text-xs text-slate-400">order {s.order_index}</span>
              <div className="flex items-center gap-1">
                {can('statuses', 'update') && (
                  <button onClick={() => setModal(s)} className="btn-ghost btn-sm p-1.5">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                )}
                {can('statuses', 'delete') && (
                  <button onClick={() => handleDelete(s.id, s.name)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <StatusModal
          status={modal}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchStatuses(); }}
        />
      )}
    </div>
  );
}
