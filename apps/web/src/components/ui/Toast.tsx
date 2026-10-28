import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { cn } from '../../lib/cn';

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle
};

export function ToastViewport() {
  const toasts = useAppStore((state) => state.toasts);
  const dismiss = useAppStore((state) => state.dismissToast);

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex flex-col items-stretch gap-2 sm:left-auto sm:right-5 sm:w-[360px]"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-panel border bg-panel-raised px-3 py-2.5 text-sm font-semibold text-ink shadow-raised',
              toast.tone === 'error' ? 'border-red' : toast.tone === 'success' ? 'border-green' : 'border-line'
            )}
          >
            <Icon
              size={18}
              aria-hidden="true"
              className={cn(
                'mt-0.5 shrink-0',
                toast.tone === 'error' ? 'text-red' : toast.tone === 'success' ? 'text-green' : 'text-blue'
              )}
            />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-control text-ink-soft hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
