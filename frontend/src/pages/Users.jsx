import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const PERM_GROUPS = [
  { key: 'jobs',       label: 'Jobs',              actions: ['create','read','update','delete'] },
  { key: 'candidates', label: 'Candidates',         actions: ['create','read','update','delete'] },
  { key: 'statuses',   label: 'Statuses',           actions: ['create','read','update','delete'] },
  { key: 'templates',  label: 'Header Templates',   actions: ['create','read','update','delete'] },
];

const DEFAULT_PERMS = {
  jobs:       { create: false, read: true,  update: false, delete: false },
  candidates: { create: false, read: true,  update: false, delete: false },
  statuses:   { create: false, read: true,  update: false, delete: false },
  templates:  { create: false, read: true,  update: false, delete: false },
  resumeAccess: false,
  exportAccess: true,
  jobAccess: 'all',
};

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

function UserModal({ user: editUser, allJobs, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        editUser?.name  || '',
    email:       editUser?.email || '',
    password:    '',
    role:        editUser?.role  || 'viewer',
    is_active:   editUser?.is_active ?? 1,
    permissions: editUser?.permissions || DEFAULT_PERMS,
  });
  const [saving, setSaving] = useState(false);

  const togglePerm = (group, action) =>
    setForm(p => ({
      ...p,
      permissions: { ...p.permissions, [group]: { ...p.permissions[group], [action]: !p.permissions[group]?.[action] } }
    }));

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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-black">{editUser ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-black p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input required className={inputCls} value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" required className={inputCls} value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <div>
              <label className={labelCls}>Password {editUser ? '(leave blank to keep)' : '*'}</label>
              <input type="password" required={!editUser} className={inputCls} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select className={inputCls} value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="is_active" checked={!!form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 rounded border-slate-300 accent-black" />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active account</label>
            </div>
          </div>

          {/* CRUD permissions */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5" /> Permissions
            </h3>
            <div className="space-y-2">
              {PERM_GROUPS.map(({ key, label, actions }) => (
                <div key={key} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
                  <div className="flex flex-wrap gap-3">
                    {actions.map(action => (
                      <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox"
                          checked={!!(perms[key] && perms[key][action])}
                          onChange={() => togglePerm(key, action)}
                          className="w-3.5 h-3.5 rounded border-slate-300 accent-black" />
                        <span className="text-xs text-slate-600 capitalize">{action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Access flags */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Access</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!perms.resumeAccess}
                      onChange={() => setForm(p => ({ ...p, permissions: { ...p.permissions, resumeAccess: !p.permissions.resumeAccess } }))}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-black" />
                    <span className="text-xs text-slate-600">Resume Access</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!!perms.exportAccess}
                      onChange={() => setForm(p => ({ ...p, permissions: { ...p.permissions, exportAccess: !p.permissions.exportAccess } }))}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-black" />
                    <span className="text-xs text-slate-600">Export Access</span>
                  </label>
                </div>
              </div>

              {/* Job Access */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Job Access</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="jobAccess" checked={perms.jobAccess === 'all'}
                      onChange={() => setForm(p => ({ ...p, permissions: { ...p.permissions, jobAccess: 'all' } }))}
                      className="accent-black" />
                    <span className="text-xs text-slate-600">All Jobs</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="jobAccess" checked={Array.isArray(perms.jobAccess)}
                      onChange={() => setForm(p => ({ ...p, permissions: { ...p.permissions, jobAccess: [] } }))}
                      className="accent-black" />
                    <span className="text-xs text-slate-600">Specific Jobs</span>
                  </label>
                  {Array.isArray(perms.jobAccess) && (
                    <div className="flex flex-wrap gap-1.5 pl-5 pt-1">
                      {allJobs.map(j => (
                        <label key={j.id} className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox"
                            checked={perms.jobAccess.includes(j.id)}
                            onChange={() => {
                              const cur = Array.isArray(perms.jobAccess) ? perms.jobAccess : [];
                              const next = cur.includes(j.id) ? cur.filter(x => x !== j.id) : [...cur, j.id];
                              setForm(p => ({ ...p, permissions: { ...p.permissions, jobAccess: next } }));
                            }}
                            className="w-3 h-3 rounded border-slate-300 accent-black" />
                          <span className="text-xs text-slate-600 truncate max-w-[140px]">{j.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : 'Save User'}
            </button>
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
    try { await api.delete(`/users/${id}`); toast.success('Deleted'); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const roleBadge = {
    superadmin: 'bg-black text-white',
    admin: 'bg-slate-700 text-white',
    editor: 'bg-slate-200 text-slate-700',
    viewer: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-black">Users</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage accounts and permissions</p>
        </div>
        <button onClick={() => setModal(null)}
          className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          <PlusIcon className="w-4 h-4" /> New User
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${u.is_active ? 'bg-black text-white' : 'bg-slate-100 text-slate-400'}`}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-black truncate">{u.name}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${roleBadge[u.role] || roleBadge.viewer}`}>{u.role}</span>
                  {!u.is_active && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">Inactive</span>}
                  {u.id === currentUser.id && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">You</span>}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => setModal(u)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-black hover:bg-slate-100 transition-colors">
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
                {u.id !== currentUser.id && (
                  <button onClick={() => handleDelete(u.id, u.name)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
