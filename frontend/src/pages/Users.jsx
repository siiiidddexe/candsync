import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, UsersIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const PERM_GROUPS = [
  { key: 'jobs', label: 'Jobs', actions: ['create','read','update','delete'] },
  { key: 'candidates', label: 'Candidates', actions: ['create','read','update','delete'] },
  { key: 'statuses', label: 'Statuses', actions: ['create','read','update','delete'] },
  { key: 'exports', label: 'Exports', actions: ['withResume','withoutResume'] },
];

const DEFAULT_PERMS = {
  jobs: { create: false, read: true, update: false, delete: false },
  candidates: { create: false, read: true, update: false, delete: false },
  exports: { withResume: false, withoutResume: true },
  resumeAccess: false,
  statuses: { create: false, read: true, update: false, delete: false },
  users: { create: false, read: false, update: false, delete: false },
  settings: false,
  jobAccess: 'all'
};

function UserModal({ user: editUser, allJobs, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editUser?.name || '',
    email: editUser?.email || '',
    password: '',
    role: editUser?.role || 'viewer',
    is_active: editUser?.is_active ?? 1,
    permissions: editUser?.permissions || DEFAULT_PERMS,
  });
  const [saving, setSaving] = useState(false);

  const togglePerm = (group, action) => {
    setForm(p => ({
      ...p,
      permissions: {
        ...p.permissions,
        [group]: { ...p.permissions[group], [action]: !p.permissions[group]?.[action] }
      }
    }));
  };

  const setJobAccess = (val) => {
    setForm(p => ({ ...p, permissions: { ...p.permissions, jobAccess: val } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editUser) {
        await api.put(`/users/${editUser.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', payload);
        toast.success('User created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const perms = form.permissions;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-lg">{editUser ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <div>
              <label className="label">Password {editUser ? '(leave blank to keep)' : '*'}</label>
              <input type="password" className="input" required={!editUser} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="is_active" checked={!!form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} className="w-4 h-4 rounded border-slate-300 text-primary-600" />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active account</label>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-primary-500" /> Permissions
            </h3>
            <div className="space-y-3">
              {PERM_GROUPS.map(({ key, label, actions }) => (
                <div key={key} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {actions.map(action => (
                      <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!(perms[key] && perms[key][action])}
                          onChange={() => togglePerm(key, action)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600"
                        />
                        <span className="text-xs text-slate-600 capitalize">{action.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Resume & Settings */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Access</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!perms.resumeAccess} onChange={() => setForm(p => ({ ...p, permissions: { ...p.permissions, resumeAccess: !p.permissions.resumeAccess } }))} className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600" />
                    <span className="text-xs text-slate-600">Resume Access</span>
                  </label>
                </div>
              </div>

              {/* Job Access */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Job Access</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="jobAccess" checked={perms.jobAccess === 'all'} onChange={() => setJobAccess('all')} className="text-primary-600" />
                    <span className="text-xs text-slate-600">All Jobs</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="jobAccess" checked={Array.isArray(perms.jobAccess)} onChange={() => setJobAccess([])} className="text-primary-600" />
                    <span className="text-xs text-slate-600">Specific Jobs</span>
                  </label>
                  {Array.isArray(perms.jobAccess) && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-4">
                      {allJobs.map(j => (
                        <label key={j.id} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms.jobAccess.includes(j.id)}
                            onChange={() => {
                              const current = Array.isArray(perms.jobAccess) ? perms.jobAccess : [];
                              const next = current.includes(j.id) ? current.filter(x => x !== j.id) : [...current, j.id];
                              setJobAccess(next);
                            }}
                            className="w-3 h-3 rounded border-slate-300 text-primary-600"
                          />
                          <span className="text-xs text-slate-600 truncate max-w-[140px]">{j.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 justify-center" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);

  const fetchAll = async () => {
    try {
      const [usersRes, jobsRes] = await Promise.all([api.get('/users'), api.get('/jobs')]);
      setUsers(usersRes.data);
      setAllJobs(jobsRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id, name) => {
    if (id === currentUser.id) { toast.error('Cannot delete yourself'); return; }
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const roleColors = { superadmin: 'bg-primary-100 text-primary-700', admin: 'bg-blue-100 text-blue-700', editor: 'bg-emerald-100 text-emerald-700', viewer: 'bg-slate-100 text-slate-600' };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage accounts and permissions</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(null)}>
          <PlusIcon className="w-4 h-4" /> New User
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${u.is_active ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'}`}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                  <span className={`badge capitalize ${roleColors[u.role] || roleColors.viewer}`}>{u.role}</span>
                  {!u.is_active && <span className="badge bg-red-100 text-red-600">Inactive</span>}
                  {u.id === currentUser.id && <span className="badge bg-slate-100 text-slate-500">You</span>}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setModal(u)} className="btn-ghost btn-sm p-1.5">
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
                {u.id !== currentUser.id && (
                  <button onClick={() => handleDelete(u.id, u.name)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== undefined && (
        <UserModal
          user={modal}
          allJobs={allJobs}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchAll(); }}
        />
      )}
    </div>
  );
}
