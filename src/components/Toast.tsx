import React from 'react';
import { Check, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-none safe-bottom">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-lg bg-neutral-950/95 border border-amber-500/30 text-stone-100 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
          onClick={() => onDismiss(t.id)}
        >
          {t.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="text-xs font-medium tracking-tight text-stone-200">{t.text}</span>
        </div>
      ))}
    </div>
  );
};
