import React from 'react';
import {
  LayoutDashboard,
  DoorClosed,
  Users,
  CalendarCheck,
  Receipt,
  Database,
  Building2
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts = {} }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Room Inventory', icon: DoorClosed, count: counts.rooms },
    { id: 'guests', label: 'Guest Profiles', icon: Users, count: counts.guests },
    { id: 'reservations', label: 'Reservations', icon: CalendarCheck, count: counts.reservations },
    { id: 'payments', label: 'Billing & Ledger', icon: Receipt },
    { id: 'sqllab', label: 'SQL Lab', icon: Database, badge: 'SQL' }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none shadow-sm">
      <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Hotel Manager</h1>
          <p className="text-[11px] text-slate-400 font-medium">Reservation System</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && (
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
