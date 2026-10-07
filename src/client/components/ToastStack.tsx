import React, { useState, useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly type: ToastType;
  readonly duration?: number | undefined;
}

export type ToastInput = Omit<ToastItem, 'id' | 'type'> & {
  readonly type?: ToastType | undefined;
};

type Listener = (toasts: readonly ToastItem[]) => void;
const listeners = new Set<Listener>();
let currentToasts: readonly ToastItem[] = [];
let nextToastId = 1;

function notifyListeners(): void {
  listeners.forEach((listener) => listener(currentToasts));
}

/**
 * Sonner-style toast trigger functions.
 * Usable from any component without prop drilling.
 */
export const toast = {
  add: (input: ToastInput | string, type: ToastType = 'info'): string => {
    const id = `toast-${Date.now()}-${nextToastId++}`;
    const item: ToastItem =
      typeof input === 'string'
        ? { id, title: input, type, duration: 3800 }
        : {
            id,
            title: input.title,
            description: input.description,
            type: input.type ?? type,
            duration: input.duration ?? 3800,
          };

    // Keep up to 5 in history, top 3 rendered visually in collapsed stack
    currentToasts = [item, ...currentToasts].slice(0, 5);
    notifyListeners();
    return id;
  },
  success: (title: string, description?: string, duration?: number): string =>
    toast.add({ title, description, type: 'success', duration }, 'success'),
  info: (title: string, description?: string, duration?: number): string =>
    toast.add({ title, description, type: 'info', duration }, 'info'),
  warning: (title: string, description?: string, duration?: number): string =>
    toast.add({ title, description, type: 'warning', duration }, 'warning'),
  error: (title: string, description?: string, duration?: number): string =>
    toast.add({ title, description, type: 'error', duration }, 'error'),
  dismiss: (id: string): void => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    notifyListeners();
  },
  clear: (): void => {
    currentToasts = [];
    notifyListeners();
  },
};

/**
 * Hook to subscribe to toast stack updates.
 */
export function useToastStack(): {
  readonly toasts: readonly ToastItem[];
  readonly dismiss: (id: string) => void;
} {
  const [toasts, setToasts] = useState<readonly ToastItem[]>(currentToasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return { toasts, dismiss: toast.dismiss };
}

/**
 * Compute transform, opacity, and z-index according to Emil Kowalski's Sonner stack design.
 * Critical rule: Never animate from scale(0). Start from scale(0.95) with opacity.
 */
export function getToastStackStyles(
  index: number,
  isHovered: boolean,
  isMounted: boolean = true
): {
  readonly transform: string;
  readonly opacity: number;
  readonly zIndex: number;
} {
  // Mounting / unmounted state starts from scale(0.95), never scale(0)
  if (!isMounted) {
    return {
      transform: 'translateY(16px) scale(0.95)',
      opacity: 0,
      zIndex: 50 - index,
    };
  }

  // Expanded on hover
  if (isHovered) {
    return {
      transform: `translateY(-${index * 68}px) scale(1)`,
      opacity: index < 4 ? 1 : 0,
      zIndex: 50 - index,
    };
  }

  // Collapsed stack
  const scale = Math.max(0.85, 1 - index * 0.05);
  const translateY = -index * 12;
  const opacity = index === 0 ? 1 : index === 1 ? 0.9 : index === 2 ? 0.75 : 0;

  return {
    transform: `translateY(${translateY}px) scale(${scale})`,
    opacity,
    zIndex: 50 - index,
  };
}

const toastTypeConfig: Record<
  ToastType,
  {
    readonly icon: React.ReactNode;
    readonly border: string;
    readonly bg: string;
    readonly titleColor: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    border: 'border-emerald-500/40',
    bg: 'bg-slate-900/95 shadow-emerald-950/20',
    titleColor: 'text-emerald-200',
  },
  info: {
    icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
    border: 'border-cyan-500/40',
    bg: 'bg-slate-900/95 shadow-cyan-950/20',
    titleColor: 'text-cyan-200',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    border: 'border-amber-500/40',
    bg: 'bg-slate-900/95 shadow-amber-950/20',
    titleColor: 'text-amber-200',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    border: 'border-rose-500/40',
    bg: 'bg-slate-900/95 shadow-rose-950/20',
    titleColor: 'text-rose-200',
  },
};

interface ToastItemCardProps {
  readonly toast: ToastItem;
  readonly index: number;
  readonly isHovered: boolean;
  readonly onDismiss: (id: string) => void;
}

const ToastItemCard: React.FC<ToastItemCardProps> = ({
  toast: item,
  index,
  isHovered,
  onDismiss,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mount trigger for smooth entry transition
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const duration = item.duration ?? 3800;
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  const style = getToastStackStyles(index, isHovered, isMounted);
  const cfg = toastTypeConfig[item.type];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        transform: style.transform,
        opacity: style.opacity,
        zIndex: style.zIndex,
        transitionProperty: 'transform, opacity',
        transitionDuration: '280ms',
        transitionTimingFunction: 'var(--ease-out)',
      }}
      className={`absolute bottom-0 right-0 w-80 sm:w-96 p-3.5 rounded-2xl border backdrop-blur-xl shadow-xl flex items-start gap-3 pointer-events-auto ${cfg.bg} ${cfg.border}`}
    >
      <div className="mt-0.5">{cfg.icon}</div>
      <div className="flex-1 min-w-0 pr-1">
        <h4 className={`text-xs font-bold leading-tight truncate ${cfg.titleColor}`}>
          {item.title}
        </h4>
        {item.description && (
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors duration-140 ease-[var(--ease-out)] active:scale-[0.97]"
        title="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastStack: React.FC = () => {
  const { toasts, dismiss } = useToastStack();
  const [isHovered, setIsHovered] = useState(false);

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-none w-80 sm:w-96 h-16"
    >
      <div className="relative w-full h-full">
        {toasts.map((item, index) => (
          <ToastItemCard
            key={item.id}
            toast={item}
            index={index}
            isHovered={isHovered}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </aside>
  );
};
