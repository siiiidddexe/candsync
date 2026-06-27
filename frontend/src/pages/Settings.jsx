import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Cog6ToothIcon, KeyIcon, SparklesIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({
    gemini_api_key: '',
    openrouter_api_key: '',
    openrouter_model: 'google/gemini-2.0-flash-exp:free',
    gemini_model: 'gemini-2.0-flash',
    ai_provider: 'gemini',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showORKey, setShowORKey] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setSettings(data);
      setForm(p => ({
        ...p,
        openrouter_model: data.openrouter_model || p.openrouter_model,
        gemini_model: data.gemini_model || p.gemini_model,
        ai_provider: data.ai_provider || p.ai_provider,
      }));
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (!showGeminiKey || !payload.gemini_api_key) delete payload.gemini_api_key;
    if (!showORKey || !payload.openrouter_api_key) delete payload.openrouter_api_key;
    try {
      await api.put('/settings', payload);
      toast.success('Settings saved');
      // Refresh
      const { data } = await api.get('/settings');
      setSettings(data);
      setShowGeminiKey(false);
      setShowORKey(false);
      setForm(p => ({ ...p, gemini_api_key: '', openrouter_api_key: '' }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const FREE_MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemma-3-27b-it:free',
    'qwen/qwen2.5-vl-72b-instruct:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'microsoft/phi-3.5-mini-128k-instruct:free',
  ];

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400">Loading...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure AI extraction and system preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* AI Provider */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary-500" /> AI Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">Primary AI Provider</label>
              <div className="flex gap-3">
                {['gemini','openrouter'].map(p => (
                  <label key={p} className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.ai_provider === p ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="ai_provider" value={p} checked={form.ai_provider === p} onChange={e => setForm(prev => ({ ...prev, ai_provider: e.target.value }))} className="text-primary-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 capitalize">{p === 'openrouter' ? 'OpenRouter' : 'Google Gemini'}</p>
                      <p className="text-xs text-slate-500">{p === 'gemini' ? 'Gemini 1.5 Flash' : 'Vision models (free tier)'}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">If primary fails, the other is used as fallback automatically.</p>
            </div>

            {/* Gemini Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Gemini API Key</label>
                <div className="flex items-center gap-1">
                  {settings.gemini_key_set ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircleIcon className="w-3.5 h-3.5" /> Configured</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><XCircleIcon className="w-3.5 h-3.5" /> Not set</span>
                  )}
                </div>
              </div>
              {!showGeminiKey ? (
                <button type="button" onClick={() => setShowGeminiKey(true)} className="btn-secondary w-full justify-center text-sm">
                  <KeyIcon className="w-4 h-4" /> {settings.gemini_key_set ? 'Update Key' : 'Add Key'}
                </button>
              ) : (
                <input
                  type="password"
                  className="input"
                  value={form.gemini_api_key}
                  onChange={e => setForm(p => ({ ...p, gemini_api_key: e.target.value }))}
                  placeholder="AIza..."
                  autoFocus
                />
              )}
            </div>

            {/* OpenRouter Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">OpenRouter API Key</label>
                <div className="flex items-center gap-1">
                  {settings.openrouter_key_set ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircleIcon className="w-3.5 h-3.5" /> Configured</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><XCircleIcon className="w-3.5 h-3.5" /> Not set</span>
                  )}
                </div>
              </div>
              {!showORKey ? (
                <button type="button" onClick={() => setShowORKey(true)} className="btn-secondary w-full justify-center text-sm">
                  <KeyIcon className="w-4 h-4" /> {settings.openrouter_key_set ? 'Update Key' : 'Add Key'}
                </button>
              ) : (
                <input
                  type="password"
                  className="input"
                  value={form.openrouter_api_key}
                  onChange={e => setForm(p => ({ ...p, openrouter_api_key: e.target.value }))}
                  placeholder="sk-or-..."
                  autoFocus
                />
              )}
            </div>

            {/* Gemini Model */}
            <div>
              <label className="label">Gemini Model</label>
              <select className="input" value={form.gemini_model} onChange={e => setForm(p => ({ ...p, gemini_model: e.target.value }))}>
                {['gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-flash','gemini-1.5-pro','gemini-2.5-flash-preview-05-20'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* OpenRouter Model */}
            <div>
              <label className="label">OpenRouter Vision Model</label>
              <select className="input" value={form.openrouter_model} onChange={e => setForm(p => ({ ...p, openrouter_model: e.target.value }))}>
                {FREE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">Models marked :free have no usage cost on OpenRouter.</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 space-y-1">
        <p className="font-medium">Supported resume formats for AI extraction:</p>
        <p>PDF, JPEG, PNG, GIF, WEBP (up to 10MB)</p>
        <p className="mt-1 font-medium">Get API Keys:</p>
        <p>• Gemini: <span className="font-mono">aistudio.google.com</span> → Get API Key</p>
        <p>• OpenRouter: <span className="font-mono">openrouter.ai</span> → Keys → Create Key</p>
      </div>
    </div>
  );
}
