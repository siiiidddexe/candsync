import { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { KeyIcon, SparklesIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
];

const OR_MODELS = [
  'google/gemini-2.5-flash:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwen2.5-vl-72b-instruct:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
];

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-black transition-colors';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({
    gemini_api_key: '',
    openrouter_api_key: '',
    openrouter_model: OR_MODELS[0],
    gemini_model: GEMINI_MODELS[0],
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

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-black">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Configure AI extraction and system preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-black flex items-center gap-2">
            <SparklesIcon className="w-4 h-4" /> AI Configuration
          </h2>

          {/* Provider toggle */}
          <div>
            <label className={labelCls}>Primary AI Provider</label>
            <div className="flex gap-3">
              {[
                { val: 'gemini', name: 'Google Gemini', sub: 'Flash / Pro models' },
                { val: 'openrouter', name: 'OpenRouter', sub: 'Free vision models' },
              ].map(p => (
                <label key={p.val}
                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    form.ai_provider === p.val ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <input type="radio" name="ai_provider" value={p.val}
                    checked={form.ai_provider === p.val}
                    onChange={e => setForm(prev => ({ ...prev, ai_provider: e.target.value }))}
                    className="accent-black" />
                  <div>
                    <p className="text-sm font-medium text-black">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">The other provider is used as fallback automatically.</p>
          </div>

          {/* Gemini Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>Gemini API Key</label>
              {settings.gemini_key_set
                ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircleIcon className="w-3.5 h-3.5" /> Configured</span>
                : <span className="flex items-center gap-1 text-xs text-slate-400"><XCircleIcon className="w-3.5 h-3.5" /> Not set</span>}
            </div>
            {!showGeminiKey ? (
              <button type="button" onClick={() => setShowGeminiKey(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-black hover:text-black transition-colors">
                <KeyIcon className="w-4 h-4" /> {settings.gemini_key_set ? 'Update Key' : 'Add Key'}
              </button>
            ) : (
              <input type="password" className={inputCls} autoFocus
                value={form.gemini_api_key}
                onChange={e => setForm(p => ({ ...p, gemini_api_key: e.target.value }))}
                placeholder="AIza…" />
            )}
          </div>

          {/* Gemini Model */}
          <div>
            <label className={labelCls}>Gemini Model</label>
            <select className={inputCls}
              value={form.gemini_model}
              onChange={e => setForm(p => ({ ...p, gemini_model: e.target.value }))}>
              {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* OpenRouter Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>OpenRouter API Key</label>
              {settings.openrouter_key_set
                ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircleIcon className="w-3.5 h-3.5" /> Configured</span>
                : <span className="flex items-center gap-1 text-xs text-slate-400"><XCircleIcon className="w-3.5 h-3.5" /> Not set</span>}
            </div>
            {!showORKey ? (
              <button type="button" onClick={() => setShowORKey(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-black hover:text-black transition-colors">
                <KeyIcon className="w-4 h-4" /> {settings.openrouter_key_set ? 'Update Key' : 'Add Key'}
              </button>
            ) : (
              <input type="password" className={inputCls} autoFocus
                value={form.openrouter_api_key}
                onChange={e => setForm(p => ({ ...p, openrouter_api_key: e.target.value }))}
                placeholder="sk-or-…" />
            )}
          </div>

          {/* OpenRouter Model */}
          <div>
            <label className={labelCls}>OpenRouter Vision Model</label>
            <select className={inputCls}
              value={form.openrouter_model}
              onChange={e => setForm(p => ({ ...p, openrouter_model: e.target.value }))}>
              {OR_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Models ending in :free have no usage cost on OpenRouter.</p>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-700">Supported resume formats</p>
        <p>PDF, JPEG, PNG, GIF, WEBP — up to 10 MB</p>
        <p className="font-medium text-slate-700 mt-2">Get API keys</p>
        <p>• Gemini: <span className="font-mono">aistudio.google.com</span> → Get API Key</p>
        <p>• OpenRouter: <span className="font-mono">openrouter.ai</span> → Keys → Create Key</p>
      </div>
    </div>
  );
}
