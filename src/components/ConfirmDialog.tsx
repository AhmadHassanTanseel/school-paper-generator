import { AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ConfirmDialog() {
  const { confirmState, handleConfirm } = useApp();

  if (!confirmState?.open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[90] flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-scaleUp">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${confirmState.destructive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">{confirmState.title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{confirmState.message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => handleConfirm(false)}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            {confirmState.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={() => handleConfirm(true)}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
              confirmState.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1B365D] hover:bg-[#152946]'
            }`}
          >
            {confirmState.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
