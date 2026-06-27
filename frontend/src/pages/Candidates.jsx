import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, ArrowLeftIcon,
  ArrowDownTrayIcon, SparklesIcon, DocumentIcon, XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Exact column spec — header names are 1-to-1 with user requirement
const COLUMNS = [
  { key: 'date',               header: 'Date' },
  { key: 'sub_source',         header: 'Sub source' },
  { key: 'name',               header: 'Candidate Name' },
  { key: 'candidate_id',       header: 'Candidate ID' },
  { key: 'skill',              header: 'Skill' },
  { key: 'mobile',             header: 'Mobile No' },
  { key: 'email',              header: 'Email Id' },
  { key: 'dob',                header: 'Date of Birth' },
  { key: 'qualification',      header: 'Qualification' },
  { key: 'year_of_passing',    header: 'Year of Passing' },
  { key: 'total_exp',          header: 'Total Exp' },
  { key: 'rel_exp',            header: 'Rel Exp' },
  { key: 'current_org',        header: 'Current Organization' },
  { key: 'current_location',   header: 'Current Location' },
  { key: 'preferred_location', header: 'Preferred Location' },
  { key: 'rate_per_month',     header: 'Rate per Month' },
  { key: 'notice_period',      header: 'Notice Period' },
  { key: '_resume',            header: 'Resume link' },
];

// Fields shown in the add/edit modal (includes Status, candidate_id readonly)
const MODAL_FIELDS = [
  { key: 'date',               label: 'Date',                 type: 'date' },
  { key: 'sub_source',         label: 'Sub source',           type: 'text' },
  { key: 'name',               label: 'Candidate Name',       type: 'text',  required: true },
  { key: 'candidate_id',       label: 'Candidate ID',         type: 'text',  readonly: true },
  { key: 'skill',              label: 'Skill',                type: 'text' },
  { key: 'mobile',             label: 'Mobile No',            type: 'text' },
  { key: 'email',              label: 'Email Id',             type: 'email' },
  { key: 'dob',                label: 'Date of Birth',        type: 'date' },
  { key: 'qualification',      label: 'Qualification',        type: 'text' },
  { key: 'year_of_passing',    label: 'Year of Passing',      type: 'text' },
  { key: 'total_exp',          label: 'Total Exp',            type: 'text' },
  { key: 'rel_exp',            label: 'Rel Exp',              type: 'text' },
  { key: 'current_org',        label: 'Current Organization', type: 'text' },
  { key: 'current_location',   label: 'Current Location',     type: 'text' },
  { key: 'preferred_location', label: 'Preferred Location',   type: 'text' },
  { key: 'rate_per_month',     label: 'Rate per Month',       type: 'text' },
  { key: 'notice_period',      label: 'Notice Period',        type: 'text' },
];

function CandidateModal({ candidate, jobId, statuses, onClose, onSaved }) {
  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    sub_source: '', name: '', skill: '', mobile: '', email: '',
    dob: '', qualification: '', year_of_passing: '', total_exp: '',
    rel_exp: '', current_org: '', current_location: '', preferred_location: '',
    rate_per_month: '', notice_period: '', status_id: '',
    resume_path: '', resume_original_name: ''
  };

  const [form, setForm] = useState(
    candidate ? { ...candidate, status_id: candidate.status_id || '' } : emptyForm
  );
  const [resumeFile, setResumeFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handleExtract = async () => {
    if (!resumeFile) { toast.error('Select a resume file first'); return; }
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('resume', resumeFile);
      const { data } = await api.post('/candidates/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ex = data.extracted;
      setForm(prev => ({
        ...prev,
        name:               ex.name               || prev.name,
        skill:              ex.skill              || prev.skill,
        mobile:             ex.mobile             || prev.mobile,
        email:              ex.email              || prev.email,
        dob:                ex.dob                || prev.dob,
        qualification:      ex.qualification      || prev.qualification,
        year_of_passing:    ex.year_of_passing    || prev.year_of_passing,
        total_exp:          ex.total_exp          || prev.total_exp,
        rel_exp:            ex.rel_exp            || prev.rel_exp,
        current_org:        ex.current_org        || prev.current_org,
        current_location:   ex.current_location   || prev.current_location,
        preferred_location: ex.preferred_location || prev.preferred_location,
        rate_per_month:     ex.rate_per_month     || prev.rate_per_month,
        notice_period:      ex.notice_period      || prev.notice_period,
        resume_path:        data.file,
        resume_original_name: data.originalName,
      }));
      toast.success(`Fields filled via ${data.provider}`);
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
      const payload = { ...form, job_id: jobId, status_id: form.status_id || null };
      if (candidate) {
        await api.put(`/candidates/${candidate.id}`, payload);
        toast.success('Candidate updated');
      } else {
        await api.post('/candidates', payload);
        toast.success('Candidate added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-black">{candidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-black p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* AI resume strip */}
          <div className="flex flex-col sm:flex-row gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="file"
              ref={fileRef}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={e => setResumeFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:border-black hover:text-black transition-colors truncate"
            >
              <DocumentIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{resumeFile ? resumeFile.name : 'Choose Resume (PDF / Image)'}</span>
            </button>
            <button
              type="button"
              onClick={handleExtract}
              disabled={!resumeFile || extracting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <SparklesIcon className="w-4 h-4" />
              {extracting ? 'Extracting…' : 'AI Auto-Fill'}
            </button>
            {form.resume_original_name && (
              <span className="self-center text-xs text-slate-400 truncate">
                Saved: {form.resume_original_name}
              </span>
            )}
          </div>

          {/* Form fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODAL_FIELDS.map(f => (
              <div key={f.key} className={f.key === 'name' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {f.label}{f.required && ' *'}
                </label>
                {f.readonly ? (
                  <input
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
                    value={form[f.key] || '(auto-generated)'}
                    readOnly
                  />
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-black transition-colors"
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            {/* Status — in modal only, not in table */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-black transition-colors"
                value={form.status_id || ''}
                onChange={e => setForm(p => ({ ...p, status_id: e.target.value }))}
              >
                <option value="">— None —</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : 'Save Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Candidates() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(undefined);

  const isSuperAdmin = user?.role === 'superadmin';
  const hasResumeAccess = isSuperAdmin || !!user?.permissions?.resumeAccess;

  const fetchAll = async () => {
    try {
      const [jobRes, candRes, statusRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/candidates/job/${jobId}`),
        api.get('/statuses'),
      ]);
      setJob(jobRes.data);
      setCandidates(candRes.data);
      setStatuses(statusRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [jobId]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/candidates/${id}`);
      toast.success('Deleted');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const openResume = (filename) => {
    const token = localStorage.getItem('token');
    fetch(`/api/candidates/resume/${filename}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => window.open(URL.createObjectURL(blob)));
  };

  const handleExport = async (withResume) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/candidates/export/${jobId}?withResume=${withResume ? 1 : 0}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { toast.error('Export not permitted'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `candidates_${withResume ? 'with_resume' : 'no_resume'}.xlsx`;
      a.click();
    } catch { toast.error('Export failed'); }
  };

  const filtered = candidates.filter(c =>
    !search || COLUMNS.some(col => col.key !== '_resume' && (c[col.key] || '').toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-black truncate">{job?.title}</h1>
            {job?.client && <p className="text-xs text-slate-400">{job.client}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {(isSuperAdmin || user?.permissions?.exports?.withoutResume) && (
              <button onClick={() => handleExport(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export
              </button>
            )}
            {(isSuperAdmin || user?.permissions?.exports?.withResume) && (
              <button onClick={() => handleExport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowDownTrayIcon className="w-3.5 h-3.5" /> + Resume
              </button>
            )}
            {can('candidates', 'create') && (
              <button onClick={() => setModal(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black text-white rounded-lg hover:bg-slate-800 transition-colors">
                <PlusIcon className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-black transition-colors"
              placeholder="Search candidates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">{filtered.length} of {candidates.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <p className="text-sm font-medium">No candidates yet</p>
            {can('candidates', 'create') && <p className="text-xs mt-1">Click Add to get started</p>}
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COLUMNS.map(col => (
                  <th key={col.key} className="px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {col.header}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  {COLUMNS.map(col => (
                    <td key={col.key} className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap max-w-[160px]">
                      {col.key === '_resume' ? (
                        hasResumeAccess && c.resume_path ? (
                          <button
                            onClick={() => openResume(c.resume_path)}
                            className="text-black underline underline-offset-2 hover:text-slate-600 transition-colors flex items-center gap-1"
                          >
                            <DocumentIcon className="w-3 h-3" /> View
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )
                      ) : (
                        <span className="block truncate" title={c[col.key] || ''}>
                          {c[col.key] || <span className="text-slate-300">—</span>}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {can('candidates', 'update') && (
                        <button onClick={() => setModal(c)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {can('candidates', 'delete') && (
                        <button onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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

      {modal !== undefined && (
        <CandidateModal
          candidate={modal}
          jobId={jobId}
          statuses={statuses}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchAll(); }}
        />
      )}
    </div>
  );
}
