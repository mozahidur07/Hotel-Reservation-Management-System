import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import Modal from './Modal.jsx';

export default function RoomsView({ rooms, onAdd, onUpdate, onDelete }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    room_number: '',
    room_type: 'Standard',
    capacity: 2,
    price_per_night: 2200.00,
    status: 'Available',
    description: ''
  });

  const filtered = rooms.filter((r) => {
    const matchesSearch = !search || 
      r.room_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !typeFilter || r.room_type === typeFilter;
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      room_number: '',
      room_type: 'Standard',
      capacity: 2,
      price_per_night: 2200.00,
      status: 'Available',
      description: ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      capacity: room.capacity,
      price_per_night: room.price_per_night,
      status: room.status,
      description: room.description || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.room_number.trim()) {
      setFormError('Room number is required.');
      return;
    }
    if (Number(formData.capacity) < 1) {
      setFormError('Capacity must be at least 1 guest.');
      return;
    }
    if (Number(formData.price_per_night) < 0) {
      setFormError('Price per night cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRoom) {
        await onUpdate(editingRoom.id, formData);
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

  const getStatusBadge = (status) => {
    const map = {
      'Available': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Occupied': 'bg-blue-50 text-blue-700 border-blue-200',
      'Maintenance': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${map[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Room Inventory</h2>
          <p className="text-xs text-slate-500">Configure physical rooms, capacity specs, and nightly tariffs</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by room number or description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Room No</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Max Capacity</th>
                <th className="py-3 px-4">Tariff / Night</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No rooms matched your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {room.room_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{room.room_type}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {room.capacity} Person{room.capacity > 1 ? 's' : ''}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-mono">
                      ₹{Number(room.price_per_night).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(room.status)}</td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {room.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(room)}
                          title="Edit Room"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(room)}
                          title="Delete Room"
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
              {editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Room'}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="e.g. 101"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Room Type</label>
                <select
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Capacity (Guests) *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tariff / Night (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formData.price_per_night}
                  onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Operational Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Description / Amenities</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. King-size bed, sea view, high-speed WiFi..."
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
                {submitting ? 'Saving...' : editingRoom ? 'Save Changes' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
