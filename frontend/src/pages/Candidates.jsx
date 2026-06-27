import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, ArrowLeftIcon,
  ArrowDownTrayIcon, SparklesIcon, DocumentIcon,
  XMarkIcon, MagnifyingGlassIcon, FunnelIcon
} from '@heroicons/react/24/outline';

const FIELDS = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'sub_source', label: 'Sub Source', type: 'text' },
  { key: 'name', label: 'Candidate Name', type: 'text', required: true },
  { key: 'candidate_id', label: 'Candidate ID', type: 'text', readonly: true },
  { key: 'skill', label: 'Skill', type: 'text' },
  { key: 'mobile', label: 'Mobile No', type: 'text' },
  { key: 'email', label: 'Email Id', type: 'email' },
  { key: 'dob', label: 'Date of Birth', type: 'date' },
  { key: 'qualification', label: 'Qualification', type: 'text' },
  { key: 'year_of_passing', label: 'Year of Passing', type: 'text' },
  { key: 'total_exp', label: 'Total Exp', type: 'text' },
  { key: 'rel_exp', label: 'Rel Exp', type: 'text' },
  { key: 'current_org', label: 'Current Organization', type: 'text' },
  { key: 'current_location', label: 'Current Location', type: 'text' },
  { key: 'preferred_location', label: 'Preferred Location', type: 'text' },
  { key: 'rate_per_month', label: 'Rate per Month', type: 'text' },
  { key: 'notice_period', label: 'Notice Period', type: 'text' },
];

const TABLE_COLS = ['date','sub_source','name','candidate_id','skill','mobile','email',
  'dob','qualification','year_of_passing','total_exp','rel_exp','current_org',
  'current_location','preferred_location','rate_per_month','notice_period'];

function CandidateModal({ candidate, jobId, statuses, onClose, onSaved }) {
  const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    sub_source: '', name: '', skill: '', mobile: '', email: '',
    dob: '', qualification: '', year_of_passing: '', total_exp: '',
    rel_exp: '', current_org: '', current_location: '', preferred_location: '',
    rate_per_month: '', notice_period: '', status_id: '',
    resume_path: '', resume_original_name: ''
  };

  const [form, setForm] = useState(candidate ? { ...candidate, status_id: candidate.status_id || '' } : emptyForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeTab, setResumeTab] = useState('upload'); // upload | existing
  const fileRef = useRef();

  const handleExtract = async () => {
    if (!resumeFile) { toast.error('Select a resume file first'); return; }
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('resume', resumeFile);
      const { data } = await api.post('/candidates/extract', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const ex = data.extracted;
      setForm(prev => ({
        ...prev,
        name: ex.name || prev.name,
        skill: ex.skill || prev.skill,
        mobile: ex.mobile || prev.mobile,
        email: ex.email || prev.email,
        dob: ex.dob || prev.dob,
        qualification: ex.qualification || prev.qualification,
        year_of_passing: ex.year_of_passing || prev.year_of_passing,
        total_exp: ex.total_exp || prev.total_exp,
        rel_exp: ex.rel_exp || prev.rel_exp,
        current_org: ex.current_org || prev.current_org,
        current_location: ex.current_location || prev.current_location,
        preferred_location: ex.preferred_location || prev.preferred_location,
        rate_per_month: ex.rate_per_month || prev.rate_per_month,
        notice_period: ex.notice_period || prev.notice_period,
        resume_path: data.file,
        resume_original_name: data.originalName,
      }));
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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold">{candidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Resume upload + AI extract */}
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
            <p className="text-sm font-medium text-primary-800 mb-3 flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4" /> AI Resume Extraction
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
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
                  className="btn-secondary w-full justify-center text-xs sm:text-sm"
                >
                  <DocumentIcon className="w-4 h-4" />
                  {resumeFile ? resumeFile.name : 'Choose Resume (PDF/Image)'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleExtract}
                disabled={!resumeFile || extracting}
                className="btn-primary justify-center text-xs sm:text-sm"
              >
                <SparklesIcon className="w-4 h-4" />
                {extracting ? 'Extracting...' : 'Auto-Fill with AI'}
              </button>
            </div>
            {form.resume_original_name && (
              <p className="text-xs text-primary-600 mt-2 flex items-center gap-1">
                <DocumentIcon className="w-3.5 h-3.5" /> {form.resume_original_name} saved
              </p>
            )}
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.key} className={f.key === 'name' ? 'sm:col-span-2' : ''}>
                <label className="label">{f.label}{f.required && ' *'}</label>
                {f.key === 'candidate_id' ? (
                  <input className="input bg-slate-50 text-slate-500" value={form.candidate_id || '(auto-generated)'} readOnly />
                ) : f.key === 'status_id' ? null : (
                  <input
                    type={f.type}
                    className="input"
                    required={f.required}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            {/* Status */}
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status_id || ''} onChange={e => setForm(p => ({ ...p, status_id: e.target.value }))}>
                <option value="">— Select Status —</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
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
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const isSuperAdmin = user?.role === 'superadmin';
  const hasResumeAccess = isSuperAdmin || user?.permissions?.resumeAccess;

  const fetchAll = async () => {
    try {
      const [jobRes, candidatesRes, statusesRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/candidates/job/${jobId}`),
        api.get('/statuses'),
      ]);
      setJob(jobRes.data);
      setCandidates(candidatesRes.data);
      setStatuses(statusesRes.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [jobId]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete candidate "${name}"?`)) return;
    try {
      await api.delete(`/candidates/${id}`);
      toast.success('Candidate deleted');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleExport = async (withResume) => {
    try {
      const url = `/api/candidates/export/${jobId}?withResume=${withResume ? 1 : 0}`;
      const token = localStorage.getItem('token');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast.error('Export not permitted'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `candidates_${withResume ? 'with_resume' : 'no_resume'}.xlsx`;
      a.click();
    } catch {
      toast.error('Export failed');
    }
  };

  const statusMap = Object.fromEntries(statuses.map(s => [s.id, s]));

  const filtered = candidates.filter(c => {
    const matchSearch = !search || TABLE_COLS.some(k => (c[k] || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || String(c.status_id) === filterStatus;
    return matchSearch && matchStatus;
  });

  const colLabel = (key) => FIELDS.find(f => f.key === key)?.label || key;

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400">Loading...</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="btn-ghost btn-sm p-1.5">
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{job?.title}</h1>
            <p className="text-xs text-slate-500">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {(isSuperAdmin || user?.permissions?.exports?.withoutResume) && (
              <button onClick={() => handleExport(false)} className="btn-secondary btn-sm">
                <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export
              </button>
            )}
            {(isSuperAdmin || user?.permissions?.exports?.withResume) && (
              <button onClick={() => handleExport(true)} className="btn-secondary btn-sm">
                <ArrowDownTrayIcon className="w-3.5 h-3.5" /> + Resume
              </button>
            )}
            {can('candidates', 'create') && (
              <button onClick={() => setModal(null)} className="btn-primary btn-sm">
                <PlusIcon className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="input pl-8 text-xs py-1.5" placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-xs py-1.5 w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <p className="font-medium">No candidates found</p>
            {can('candidates', 'create') && <p className="text-sm mt-1">Add your first candidate above</p>}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {TABLE_COLS.map(k => (
                  <th key={k} className="table-th border-b border-slate-200">{colLabel(k)}</th>
                ))}
                <th className="table-th border-b border-slate-200">Status</th>
                {hasResumeAccess && <th className="table-th border-b border-slate-200">Resume</th>}
                <th className="table-th border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  {TABLE_COLS.map(k => (
                    <td key={k} className="table-td max-w-[160px] truncate" title={c[k] || ''}>
                      {c[k] || <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="table-td">
                    {c.status_id && statusMap[c.status_id] ? (
                      <span className="badge" style={{ background: statusMap[c.status_id].color + '22', color: statusMap[c.status_id].color }}>
                        {statusMap[c.status_id].name}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  {hasResumeAccess && (
                    <td className="table-td">
                      {c.resume_path ? (
                        <a
                          href={`/api/candidates/resume/${c.resume_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:underline text-xs flex items-center gap-1"
                          onClick={(e) => {
                            e.preventDefault();
                            const token = localStorage.getItem('token');
                            fetch(`/api/candidates/resume/${c.resume_path}`, { headers: { Authorization: `Bearer ${token}` } })
                              .then(r => r.blob()).then(blob => {
                                window.open(URL.createObjectURL(blob));
                              });
                          }}
                        >
                          <DocumentIcon className="w-3.5 h-3.5" />
                          View
                        </a>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      {can('candidates', 'update') && (
                        <button onClick={() => setModal(c)} className="btn-ghost btn-sm p-1.5">
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {can('candidates', 'delete') && (
                        <button onClick={() => handleDelete(c.id, c.name)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
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
