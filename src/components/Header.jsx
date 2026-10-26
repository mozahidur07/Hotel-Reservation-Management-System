import React from 'react';
import { RefreshCw, Plus, Calendar, ShieldCheck } from 'lucide-react';

export default function Header({ activeTab, onRefresh, isRefreshing, onQuickAction }) {
  const titles = {
    dashboard: 'Operations Dashboard',
    rooms: 'Room Inventory & Pricing',
    guests: 'Guest Management & Records',
    reservations: 'Reservation Master Ledger',
    payments: 'Billing & Transaction Ledger',
    sqllab: 'DBMS SQL Demonstration Lab'
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-slate-800 tracking-tight">
          {titles[activeTab] || 'Management'}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayStr}</span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh dataset from SQLite"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {onQuickAction && (
          <button
            onClick={onQuickAction}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </button>
        )}
      </div>
    </header>
  );
}
