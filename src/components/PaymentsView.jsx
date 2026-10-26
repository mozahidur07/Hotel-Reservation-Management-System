import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  X, 
  AlertCircle, 
  IndianRupee, 
  Receipt, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import Modal from './Modal.jsx';

export default function PaymentsView({ 
  payments, 
  reservations, 
  onAddPayment, 
  onUpdatePayment, 
  onDeletePayment 
}) {
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    reservation_id: '',
    amount: '',
    payment_method: 'UPI',
    payment_status: 'Paid',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const filtered = payments.filter((p) => {
    return !statusFilter || p.payment_status === statusFilter;
  });

  const totalCollected = payments
    .filter((p) => p.payment_status === 'Paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const getReservationPaidAmount = (resId, excludePaymentId = null) => {
    return payments
      .filter((p) => 
        String(p.reservation_id) === String(resId) && 
        p.payment_status !== 'Refunded' &&
        (excludePaymentId ? String(p.id) !== String(excludePaymentId) : true)
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  };

  const selectedRes = useMemo(() => {
    if (!formData.reservation_id) return null;
    return reservations.find((r) => String(r.id) === String(formData.reservation_id));
  }, [reservations, formData.reservation_id]);

  const billingBreakdown = useMemo(() => {
    if (!selectedRes) return null;
    const total = Number(selectedRes.total_price || 0);
    const alreadyPaid = getReservationPaidAmount(
      selectedRes.id,
      editingPayment ? editingPayment.id : null
    );

    const balanceBeforeThisPayment = Math.max(0, total - alreadyPaid);
    const enteredAmount = Number(formData.amount || 0);
    const remainingAfterThis = Math.max(0, balanceBeforeThisPayment - enteredAmount);

    return {
      total,
      alreadyPaid,
      balanceBeforeThisPayment,
      enteredAmount,
      remainingAfterThis
    };
  }, [selectedRes, editingPayment, formData.amount, payments]);

  const openCreateModal = () => {
    setEditingPayment(null);
    const resWithDue = reservations.find((r) => {
      const paid = getReservationPaidAmount(r.id);
      return Number(r.total_price) > paid;
    }) || reservations[0];

    const defaultResId = resWithDue?.id || '';
    const paidForDefault = defaultResId ? getReservationPaidAmount(defaultResId) : 0;
    const dueAmount = resWithDue ? Math.max(0, Number(resWithDue.total_price) - paidForDefault) : '';

    setFormData({
      reservation_id: defaultResId,
      amount: dueAmount > 0 ? dueAmount : (resWithDue ? Number(resWithDue.total_price) : ''),
      payment_method: 'UPI',
      payment_status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0]
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (payment) => {
    setEditingPayment(payment);
    setFormData({
      reservation_id: payment.reservation_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      payment_date: payment.payment_date
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleReservationChange = (resId) => {
    const resObj = reservations.find((r) => String(r.id) === String(resId));
    if (!resObj) return;
    const paid = getReservationPaidAmount(resId);
    const due = Math.max(0, Number(resObj.total_price) - paid);
    setFormData(prev => ({
      ...prev,
      reservation_id: resId,
      amount: due > 0 ? due : Number(resObj.total_price)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.reservation_id) {
      setFormError('Please select a valid reservation.');
      return;
    }
    if (Number(formData.amount) <= 0) {
      setFormError('Transaction amount must be greater than ₹0.00.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPayment) {
        await onUpdatePayment(editingPayment.id, {
          amount: Number(formData.amount),
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date
        });
      } else {
        await onAddPayment({
          reservation_id: Number(formData.reservation_id),
          amount: Number(formData.amount),
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date
        });
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Payment operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'Card':
        return <CreditCard className="w-3.5 h-3.5 text-blue-500" />;
      case 'Cash':
        return <Banknote className="w-3.5 h-3.5 text-emerald-500" />;
      case 'UPI':
        return <Smartphone className="w-3.5 h-3.5 text-violet-500" />;
      default:
        return <IndianRupee className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Billing & Payment Ledger</h2>
          <p className="text-xs text-slate-500">Record cash receipts, card swipes, UPI transactions, and track partial payments</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Transaction</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Settled Receipts</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Transactions</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">{payments.length} Records</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Filter Ledger</div>
            <p className="text-xs text-slate-400 mt-0.5">Filter by audit settlement status</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Statuses</option>
            <option value="Paid">Settled (Paid)</option>
            <option value="Pending">Pending Audit</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt ID</th>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Transaction Date</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No transactions recorded matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                      REC-{String(pay.id).padStart(5, '0')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      #{pay.reservation_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {pay.guest_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      Room {pay.room_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {pay.payment_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {getMethodIcon(pay.payment_method)}
                        <span>{pay.payment_method}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        pay.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : pay.payment_status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {pay.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono text-xs">
                      ₹{Number(pay.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(pay)}
                          title="Edit Transaction"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeletePayment(pay)}
                          title="Void / Delete Transaction"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {editingPayment ? `Update Transaction #${editingPayment.id}` : 'Record Payment Transaction'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {editingPayment ? 'Adjust payment method, amount or audit status' : 'Record full or partial guest payments with automatic balance deduction'}
              </p>
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
            <div>
              <label className="block font-medium text-slate-700 mb-1">Select Active Reservation *</label>
              <select
                required
                disabled={Boolean(editingPayment)}
                value={formData.reservation_id}
                onChange={(e) => handleReservationChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">-- Choose Reservation --</option>
                {reservations.map((r) => {
                  const total = Number(r.total_price || 0);
                  const paid = getReservationPaidAmount(r.id);
                  const due = Math.max(0, total - paid);
                  return (
                    <option key={r.id} value={r.id}>
                      #{r.id} — {r.guest_name} (Room {r.room_number}) | Total: ₹{total.toLocaleString('en-IN')}, Paid: ₹{paid.toLocaleString('en-IN')}, Due: ₹{due.toLocaleString('en-IN')}
                    </option>
                  );
                })}
              </select>
            </div>

            {billingBreakdown && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Total Booking Tariff:</span>
                  <span className="font-semibold text-slate-800 font-mono">₹{billingBreakdown.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{editingPayment ? 'Previously Paid (Other Receipts):' : 'Already Paid:'}</span>
                  <span className={`font-semibold font-mono ${billingBreakdown.alreadyPaid > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    ₹{billingBreakdown.alreadyPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex justify-between font-semibold text-slate-900">
                  <span>{editingPayment ? 'Balance Due (Before This Receipt):' : 'Pending Balance Due:'}</span>
                  <span className="text-rose-600 font-bold font-mono">₹{billingBreakdown.balanceBeforeThisPayment.toLocaleString('en-IN')}</span>
                </div>

                {billingBreakdown.balanceBeforeThisPayment > 0 && (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, amount: billingBreakdown.balanceBeforeThisPayment }))}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                    >
                      {editingPayment ? 'Set to Remaining Due' : 'Pay Full Due'} (₹{billingBreakdown.balanceBeforeThisPayment.toLocaleString('en-IN')})
                    </button>
                    {billingBreakdown.balanceBeforeThisPayment > 1000 && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, amount: Math.round(billingBreakdown.balanceBeforeThisPayment / 2) }))}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline"
                      >
                        Pay 50% (₹{Math.round(billingBreakdown.balanceBeforeThisPayment / 2).toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Transaction Amount (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                >
                  <option value="UPI">UPI / Digital</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Cash">Cash at Counter</option>
                </select>
              </div>
            </div>

            {billingBreakdown && billingBreakdown.enteredAmount > 0 && (
              <div className={`p-2 px-3 rounded-lg border text-[11px] flex items-center justify-between ${
                billingBreakdown.remainingAfterThis === 0 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center gap-1.5 font-medium">
                  {billingBreakdown.remainingAfterThis === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {billingBreakdown.remainingAfterThis === 0 
                      ? 'Fully Settled (₹0 Balance)' 
                      : 'Partial Payment — Remaining Due:'}
                  </span>
                </div>
                <span className="font-mono font-bold">
                  ₹{billingBreakdown.remainingAfterThis.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Settlement Status</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 bg-white"
                >
                  <option value="Paid">Paid (Settled)</option>
                  <option value="Pending">Pending Audit</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
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
                {submitting ? 'Saving...' : editingPayment ? 'Update Transaction' : 'Record Transaction'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
