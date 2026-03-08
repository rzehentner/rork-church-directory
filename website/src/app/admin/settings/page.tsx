'use client';

import { useEffect, useState, useRef } from 'react';
import { createAdminClient } from '@/lib/supabase-admin';

interface ServiceTime {
  day: string;
  time: string;
  label: string;
}

interface ChurchSettingsData {
  id: string;
  name: string;
  pastor: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  email: string;
  website: string;
  service_times: ServiceTime[];
}

const EMPTY_SERVICE_TIME: ServiceTime = { day: '', time: '', label: '' };

export default function AdminSettingsPage() {
  const supabaseRef = useRef(createAdminClient());
  const [settings, setSettings] = useState<ChurchSettingsData | null>(null);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = supabaseRef.current;

      const [{ data: settingsData }, { data: contentData }] = await Promise.all([
        supabase.from('church_settings').select('*').limit(1).maybeSingle(),
        supabase.from('website_content').select('key, value').in('key', ['app_store_url', 'google_play_url']),
      ]);

      if (settingsData) {
        setSettings({
          id: settingsData.id,
          name: settingsData.name || '',
          pastor: settingsData.pastor || '',
          address_street: settingsData.address_street || '',
          address_city: settingsData.address_city || '',
          address_state: settingsData.address_state || '',
          address_zip: settingsData.address_zip || '',
          phone: settingsData.phone || '',
          email: settingsData.email || '',
          website: settingsData.website || '',
          service_times: settingsData.service_times || [],
        });
      }

      if (contentData) {
        for (const row of contentData) {
          if (row.key === 'app_store_url') setAppStoreUrl(row.value);
          if (row.key === 'google_play_url') setGooglePlayUrl(row.value);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  function updateField(field: keyof ChurchSettingsData, value: string) {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  }

  function updateServiceTime(index: number, field: keyof ServiceTime, value: string) {
    if (!settings) return;
    const updated = [...settings.service_times];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, service_times: updated });
  }

  function addServiceTime() {
    if (!settings) return;
    setSettings({ ...settings, service_times: [...settings.service_times, { ...EMPTY_SERVICE_TIME }] });
  }

  function removeServiceTime(index: number) {
    if (!settings) return;
    setSettings({ ...settings, service_times: settings.service_times.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError('');
    setSaved(false);

    const supabase = supabaseRef.current;

    const { error: settingsErr } = await supabase
      .from('church_settings')
      .update({
        name: settings.name.trim() || null,
        pastor: settings.pastor.trim() || null,
        address_street: settings.address_street.trim() || null,
        address_city: settings.address_city.trim() || null,
        address_state: settings.address_state.trim() || null,
        address_zip: settings.address_zip.trim() || null,
        phone: settings.phone.trim() || null,
        email: settings.email.trim() || null,
        website: settings.website.trim() || null,
        service_times: settings.service_times.filter(st => st.day && st.time && st.label),
      })
      .eq('id', settings.id);

    if (settingsErr) {
      setError(settingsErr.message);
      setSaving(false);
      return;
    }

    // Upsert app store links into website_content
    for (const [key, value] of [['app_store_url', appStoreUrl], ['google_play_url', googlePlayUrl]]) {
      const { data: existing } = await supabase
        .from('website_content')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        await supabase.from('website_content').update({ value }).eq('key', key);
      } else if (value.trim()) {
        await supabase.from('website_content').insert({ key, value, content_type: 'text' });
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="text-steel text-sm">Loading...</div>;
  }

  if (!settings) {
    return <div className="text-red-600 text-sm">Church settings not found.</div>;
  }

  const inputClass = 'w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20';
  const labelClass = 'block text-sm font-medium text-navy-dark mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Church Settings</h1>
          <p className="text-sm text-steel mt-1">
            These settings appear across the website — contact page, footer, about page, and more.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-navy text-white font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Church Info */}
      <div className="bg-white rounded-xl border border-cream p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy-dark mb-4">Church Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Church Name</label>
            <input type="text" value={settings.name} onChange={e => updateField('name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Pastor</label>
            <input type="text" value={settings.pastor} onChange={e => updateField('pastor', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" value={settings.phone} onChange={e => updateField('phone', e.target.value)} className={inputClass} placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={settings.email} onChange={e => updateField('email', e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Website</label>
            <input type="text" value={settings.website} onChange={e => updateField('website', e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border border-cream p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy-dark mb-4">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Street</label>
            <input type="text" value={settings.address_street} onChange={e => updateField('address_street', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input type="text" value={settings.address_city} onChange={e => updateField('address_city', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>State</label>
              <input type="text" value={settings.address_state} onChange={e => updateField('address_state', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input type="text" value={settings.address_zip} onChange={e => updateField('address_zip', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Service Times */}
      <div className="bg-white rounded-xl border border-cream p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-dark">Service Times</h2>
          <button
            onClick={addServiceTime}
            className="text-sm text-navy hover:text-navy-light transition-colors font-medium"
          >
            + Add Service
          </button>
        </div>
        {settings.service_times.length === 0 ? (
          <p className="text-steel text-sm">No service times configured.</p>
        ) : (
          <div className="space-y-3">
            {settings.service_times.map((st, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={st.day}
                    onChange={e => updateServiceTime(i, 'day', e.target.value)}
                    className={inputClass}
                    placeholder="Sunday"
                  />
                  <input
                    type="text"
                    value={st.time}
                    onChange={e => updateServiceTime(i, 'time', e.target.value)}
                    className={inputClass}
                    placeholder="9:45 AM"
                  />
                  <input
                    type="text"
                    value={st.label}
                    onChange={e => updateServiceTime(i, 'label', e.target.value)}
                    className={inputClass}
                    placeholder="Sunday School"
                  />
                </div>
                <button
                  onClick={() => removeServiceTime(i)}
                  className="p-2 rounded hover:bg-red-50 transition-colors shrink-0"
                  title="Remove"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <p className="text-xs text-steel mt-2">Format: Day · Time · Label (e.g. Sunday · 11:00 AM · Morning Worship)</p>
          </div>
        )}
      </div>

      {/* App Store Links */}
      <div className="bg-white rounded-xl border border-cream p-6">
        <h2 className="text-lg font-semibold text-navy-dark mb-4">App Store Links</h2>
        <p className="text-sm text-steel mb-4">
          These appear in the footer. Leave blank to hide a link.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Apple App Store URL</label>
            <input
              type="url"
              value={appStoreUrl}
              onChange={e => setAppStoreUrl(e.target.value)}
              className={inputClass}
              placeholder="https://apps.apple.com/app/..."
            />
          </div>
          <div>
            <label className={labelClass}>Google Play Store URL</label>
            <input
              type="url"
              value={googlePlayUrl}
              onChange={e => setGooglePlayUrl(e.target.value)}
              className={inputClass}
              placeholder="https://play.google.com/store/apps/..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
