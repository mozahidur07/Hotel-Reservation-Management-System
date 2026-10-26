import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import DashboardView from './components/DashboardView.jsx';
import RoomsView from './components/RoomsView.jsx';
import GuestsView from './components/GuestsView.jsx';
import ReservationsView from './components/ReservationsView.jsx';
import PaymentsView from './components/PaymentsView.jsx';
import SqlLabView from './components/SqlLabView.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [dashRes, roomsRes, guestsRes, resRes, payRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/rooms'),
        fetch('/api/guests'),
        fetch('/api/reservations'),
        fetch('/api/payments')
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (guestsRes.ok) setGuests(await guestsRes.json());
      if (resRes.ok) setReservations(await resRes.json());
      if (payRes.ok) setPayments(await payRes.json());
    } catch (err) {
      showToast('Could not sync with local SQLite server.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleAddRoom = async (formData) => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create room');
    showToast(`Room ${data.room_number} registered successfully!`, 'success');
    await loadAllData(true);
  };

  const handleUpdateRoom = async (id, formData) => {
    const res = await fetch(`/api/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update room');
    showToast(`Room ${data.room_number} updated.`, 'success');
    await loadAllData(true);
  };

  const handleDeleteRoom = (room) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Room ${room.room_number}?`,
      message: `Are you sure you want to remove Room ${room.room_number} from database inventory? This action is permanent.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete room');
          showToast(`Room ${room.room_number} removed.`, 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await loadAllData(true);
        } catch (err) {
          showToast(err.message, 'error');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleAddGuest = async (formData) => {
    const res = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create guest');
    showToast(`Guest profile "${data.full_name}" registered!`, 'success');
    await loadAllData(true);
  };

  const handleUpdateGuest = async (id, formData) => {
    const res = await fetch(`/api/guests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update guest');
    showToast(`Guest profile updated.`, 'success');
    await loadAllData(true);
  };

  const handleDeleteGuest = (guest) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Profile: ${guest.full_name}?`,
      message: `Are you sure you want to remove guest #${guest.id}? Operation will be blocked if active reservations exist.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/guests/${guest.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete guest');
          showToast(`Guest profile removed.`, 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await loadAllData(true);
        } catch (err) {
          showToast(err.message, 'error');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCreateReservation = async (reservationData) => {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservationData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create reservation');
    showToast(`Reservation #${data.id} confirmed for ${data.guest_name}!`, 'success');
    await loadAllData(true);
  };

  const handleUpdateReservation = async (id, updateData) => {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update reservation');
    showToast(`Reservation #${id} schedule updated.`, 'success');
    await loadAllData(true);
  };

  const handleReservationStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed');
      showToast(`Reservation #${id} is now ${newStatus}.`, 'success');
      await loadAllData(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddPayment = async (paymentData) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record payment');
    showToast(`Transaction of ₹${Number(data.amount).toLocaleString('en-IN')} recorded!`, 'success');
    await loadAllData(true);
  };

  const handleUpdatePayment = async (id, paymentData) => {
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Server returned invalid response' };
    }
    if (!res.ok) throw new Error(data.error || 'Failed to update transaction');
    showToast(`Transaction #${id} updated successfully.`, 'success');
    await loadAllData(true);
  };

  const handleDeletePayment = (payment) => {
    setConfirmModal({
      isOpen: true,
      title: 'Void Payment Transaction',
      message: `Are you sure you want to void and delete payment record #${payment.id} (₹${Number(payment.amount).toLocaleString('en-IN')})? This will update the ledger and recalculate reservation balances.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/payments/${payment.id}`, { method: 'DELETE' });
          const text = await res.text();
          let data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = { error: text };
          }
          if (!res.ok) throw new Error(data.error || 'Failed to delete transaction');
          showToast(`Transaction #${payment.id} deleted.`, 'info');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await loadAllData(true);
        } catch (err) {
          showToast(err.message, 'error');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const counts = {
    rooms: rooms.length,
    guests: guests.length,
    reservations: reservations.length
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        counts={counts} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          activeTab={activeTab} 
          onRefresh={() => loadAllData(false)}
          isRefreshing={refreshing}
          onQuickAction={activeTab !== 'reservations' ? () => setActiveTab('reservations') : null}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView 
              data={dashboardData} 
              loading={loading} 
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'rooms' && (
            <RoomsView 
              rooms={rooms} 
              onAdd={handleAddRoom}
              onUpdate={handleUpdateRoom}
              onDelete={handleDeleteRoom}
            />
          )}

          {activeTab === 'guests' && (
            <GuestsView 
              guests={guests} 
              onAdd={handleAddGuest}
              onUpdate={handleUpdateGuest}
              onDelete={handleDeleteGuest}
            />
          )}

          {activeTab === 'reservations' && (
            <ReservationsView 
              reservations={reservations}
              rooms={rooms}
              guests={guests}
              onCreate={handleCreateReservation}
              onUpdate={handleUpdateReservation}
              onStatusChange={handleReservationStatusChange}
              onRecordPayment={handleAddPayment}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView 
              payments={payments}
              reservations={reservations}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'sqllab' && (
            <SqlLabView 
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={closeToast} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
