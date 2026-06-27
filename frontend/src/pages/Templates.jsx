import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, TableCellsIcon, LockClosedIcon } from '@heroicons/react/24/outline';

// The 16 standard extractable column labels (for the hint chips)
const STANDARD_LABELS = [
  'Date','Sub source','Candidate Name','Skill','Mobile No','Email Id',
  'Date of Birth','Qualification','Year of Passing','Total Exp','Rel Exp',
  'Current Organization','Current Location','Preferred Location',
  'Rate per Month','Notice Period',
];

function TemplateModal({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || '');
  const [csv, setCsv] = useState(template ? template.columns.map(c => c.label).join(', ') : '');
  const [saving, setSaving] = useState(false);

  const addChip = (label) => {
    const current = csv.split(',').map(s => s.trim()).filter(Boolean);
    if (!current.includes(label)) setCsv([...current, label].join(', '));
  };

  const preview = csv.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preview.length) { toast.error('Add at least one column'); return; }
    setSaving(true);
    try {
      if (template) {
        await api.put(`/templates/${template.id}`, { name, columns_csv: csv });
        toast.success('Template updated');
      } else {
        await api.post('/templates', { name, columns_csv: csv });
        toast.success('Template created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-black">{template ? 'Edit Template' : 'New Header Template'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-black p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Template Name *</label>
            <input
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. IT Staffing, Finance Roles"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Columns — comma-separated *
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-none font-mono"
              value={csv}
              onChange={e => setCsv(e.target.value)}
              placeholder="Candidate Name, Skill, Mobile No, Email Id, Notice Period"
            />
            <p className="text-xs text-slate-400 mt-1">
              Type any column name. Gemini will extract these exact fields from resumes. Custom columns not in the standard list are stored dynamically.
            </p>
          </div>

          {/* Standard field chips */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Quick add standard fields:</p>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_LABELS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => addChip(l)}
                  className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                    preview.includes(l)
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-black hover:text-black'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Column order preview ({preview.length} columns):</p>
              <div className="flex flex-wrap gap-1">
                {preview.map((l, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                    {i + 1}. {l}
                  </span>
                ))}
                <span className="px-2 py-0.5 bg-black/10 text-slate-500 text-xs rounded italic">
                  + Candidate ID · Resume link
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors">
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Templates() {
  const { can } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(undefined);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Deleted');
      fetchTemplates();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-black">Header Templates</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Define column sets for different companies. Assign to a JD at creation — locked after.
          </p>
        </div>
        {can('templates', 'create') && (
          <button onClick={() => setModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            <PlusIcon className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <TableCellsIcon className="w-10 h-10 mb-3 opacity-25" />
          <p className="text-sm font-medium">No templates yet</p>
          <p className="text-xs mt-1">Create your first header template above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-black text-sm">{t.name}</h3>
                    <span className="text-xs text-slate-400">{t.columns.length} col{t.columns.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.columns.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        {c.label}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 bg-black/5 text-slate-400 text-xs rounded italic">+ Candidate ID · Resume link</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {can('templates', 'update') && (
                    <button onClick={() => setModal(t)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-black hover:bg-slate-100 transition-colors"
                      title="Edit (only if no jobs use this template)">
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  )}
                  {can('templates', 'delete') && (
                    <button onClick={() => handleDelete(t.id, t.name)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete (only if no jobs use this template)">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-700 flex items-center gap-1.5"><LockClosedIcon className="w-3.5 h-3.5" /> How templates work</p>
        <p>• Pick a template when creating a Job. It defines which columns appear in the table and what AI extracts from resumes.</p>
        <p>• Once a template is assigned to a job it is <strong>locked</strong> — you can't change it or delete it. Delete the job first.</p>
        <p>• You can create custom column names like "Annual CTC" or "LinkedIn URL" — Gemini will try to extract those too.</p>
      </div>

      {modal !== undefined && (
        <TemplateModal
          template={modal}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); fetchTemplates(); }}
        />
      )}
    </div>
  );
}
