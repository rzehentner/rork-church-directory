'use client';

import { useEffect, useRef, useState } from 'react';
import { createAdminClient } from '@/lib/supabase-admin';
import type { StaffMember } from '@/types';

interface StaffRow extends StaffMember {
  is_active: boolean;
  is_public: boolean;
  person_id: string | null;
  persons: {
    first_name: string | null;
    last_name: string | null;
    photo_path: string | null;
  } | null;
}

const EMPTY_FORM: Omit<StaffRow, 'id' | 'sort_order' | 'persons'> = {
  first_name: '',
  last_name: '',
  title: '',
  bio: '',
  public_email: '',
  public_phone: '',
  photo_path: '',
  is_active: true,
  is_public: true,
  person_id: null,
};

export default function AdminStaffPage() {
  const supabaseRef = useRef(createAdminClient());
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<StaffRow, 'id' | 'sort_order' | 'persons'>>(EMPTY_FORM);

  // Person search
  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<
    { id: string; first_name: string | null; last_name: string | null }[]
  >([]);
  const [searchingPersons, setSearchingPersons] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    const { data, error: fetchError } = await supabaseRef.current
      .from('staff')
      .select('*, persons(first_name, last_name, photo_path)')
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setStaff((data ?? []) as StaffRow[]);
    }
    setLoading(false);
  }

  function photoUrl(path: string | null) {
    if (!path) return null;
    return `${supabaseUrl}/storage/v1/object/public/staff-photos/${path}`;
  }

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPersonSearch('');
    setPersonResults([]);
    setShowForm(true);
  }

  function openEditForm(member: StaffRow) {
    setEditingId(member.id);
    setForm({
      first_name: member.first_name,
      last_name: member.last_name,
      title: member.title,
      bio: member.bio,
      public_email: member.public_email,
      public_phone: member.public_phone,
      photo_path: member.photo_path,
      is_active: member.is_active,
      is_public: member.is_public,
      person_id: member.person_id,
    });
    setPersonSearch('');
    setPersonResults([]);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setPersonSearch('');
    setPersonResults([]);
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const payload = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      title: form.title || null,
      bio: form.bio || null,
      public_email: form.public_email || null,
      public_phone: form.public_phone || null,
      photo_path: form.photo_path || null,
      is_active: form.is_active,
      is_public: form.is_public,
      person_id: form.person_id || null,
    };

    if (editingId) {
      const { error: updateError } = await supabaseRef.current
        .from('staff')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const nextOrder =
        staff.length > 0 ? Math.max(...staff.map(s => s.sort_order)) + 1 : 0;

      const { error: insertError } = await supabaseRef.current
        .from('staff')
        .insert({ ...payload, sort_order: nextOrder });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    await loadStaff();
    cancelForm();
    setSaving(false);
  }

  async function handleDelete(member: StaffRow) {
    const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'this staff member';
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    const { error: deleteError } = await supabaseRef.current
      .from('staff')
      .delete()
      .eq('id', member.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStaff(prev => prev.filter(s => s.id !== member.id));
  }

  async function handleToggle(member: StaffRow, field: 'is_active' | 'is_public') {
    const newValue = !member[field];
    const { error: updateError } = await supabaseRef.current
      .from('staff')
      .update({ [field]: newValue })
      .eq('id', member.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStaff(prev =>
      prev.map(s => (s.id === member.id ? { ...s, [field]: newValue } : s))
    );
  }

  async function handleMove(member: StaffRow, direction: 'up' | 'down') {
    const idx = staff.findIndex(s => s.id === member.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= staff.length) return;

    const other = staff[swapIdx];
    await Promise.all([
      supabaseRef.current.from('staff').update({ sort_order: other.sort_order }).eq('id', member.id),
      supabaseRef.current.from('staff').update({ sort_order: member.sort_order }).eq('id', other.id),
    ]);

    const updated = [...staff];
    updated[idx] = { ...member, sort_order: other.sort_order };
    updated[swapIdx] = { ...other, sort_order: member.sort_order };
    updated.sort((a, b) => a.sort_order - b.sort_order);
    setStaff(updated);
  }

  async function handlePersonSearch(query: string) {
    setPersonSearch(query);
    if (query.trim().length < 2) {
      setPersonResults([]);
      return;
    }
    setSearchingPersons(true);
    const { data } = await supabaseRef.current
      .from('persons')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(10);
    setPersonResults((data ?? []) as { id: string; first_name: string | null; last_name: string | null }[]);
    setSearchingPersons(false);
  }

  function handleLinkPerson(person: { id: string; first_name: string | null; last_name: string | null }) {
    setForm(prev => ({
      ...prev,
      person_id: person.id,
      first_name: prev.first_name || person.first_name,
      last_name: prev.last_name || person.last_name,
    }));
    setPersonSearch('');
    setPersonResults([]);
  }

  function handleUnlinkPerson() {
    setForm(prev => ({ ...prev, person_id: null }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Staff</h1>
          <p className="text-sm text-steel mt-1">
            Manage staff members displayed on the public staff page.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors"
          >
            + Add Staff Member
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-cream p-6 mb-6">
          <h2 className="text-lg font-bold text-navy-dark mb-5">
            {editingId ? 'Edit Staff Member' : 'New Staff Member'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">First Name</label>
              <input
                type="text"
                value={form.first_name ?? ''}
                onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">Last Name</label>
              <input
                type="text"
                value={form.last_name ?? ''}
                onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="Smith"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-navy-dark mb-1">Title / Role</label>
              <input
                type="text"
                value={form.title ?? ''}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="Senior Pastor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">Public Email</label>
              <input
                type="email"
                value={form.public_email ?? ''}
                onChange={e => setForm(prev => ({ ...prev, public_email: e.target.value }))}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="pastor@ednabc.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">Public Phone</label>
              <input
                type="tel"
                value={form.public_phone ?? ''}
                onChange={e => setForm(prev => ({ ...prev, public_phone: e.target.value }))}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="(979) 555-0100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-navy-dark mb-1">Bio</label>
              <textarea
                value={form.bio ?? ''}
                onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                placeholder="A short biography..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-navy-dark mb-1">
                Photo Path
                <span className="text-steel font-normal ml-1">(relative path in staff-photos bucket)</span>
              </label>
              <input
                type="text"
                value={form.photo_path ?? ''}
                onChange={e => setForm(prev => ({ ...prev, photo_path: e.target.value }))}
                className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="john-smith.jpg"
              />
            </div>

            {/* Person link */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-navy-dark mb-1">
                Linked App Member
                <span className="text-steel font-normal ml-1">(optional)</span>
              </label>
              {form.person_id ? (
                <div className="flex items-center gap-3 bg-cream/50 border border-cream rounded-lg px-3 py-2">
                  <span className="text-sm text-navy-dark flex-1">Linked to person ID: {form.person_id}</span>
                  <button
                    type="button"
                    onClick={handleUnlinkPerson}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={personSearch}
                    onChange={e => handlePersonSearch(e.target.value)}
                    className="w-full border border-cream rounded-lg px-3 py-2 text-sm text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="Search by name to link an app member..."
                  />
                  {searchingPersons && (
                    <div className="absolute right-3 top-2.5 text-xs text-steel">Searching...</div>
                  )}
                  {personResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-cream rounded-lg shadow-lg overflow-hidden">
                      {personResults.map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleLinkPerson(person)}
                          className="w-full text-left px-3 py-2 text-sm text-navy-dark hover:bg-cream/50 transition-colors"
                        >
                          {[person.first_name, person.last_name].filter(Boolean).join(' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-cream accent-navy"
                />
                <span className="text-sm text-navy-dark">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={e => setForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="w-4 h-4 rounded border-cream accent-navy"
                />
                <span className="text-sm text-navy-dark">Public</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-cream">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Staff Member'}
            </button>
            <button
              onClick={cancelForm}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-cream text-sm text-steel hover:bg-cream/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="text-steel text-sm">Loading...</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-cream">
          <svg
            className="w-16 h-16 mx-auto text-cream"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-steel mt-4">No staff members yet.</p>
          <p className="text-steel/60 text-sm mt-1">Add your first staff member to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                <th className="text-left px-4 py-3 font-medium text-navy-dark">Staff Member</th>
                <th className="text-left px-4 py-3 font-medium text-navy-dark hidden md:table-cell">Title</th>
                <th className="text-center px-4 py-3 font-medium text-navy-dark hidden sm:table-cell">Order</th>
                <th className="text-center px-4 py-3 font-medium text-navy-dark">Active</th>
                <th className="text-center px-4 py-3 font-medium text-navy-dark hidden sm:table-cell">Public</th>
                <th className="text-right px-4 py-3 font-medium text-navy-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member, idx) => {
                const fullName = [member.first_name, member.last_name]
                  .filter(Boolean)
                  .join(' ') || 'Unnamed';
                const photo = photoUrl(member.photo_path);

                return (
                  <tr key={member.id} className="border-b border-cream last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-cream/60 shrink-0">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt={fullName}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-navy/40 text-xs font-bold">
                              {fullName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-navy-dark">{fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-steel hidden md:table-cell">
                      {member.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-steel hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => handleMove(member, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-cream disabled:opacity-25 transition-colors"
                          title="Move up"
                        >
                          <svg className="w-3 h-3 text-navy-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <span className="text-xs w-5 text-center">{member.sort_order}</span>
                        <button
                          onClick={() => handleMove(member, 'down')}
                          disabled={idx === staff.length - 1}
                          className="p-1 rounded hover:bg-cream disabled:opacity-25 transition-colors"
                          title="Move down"
                        >
                          <svg className="w-3 h-3 text-navy-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(member, 'is_active')}
                        title={member.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          member.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {member.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <button
                        onClick={() => handleToggle(member, 'is_public')}
                        title={member.is_public ? 'Public — click to hide' : 'Hidden — click to make public'}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          member.is_public
                            ? 'bg-gold/20 text-gold hover:bg-gold/30'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {member.is_public ? 'Public' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        onClick={() => openEditForm(member)}
                        className="text-navy hover:text-navy-light transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-cream/50 rounded-xl p-4 text-sm text-steel">
        <strong className="text-navy-dark">Note:</strong> Staff members with{' '}
        <span className="font-medium text-navy-dark">Public</span> turned on appear on the public{' '}
        <a href="/staff" target="_blank" className="text-navy underline underline-offset-2 hover:text-gold">
          /staff
        </a>{' '}
        page. The <span className="font-medium text-navy-dark">Active</span> flag controls whether the record
        is considered active at all. Photos are served from the{' '}
        <code className="bg-cream rounded px-1">staff-photos</code> storage bucket — upload photos there
        and enter the file path here.
      </div>
    </div>
  );
}
