import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, UsersIcon,
  MagnifyingGlassIcon, BriefcaseIcon, MapPinIcon, BuildingOfficeIcon,
  SparklesIcon, XMarkIcon, TableCellsIcon, LockClosedIcon
} from '@heroicons/react/24/outline';

function JobModal({ job, templates, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: job?.title || '',
    client: job?.client || '',
    location: job?.location || '',
    skills: job?.skills || '',
    description: job?.description || '',
    status: job?.status || 'active',
    template_id: job?.template_id || '',
  });
  const [jdText, setJdText] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!job;

  const handleExtract = async () => {
    if (!jdText.trim()) { toast.error('Paste some JD text first'); return; }
    setExtracting(true);
    try {
      const { data } = await api.post('/jobs/extract-text', { text: jdText });
      const ex = data.extracted;
      setForm(prev => ({
        ...prev,
        title:       ex.title       || prev.title,
        client:      ex.client      || prev.client,
        location:    ex.location    || prev.location,
        skills:      ex.skills      || prev.skills,
        description: ex.description || prev.description,
      }));
      toast.success(`Filled via ${data.provider}`);
      setShowAI(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI fill failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, template_id: form.template_id || null };
      if (isEdit) {
        await api.put(`/jobs/${job.id}`, payload);
        toast.success('Job updated');
      } else {
        await api.post('/jobs', payload);
        toast.success('Job created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4 border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-black">{isEdit ? 'Edit Job' : 'New Job'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-black p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* AI fill from text prompt */}
          {!isEdit && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAI(!showAI)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
              >
                <span className="flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-black" /> AI Fill from JD text</span>
                <span className="text-xs text-slate-400">{showAI ? 'hide' : 'expand'}</span>
              </button>
              {showAI && (
                <div className="p-3 space-y-2 bg-white">
                  <textarea
                    rows={5}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-none font-mono"
                    placeholder="Paste the full job description here and click AI Fill to auto-populate the fields below…"
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={!jdText.trim() || extracting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    {extracting ? 'Extracting…' : 'AI Fill Fields'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Job Title *</label>
              <input required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior React Developer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Client</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Client name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Remote…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Required Skills</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, TypeScript…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <textarea rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-none"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Job description…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white"
                value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Template selector — only on create */}
            <div>
              {isEdit ? (
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
                    <LockClosedIcon className="w-3 h-3" /> Header Template
                  </label>
                  <div className="px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-500">
                    {job.template_name || 'None (all fields)'} — locked
                  </div>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
                    <TableCellsIcon className="w-3 h-3" /> Header Template
                  </label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white"
                    value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}>
                    <option value="">Standard (all 16 fields)</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.columns.length} cols)</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Cannot be changed after creation.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Jobs() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);

  const fetchAll = async () => {
    try {
      const [jobsRes, tmplRes] = await Promise.all([api.get('/jobs'), api.get('/templates')]);
      setJobs(jobsRes.data);
      setTemplates(tmplRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}" and all its candidates?`)) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Deleted');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const filtered = jobs.filter(j =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    (j.client || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBg = { active: 'bg-black text-white', on_hold: 'bg-amber-100 text-amber-700', closed: 'bg-slate-100 text-slate-500' };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-black">Jobs</h1>
          <p className="text-xs text-slate-400 mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        {can('jobs', 'create') && (
          <button onClick={() => setModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            <PlusIcon className="w-4 h-4" /> New Job
          </button>
        )}
      </div>

      <div className="relative mb-5">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-black transition-colors"
          placeholder="Search jobs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <BriefcaseIcon className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-sm font-medium">No jobs found</p>
          {can('jobs', 'create') && <p className="text-xs mt-1">Click New Job to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => (
            <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-black text-sm leading-snug truncate">{job.title}</h3>
                  {job.client && (
                    <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
                      <BuildingOfficeIcon className="w-3 h-3" />{job.client}
                    </div>
                  )}
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 capitalize ${statusBg[job.status] || statusBg.closed}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              {job.location && (
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <MapPinIcon className="w-3 h-3" />{job.location}
                </div>
              )}

              {job.template_name && (
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <TableCellsIcon className="w-3 h-3" />{job.template_name}
                </div>
              )}

              {job.skills && <p className="text-xs text-slate-400 line-clamp-2">{job.skills}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => navigate(`/jobs/${job.id}/candidates`)}
                  className="flex items-center gap-1.5 text-xs text-black font-medium hover:text-slate-600 transition-colors"
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  {job.candidate_count || 0} Candidate{job.candidate_count !== 1 ? 's' : ''}
                </button>
                <div className="flex items-center gap-0.5">
                  {can('jobs', 'update') && (
                    <button onClick={() => setModal(job)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {can('jobs', 'delete') && (
                    <button onClick={() => handleDelete(job.id, job.title)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <JobModal
          job={modal}
          templates={templates}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchAll(); }}
        />
      )}
    </div>
  );
}
