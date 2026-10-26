import React from 'react';
import { 
  DoorClosed, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  BedDouble, 
  TrendingUp, 
  ArrowRight
} from 'lucide-react';

export default function DashboardView({ data, loading, onNavigate }) {
  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-mono">Loading hotel database...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recent = data?.recentReservations || [];

  const cards = [
    { label: 'Total Rooms', value: stats.totalRooms ?? 0, icon: DoorClosed, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: `${stats.availableRooms || 0} available` },
    { label: 'Occupancy Rate', value: `${stats.occupancyRate || 0}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${stats.occupiedRooms || 0} occupied rooms` },
    { label: 'Total Guests', value: stats.totalGuests ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', sub: 'Registered profiles' },
    { label: 'Active Check-Ins', value: stats.checkedInGuests ?? 0, icon: BedDouble, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'In-house guests' },
    { label: 'Total Bookings', value: stats.totalReservations ?? 0, icon: CalendarCheck, color: 'text-amber-600', bg: 'bg-amber-50', sub: `${stats.confirmedReservations || 0} confirmed` },
    { label: 'Recorded Revenue', value: `₹${Number(stats.totalPayments || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-700', bg: 'bg-emerald-50', sub: 'Settled payments' }
  ];

  const getStatusBadge = (status) => {
    const map = {
      'Confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Checked In': 'bg-blue-50 text-blue-700 border-blue-200',
      'Checked Out': 'bg-slate-100 text-slate-700 border-slate-200',
      'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
      'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${map[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{c.label}</span>
                <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900 tracking-tight">{c.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{c.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Recent Reservations</h3>
              <p className="text-xs text-slate-400">Live feed from reservations master ledger</p>
            </div>
            <button
              onClick={() => onNavigate('reservations')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Guest</th>
                  <th className="py-2.5 px-4">Room</th>
                  <th className="py-2.5 px-4">Stay Dates</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No reservations recorded yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">#{r.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{r.guest_name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        Room {r.room_number} <span className="text-[10px] text-slate-400">({r.room_type})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {r.check_in_date} → {r.check_out_date}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 font-mono">
                        ₹{Number(r.total_price).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Occupancy Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time room allocation status</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Available</span>
                <span className="text-emerald-600 font-semibold">{stats.availableRooms || 0} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalRooms ? ((stats.availableRooms || 0) / stats.totalRooms) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Occupied</span>
                <span className="text-blue-600 font-semibold">{stats.occupiedRooms || 0} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalRooms ? ((stats.occupiedRooms || 0) / stats.totalRooms) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Maintenance</span>
                <span className="text-rose-600 font-semibold">{stats.maintenanceRooms || 0} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalRooms ? ((stats.maintenanceRooms || 0) / stats.totalRooms) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
