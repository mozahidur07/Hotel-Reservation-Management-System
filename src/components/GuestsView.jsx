import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import Modal from './Modal.jsx';

export default function GuestsView({ guests, onAdd, onUpdate, onDelete }) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: ''
  });

  const filtered = guests.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      g.full_name.toLowerCase().includes(s) ||
      g.phone.toLowerCase().includes(s) ||
      g.email.toLowerCase().includes(s)
    );
  });

  const openCreateModal = () => {
    setEditingGuest(null);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      address: ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setFormData({
      full_name: guest.full_name,
      phone: guest.phone,
      email: guest.email,
      address: guest.address || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingGuest) {
        await onUpdate(editingGuest.id, formData);
      } else {
        await onAdd(formData);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Guest Profiles</h2>
          <p className="text-xs text-slate-500">Maintain guest CRM data, verified contacts, and booking histories</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register Guest</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, phone number, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Residential Address</th>
                <th className="py-3 px-4">Total Stays</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No guest profiles found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                      #{guest.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {guest.full_name}
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{guest.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{guest.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {guest.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{guest.address}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {guest.total_stays || 0} booking{guest.total_stays === 1 ? '' : 's'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                      ₹{Number(guest.total_expenditure || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(guest)}
                          title="Edit Guest"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(guest)}
                          title="Delete Guest"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen}>
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">
              {editingGuest ? `Edit Guest #${editingGuest.id}` : 'Register New Guest'}
            </h3>
            <button
              onClick={() => setModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Rajesh Sharma / Sarah Jenkins"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98201 12345"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. guest@example.com"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Residential / City Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Bandra West, Mumbai, MH / Kensington, London, UK"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingGuest ? 'Save Changes' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
