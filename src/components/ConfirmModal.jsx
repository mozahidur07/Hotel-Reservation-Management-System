import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', isDanger = true }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isDanger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm transition-colors ${
              isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
