import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon, PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon,
  SparklesIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  MagnifyingGlassIcon, UserCircleIcon, PaperClipIcon
} from '@heroicons/react/24/outline';

const STANDARD_KEYS = new Set([
  'date','sub_source','name','skill','mobile','email',
  'dob','qualification','year_passing','total_exp','rel_exp',
  'current_org','current_location','preferred_location','rate','notice_period'
]);

const DEFAULT_COLUMNS = [
  { label: 'Date',                 key: 'date' },
  { label: 'Sub source',           key: 'sub_source' },
  { label: 'Candidate Name',       key: 'name' },
  { label: 'Skill',                key: 'skill' },
  { label: 'Mobile No',            key: 'mobile' },
  { label: 'Email Id',             key: 'email' },
  { label: 'Date of Birth',        key: 'dob' },
  { label: 'Qualification',        key: 'qualification' },
  { label: 'Year of Passing',      key: 'year_passing' },
  { label: 'Total Exp',            key: 'total_exp' },
  { label: 'Rel Exp',              key: 'rel_exp' },
  { label: 'Current Organization', key: 'current_org' },
  { label: 'Current Location',     key: 'current_location' },
  { label: 'Preferred Location',   key: 'preferred_location' },
  { label: 'Rate per Month',       key: 'rate' },
  { label: 'Notice Period',        key: 'notice_period' },
];

function getCandidateValue(candidate, key) {
  if (STANDARD_KEYS.has(key)) return candidate[key] ?? '';
  const cf = candidate.custom_fields;
  if (cf && typeof cf === 'object') return cf[key] ?? '';
  return '';
}

function parseColumns(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length ? raw : null;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return p.length ? p : null; } catch { return null; }
  }
  return null;
}

// --- Candidate Add/Edit modal ---
function CandidateModal({ candidate, job, onClose, onSaved }) {
  const columns = job.template_columns || DEFAULT_COLUMNS;
  const isEdit = !!candidate;
  const [form, setForm] = useState(() => {
    const init = { status_id: candidate?.status_id || '' };
    columns.forEach(col => { init[col.key] = getCandidateValue(candidate || {}, col.key); });
    return init;
  });
  const [file, setFile] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => { api.get('/statuses').then(r => setStatuses(r.data)).catch(() => {}); }, []);

  const handleExtract = async () => {
    if (!file) { toast.error('Attach a resume first'); return; }
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      fd.append('columns', JSON.stringify(columns));
      const { data } = await api.post('/candidates/extract', fd);
      const ex = { ...data.standard, ...data.custom };
      setForm(prev => {
        const next = { ...prev };
        columns.forEach(col => {
          const val = ex[col.key];
          if (val) next[col.key] = String(val);
        });
        return next;
      });
      toast.success(`Extracted via ${data.provider}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (file) fd.append('resume', file);
      fd.append('job_id', job.id);
      fd.append('status_id', form.status_id || '');
      const customFields = {};
      columns.forEach(col => {
        if (STANDARD_KEYS.has(col.key)) {
          fd.append(col.key, form[col.key] || '');
        } else {
          customFields[col.key] = form[col.key] || '';
        }
      });
      fd.append('custom_fields', JSON.stringify(customFields));
      if (isEdit) {
        await api.put(`/candidates/${candidate.id}`, fd);
        toast.success('Updated');
      } else {
        await api.post('/candidates', fd);
        toast.success('Added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-black">{isEdit ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-black p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resume + AI */}
          <div className="border border-slate-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-slate-500">Resume (PDF / Image)</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-black hover:text-black transition-colors">
                <PaperClipIcon className="w-4 h-4" />
                {file ? file.name : (candidate?.resume_path ? 'Replace resume' : 'Choose file')}
              </button>
              <button type="button" onClick={handleExtract} disabled={!file || extracting}
                className="flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap">
                <SparklesIcon className="w-4 h-4" />
                {extracting ? 'Reading…' : 'AI Fill'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select className={inputCls + ' bg-white'}
              value={form.status_id} onChange={e => setForm(p => ({ ...p, status_id: e.target.value }))}>
              <option value="">— No status —</option>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Template-driven fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {columns.map(col => (
              <div key={col.key} className={['name','skill','email'].includes(col.key) ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{col.label}</label>
                <input className={inputCls}
                  value={form[col.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [col.key]: e.target.value }))}
                  placeholder={col.label} />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main page ---
export default function Candidates() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);

  const hasResumeAccess = user?.permissions?.resumeAccess === true || user?.role === 'superadmin';
  const canExport = user?.permissions?.exportAccess === true || user?.role === 'superadmin';

  const fetchAll = async () => {
    try {
      const [jobRes, candRes, statRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/candidates/job/${jobId}`),
        api.get('/statuses'),
      ]);
      const j = { ...jobRes.data, template_columns: parseColumns(jobRes.data.template_columns) || DEFAULT_COLUMNS };
      const cands = (candRes.data || []).map(c => ({
        ...c,
        custom_fields: typeof c.custom_fields === 'string'
          ? (() => { try { return JSON.parse(c.custom_fields); } catch { return {}; } })()
          : (c.custom_fields || {})
      }));
      setJob(j);
      setCandidates(cands);
      setStatuses(statRes.data || []);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [jobId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this candidate?')) return;
    try { await api.delete(`/candidates/${id}`); toast.success('Deleted'); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const handleExport = async (withResume) => {
    try {
      const res = await fetch(`/api/candidates/job/${jobId}/export?resume=${withResume ? 1 : 0}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) { const j = await res.json(); toast.error(j.error || 'Export failed'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `candidates_${jobId}${withResume ? '_with_resume' : ''}.xlsx`;
      a.click();
    } catch { toast.error('Export failed'); }
  };

  const getStatusLabel = (id) => statuses.find(s => s.id === Number(id))?.name || '';
  const columns = job?.template_columns || DEFAULT_COLUMNS;

  const filtered = candidates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.mobile || '').toLowerCase().includes(q) ||
      (c.skill || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>;
  if (!job) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Job not found</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-black truncate">{job.title}</h1>
            {job.client && <p className="text-xs text-slate-400">{job.client}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-36">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-black transition-colors"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {canExport && (
            <button onClick={() => handleExport(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-black hover:text-black transition-colors">
              <DocumentArrowDownIcon className="w-3.5 h-3.5" /> Export
            </button>
          )}
          {canExport && hasResumeAccess && (
            <button onClick={() => handleExport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-black hover:text-black transition-colors">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> + Resume
            </button>
          )}
          {can('candidates', 'create') && (
            <button onClick={() => setModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors">
              <PlusIcon className="w-3.5 h-3.5" /> Add
            </button>
          )}
        </div>
      </div>

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <UserCircleIcon className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm font-medium">No candidates yet</p>
            {can('candidates', 'create') && <p className="text-xs mt-1">Click Add to get started</p>}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Candidate ID</th>
                {columns.map(col => (
                  <th key={col.key} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Status</th>
                {hasResumeAccess && (
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Resume</th>
                )}
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">CAND-{String(c.id).padStart(4, '0')}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2.5 text-slate-700 max-w-[180px]">
                      <span className="block truncate" title={String(getCandidateValue(c, col.key))}>
                        {getCandidateValue(c, col.key) || <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {c.status_id
                      ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">{getStatusLabel(c.status_id)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  {hasResumeAccess && (
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {c.resume_path ? (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/candidates/${c.id}/resume`, {
                              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            });
                            if (res.ok) { const blob = await res.blob(); window.open(URL.createObjectURL(blob)); }
                            else toast.error('Could not open resume');
                          }}
                          className="flex items-center gap-1 text-black underline underline-offset-2 hover:text-slate-600 transition-colors">
                          <PaperClipIcon className="w-3 h-3" /> View
                        </button>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-0.5">
                      {can('candidates', 'update') && (
                        <button onClick={() => setModal(c)}
                          className="p-1 rounded text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {can('candidates', 'delete') && (
                        <button onClick={() => handleDelete(c.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 border-t border-slate-100 bg-white text-xs text-slate-400 flex items-center gap-3">
        <span>{filtered.length} of {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</span>
        {job.template_name && <span className="text-slate-300">· {job.template_name}</span>}
      </div>

      {modal !== undefined && (
        <CandidateModal
          candidate={modal}
          job={job}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchAll(); }}
        />
      )}
    </div>
  );
}
