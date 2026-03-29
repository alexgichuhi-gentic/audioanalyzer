'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Loader2 } from 'lucide-react';
import type { ProfileData } from '@/types';

export default function ProfileEditor() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', promptTemplate: '', isDefault: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const res = await fetch('/api/profiles');
    const data = await res.json();
    setProfiles(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const selectProfile = (p: ProfileData) => {
    setSelectedId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      promptTemplate: p.promptTemplate,
      isDefault: p.isDefault,
    });
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm({ name: '', description: '', promptTemplate: '', isDefault: false });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedId) {
        await fetch(`/api/profiles/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        setSelectedId(created.id);
      }
      await fetchProfiles();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm('Delete this profile?')) return;
    await fetch(`/api/profiles/${selectedId}`, { method: 'DELETE' });
    handleNew();
    await fetchProfiles();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const selectedProfile = profiles.find((p) => p.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Profiles</h3>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProfile(p)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                selectedId === p.id ? 'bg-indigo-50' : ''
              }`}
            >
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {p.name}
                {p.isDefault && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                    DEFAULT
                  </span>
                )}
                {p.isSystem && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    SYSTEM
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Profile name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Template
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Available variables:{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{transcript}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{language}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{duration}}'}</code>{' '}
            <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code>
          </p>
          <textarea
            value={form.promptTemplate}
            onChange={(e) => setForm({ ...form, promptTemplate: e.target.value })}
            rows={16}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
            placeholder="Enter your prompt template..."
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-700">
            Set as default profile
          </label>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name || !form.promptTemplate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {selectedId ? 'Update' : 'Create'}
          </button>
          {selectedId && !(selectedProfile?.isSystem) && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
