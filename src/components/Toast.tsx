import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ToastType } from '../context/AppContext';

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm print:hidden">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg text-sm font-medium animate-fadeIn ${styles[toast.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconStyles[toast.type]}`} />
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
