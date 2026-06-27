import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, UsersIcon,
  MagnifyingGlassIcon, BriefcaseIcon, MapPinIcon, BuildingOfficeIcon
} from '@heroicons/react/24/outline';

function JobModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: job?.title || '', client: job?.client || '', location: job?.location || '',
    skills: job?.skills || '', description: job?.description || '', status: job?.status || 'active'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (job) {
        await api.put(`/jobs/${job.id}`, form);
        toast.success('Job updated');
      } else {
        await api.post('/jobs', form);
        toast.success('Job created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{job ? 'Edit Job' : 'New Job'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Job Title *</label>
              <input className="input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior React Developer" />
            </div>
            <div>
              <label className="label">Client</label>
              <input className="input" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} placeholder="Client name" />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Remote..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Required Skills</label>
              <input className="input" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, TypeScript..." />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input h-24 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Job description..." />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Jobs() {
  const { can, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalJob, setModalJob] = useState(undefined); // undefined=closed, null=new, obj=edit

  const fetchJobs = async () => {
    try {
      const { data } = await api.get('/jobs');
      setJobs(data);
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}" and all its candidates?`)) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Job deleted');
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error deleting job');
    }
  };

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    (j.client || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = { active: 'bg-emerald-100 text-emerald-700', on_hold: 'bg-amber-100 text-amber-700', closed: 'bg-slate-100 text-slate-600' };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''} total</p>
        </div>
        {can('jobs', 'create') && (
          <button className="btn-primary" onClick={() => setModalJob(null)}>
            <PlusIcon className="w-4 h-4" /> New Job
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-9" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <BriefcaseIcon className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">No jobs found</p>
          <p className="text-sm mt-1">{can('jobs', 'create') ? 'Create your first job to get started' : 'No jobs available'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => (
            <div key={job.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-base leading-tight truncate">{job.title}</h3>
                  {job.client && (
                    <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
                      <BuildingOfficeIcon className="w-3.5 h-3.5" />{job.client}
                    </div>
                  )}
                </div>
                <span className={`badge flex-shrink-0 capitalize ${statusColors[job.status] || statusColors.closed}`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              {job.location && (
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <MapPinIcon className="w-3.5 h-3.5" />{job.location}
                </div>
              )}

              {job.skills && (
                <p className="text-xs text-slate-500 line-clamp-2">{job.skills}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => navigate(`/jobs/${job.id}/candidates`)}
                  className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700"
                >
                  <UsersIcon className="w-4 h-4" />
                  {job.candidate_count || 0} Candidate{job.candidate_count !== 1 ? 's' : ''}
                </button>
                <div className="flex items-center gap-1">
                  {can('jobs', 'update') && (
                    <button onClick={() => setModalJob(job)} className="btn-ghost btn-sm">
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  )}
                  {can('jobs', 'delete') && (
                    <button onClick={() => handleDelete(job.id, job.title)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalJob !== undefined && (
        <JobModal
          job={modalJob}
          onClose={() => setModalJob(undefined)}
          onSaved={() => { setModalJob(undefined); fetchJobs(); }}
        />
      )}
    </div>
  );
}
