import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  LogIn, 
  LogOut, 
  XCircle, 
  Edit3, 
  X, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';
import Modal from './Modal.jsx';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function ReservationsView({ 
  reservations, 
  rooms, 
  guests, 
  onCreate, 
  onUpdate, 
  onStatusChange
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    guest_id: '',
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    num_guests: 1,
    status: 'Confirmed',
    record_initial_payment: true,
    payment_method: 'UPI'
  });

  const getNearestAvailableDates = useCallback((roomId, nights = 2) => {
    const today = new Date().toISOString().split('T')[0];
    const activeBookings = reservations
      .filter(r => String(r.room_id) === String(roomId) && ['Confirmed', 'Checked In', 'Pending'].includes(r.status))
      .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));

    let candidate = today;
    for (let i = 0; i < 50; i++) {
      const candidateEnd = addDays(candidate, nights);
      const overlap = activeBookings.find(r => r.check_in_date < candidateEnd && r.check_out_date > candidate);
      if (!overlap) {
        return { checkIn: candidate, checkOut: candidateEnd };
      }
      candidate = overlap.check_out_date;
    }
    return { checkIn: today, checkOut: addDays(today, nights) };
  }, [reservations]);

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => String(r.id) === String(formData.room_id));
  }, [rooms, formData.room_id]);

  const selectedRoomActiveBookings = useMemo(() => {
    if (!formData.room_id) return [];
    return reservations
      .filter(r => String(r.room_id) === String(formData.room_id) && 
                   ['Confirmed', 'Checked In', 'Pending'].includes(r.status) &&
                   (editingRes ? r.id !== editingRes.id : true))
      .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  }, [formData.room_id, reservations, editingRes]);

  const dateConflict = useMemo(() => {
    if (!formData.room_id || !formData.check_in_date || !formData.check_out_date) return null;
    return selectedRoomActiveBookings.find(
      r => r.check_in_date < formData.check_out_date && r.check_out_date > formData.check_in_date
    );
  }, [formData.room_id, formData.check_in_date, formData.check_out_date, selectedRoomActiveBookings]);

  const nearestSlot = useMemo(() => {
    if (!formData.room_id) return null;
    return getNearestAvailableDates(formData.room_id, 2);
  }, [formData.room_id, getNearestAvailableDates]);

  const calculatedNights = useMemo(() => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;
    const diff = Math.ceil((new Date(formData.check_out_date + 'T00:00:00') - new Date(formData.check_in_date + 'T00:00:00')) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [formData.check_in_date, formData.check_out_date]);

  const calculatedTotal = useMemo(() => {
    if (!selectedRoom || calculatedNights <= 0) return 0;
    return calculatedNights * selectedRoom.price_per_night;
  }, [selectedRoom, calculatedNights]);

  const filtered = reservations.filter((r) => {
    const matchesSearch = !search ||
      r.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      r.room_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingRes(null);
    const initialRoom = rooms.find((r) => r.status !== 'Maintenance') || rooms[0];
    const initialRoomId = initialRoom?.id || '';
    const initialDates = initialRoomId ? getNearestAvailableDates(initialRoomId, 2) : { checkIn: '', checkOut: '' };

    setFormData({
      guest_id: guests[0]?.id || '',
      room_id: initialRoomId,
      check_in_date: initialDates.checkIn,
      check_out_date: initialDates.checkOut,
      num_guests: 1,
      status: 'Confirmed',
      record_initial_payment: true,
      payment_method: 'UPI'
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleRoomSelect = (newRoomId) => {
    const dates = getNearestAvailableDates(newRoomId, 2);
    setFormData(prev => ({
      ...prev,
      room_id: newRoomId,
      check_in_date: dates.checkIn,
      check_out_date: dates.checkOut
    }));
  };

  const openEditModal = (res) => {
    setEditingRes(res);
    setFormData({
      guest_id: res.guest_id,
      room_id: res.room_id,
      check_in_date: res.check_in_date,
      check_out_date: res.check_out_date,
      num_guests: res.num_guests,
      status: res.status,
      record_initial_payment: false,
      payment_method: 'UPI'
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (calculatedNights <= 0) {
      setFormError('Check-out date must be strictly after check-in date.');
      return;
    }

    if (dateConflict) {
      setFormError(`Room ${selectedRoom?.room_number} is already booked from ${dateConflict.check_in_date} to ${dateConflict.check_out_date}.`);
      return;
    }

    if (selectedRoom && Number(formData.num_guests) > selectedRoom.capacity) {
      setFormError(`Room ${selectedRoom.room_number} maximum capacity is ${selectedRoom.capacity} guest(s).`);
      return;
    }

    setSubmitting(true);
    try {
      if (editingRes) {
        await onUpdate(editingRes.id, {
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          num_guests: Number(formData.num_guests),
          status: formData.status
        });
      } else {
        await onCreate({
          guest_id: Number(formData.guest_id),
          room_id: Number(formData.room_id),
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          num_guests: Number(formData.num_guests),
          status: formData.status || 'Confirmed',
          initial_payment: formData.record_initial_payment
            ? { amount: calculatedTotal, payment_method: formData.payment_method, payment_status: 'Paid' }
            : null
        });
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to process reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoomAvailabilityStatus = (room) => {
    if (room.status === 'Maintenance') return 'Under Maintenance';
    const active = reservations.filter(
      r => String(r.room_id) === String(room.id) && ['Confirmed', 'Checked In', 'Pending'].includes(r.status)
    );
    if (active.length === 0) return 'Free Now';
    const latest = active[active.length - 1];
    return `Booked till ${latest.check_out_date}`;
  };

  const getStatusBadge = (status) => {
    const map = {
      'Confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Checked In': 'bg-blue-50 text-blue-700 border-blue-200',
      'Checked Out': 'bg-slate-100 text-slate-700 border-slate-200',
      'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200'
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
          <h2 className="text-base font-semibold text-slate-800">Reservation Master Ledger</h2>
          <p className="text-xs text-slate-500">Coordinate bookings, date overlaps, tariffs, and check-in workflows</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name or room number..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Statuses</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Checked In">Checked In</option>
          <option value="Pending">Pending</option>
          <option value="Checked Out">Checked Out</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Guest Info</th>
                <th className="py-3 px-4">Assigned Room</th>
                <th className="py-3 px-4">Stay Schedule</th>
                <th className="py-3 px-4">Occupants</th>
                <th className="py-3 px-4">Financials</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No reservations found matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                      #{res.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{res.guest_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{res.guest_phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">Room {res.room_number}</div>
                      <div className="text-[11px] text-slate-400">{res.room_type} (₹{Number(res.price_per_night).toLocaleString('en-IN')}/nt)</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <div>{res.check_in_date}</div>
                      <div className="text-[11px] text-slate-400">to {res.check_out_date}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {res.num_guests} Guest{res.num_guests > 1 ? 's' : ''}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-semibold text-slate-900">₹{Number(res.total_price).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] font-mono text-emerald-600">
                        Paid: ₹{Number(res.paid_amount || 0).toLocaleString('en-IN')}
                      </div>
                      {Number(res.total_price) > Number(res.paid_amount || 0) ? (
                        <div className="text-[10px] font-mono font-semibold text-rose-600">
                          Due: ₹{(Number(res.total_price) - Number(res.paid_amount || 0)).toLocaleString('en-IN')}
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-slate-400">Settled</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(res.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={res.status}
                          onChange={(e) => onStatusChange(res.id, e.target.value)}
                          className={`text-[11px] font-medium rounded-lg px-2 py-1 border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer ${
                            res.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            res.status === 'Checked In' ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold' :
                            res.status === 'Checked Out' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                            res.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                          title="Change or revert booking status"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Checked In">Checked In</option>
                          <option value="Checked Out">Checked Out</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => openEditModal(res)}
                          title="Edit Booking & Schedule"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
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
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {editingRes ? `Modify Booking #${editingRes.id}` : 'Create Reservation'}
              </h3>
              <p className="text-[11px] text-slate-400">Live calendar scheduling & conflict prevention</p>
            </div>
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
            {!editingRes && (
              <>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Select Guest Profile *</label>
                  <select
                    required
                    value={formData.guest_id}
                    onChange={(e) => setFormData({ ...formData, guest_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                  >
                    <option value="">-- Choose Guest --</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.full_name} ({g.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700">Select Assigned Room *</label>
                    {selectedRoom && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                        selectedRoomActiveBookings.length === 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {getRoomAvailabilityStatus(selectedRoom)}
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={formData.room_id}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                  >
                    <option value="">-- Choose Room --</option>
                    {rooms.map((r) => {
                      const avail = getRoomAvailabilityStatus(r);
                      return (
                        <option key={r.id} value={r.id} disabled={r.status === 'Maintenance'}>
                          Room {r.room_number} — {r.room_type} (₹{Number(r.price_per_night).toLocaleString('en-IN')}/nt) — [{avail}]
                        </option>
                      );
                    })}
                  </select>

                  {selectedRoomActiveBookings.length > 0 && (
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Existing Active Bookings:
                        </span>
                        {nearestSlot && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                check_in_date: nearestSlot.checkIn,
                                check_out_date: nearestSlot.checkOut
                              }));
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            Apply Next Free Slot
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRoomActiveBookings.map(b => (
                          <span key={b.id} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px]">
                            {b.check_in_date} → {b.check_out_date} ({b.status})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Check-in Date *</label>
                <input
                  type="date"
                  required
                  value={formData.check_in_date}
                  onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                  className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 text-slate-800 ${
                    dateConflict 
                      ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20' 
                      : 'border-slate-200 focus:ring-indigo-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Check-out Date *</label>
                <input
                  type="date"
                  required
                  value={formData.check_out_date}
                  onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                  className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 text-slate-800 ${
                    dateConflict 
                      ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500/20' 
                      : 'border-slate-200 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
            </div>

            {dateConflict ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong>Date Conflict:</strong> Room {selectedRoom?.room_number} is already booked from{' '}
                    <span className="font-mono font-semibold">{dateConflict.check_in_date}</span> to{' '}
                    <span className="font-mono font-semibold">{dateConflict.check_out_date}</span> ({dateConflict.status}).
                  </div>
                </div>
                {nearestSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        check_in_date: nearestSlot.checkIn,
                        check_out_date: nearestSlot.checkOut
                      }));
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Set to Nearest Free Slot ({nearestSlot.checkIn} to {nearestSlot.checkOut})</span>
                  </button>
                )}
              </div>
            ) : calculatedNights > 0 && selectedRoom ? (
              <div className="p-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Room {selectedRoom.room_number} is <strong>Available</strong> for this date range ({calculatedNights} Nights).</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Number of Occupants *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedRoom ? selectedRoom.capacity : 10}
                  required
                  value={formData.num_guests}
                  onChange={(e) => setFormData({ ...formData, num_guests: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              {editingRes && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reservation Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Duration:</span>
                <span className="font-semibold text-slate-800">{calculatedNights} Night{calculatedNights === 1 ? '' : 's'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tariff calculation:</span>
                <span>{calculatedNights} × ₹{Number(selectedRoom?.price_per_night || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between font-semibold text-slate-900 text-sm font-mono">
                <span>Total Due:</span>
                <span className="text-indigo-600 font-bold">₹{calculatedTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {!editingRes && (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.record_initial_payment}
                    onChange={(e) => setFormData({ ...formData, record_initial_payment: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Record immediate payment in billing ledger</span>
                </label>

                {formData.record_initial_payment && (
                  <div className="mt-2 pl-5">
                    <label className="block text-[11px] text-slate-500 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                    >
                      <option value="UPI">UPI / Digital Transfer</option>
                      <option value="Card">Credit/Debit Card</option>
                      <option value="Cash">Cash at Counter</option>
                    </select>
                  </div>
                )}
              </div>
            )}

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
                disabled={submitting || Boolean(dateConflict)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : editingRes ? 'Save Dates' : dateConflict ? 'Dates Unavailable' : 'Confirm & Reserve'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
