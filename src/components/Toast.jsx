import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!message) return;
    setExiting(false);

    const timer = setTimeout(() => {
      triggerClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration]);

  const triggerClose = () => {
    setExiting(true);
    setTimeout(() => {
      onClose();
      setExiting(false);
    }, 300);
  };

  if (!message) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-emerald-900/5',
    error: 'bg-rose-50 border-rose-300 text-rose-800 shadow-rose-900/5',
    info: 'bg-blue-50 border-blue-300 text-blue-800 shadow-blue-900/5'
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-600 shrink-0" />
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-medium max-w-sm ${
        styles[type] || styles.info
      } ${exiting ? 'toast-slide-out' : 'toast-slide-in'}`}
    >
      {icons[type]}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={triggerClose}
        className="p-1 hover:bg-black/5 rounded-md transition-colors text-slate-500 hover:text-slate-800 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
