import React, { useState, useEffect, useRef } from 'react';
import {
  NotificationService,
  SystemNotification,
  NotificationSeverity,
} from '../../core/notifications/NotificationService';
import { SHELL_Z_LAYERS } from '../../core/theme/tokens';
import {
  Info,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  X,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface ActiveToast extends SystemNotification {
  toastKey: string;
  createdAt: number;
}

export const NotificationToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const hoveredToastIdRef = useRef<string | null>(null);
  const notifService = NotificationService.getInstance();

  useEffect(() => {
    // Listen for new notifications
    const unsubscribe = notifService.subscribe((notifications) => {
      // Check focus mode
      const focusModeActive = localStorage.getItem('rocket_focus_assist') === 'true';
      if (focusModeActive) return; // Mute toasts if focus mode is active

      if (notifications.length > 0) {
        const latest = notifications[0];
        // Only trigger toast for unread notifications created recently
        setToasts((prev) => {
          if (prev.some((t) => t.id === latest.id)) return prev;
          // Play sound
          try {
            if (latest.severity === 'error') {
              soundEngine.playDelete();
            } else {
              soundEngine.playOpen();
            }
          } catch {
            // ignore
          }

          const newToast: ActiveToast = {
            ...latest,
            toastKey: `${latest.id}-${Date.now()}`,
            createdAt: Date.now(),
          };
          // Keep at most 4 toasts stacked
          return [newToast, ...prev.slice(0, 3)];
        });
      }
    });

    return () => unsubscribe();
  }, [notifService]);

  // Auto-dismiss timer
  useEffect(() => {
    if (toasts.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setToasts((prev) =>
        prev.filter((toast) => {
          if (hoveredToastIdRef.current === toast.id) {
            return true; // Pause while hovered
          }
          // Expire after 5 seconds
          return now - toast.createdAt < 5000;
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, [toasts]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    notifService.markAsRead(id);
  };

  const renderIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  const getBorderColor = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return 'border-emerald-500/30 shadow-emerald-950/40';
      case 'warning':
        return 'border-amber-500/30 shadow-amber-950/40';
      case 'error':
        return 'border-rose-500/30 shadow-rose-950/40';
      case 'info':
      default:
        return 'border-sky-500/30 shadow-sky-950/40';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{ zIndex: SHELL_Z_LAYERS.NOTIFICATION_TOAST }}
      className="fixed bottom-14 right-4 flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none select-none"
    >
      {toasts.map((toast) => {
        return (
          <div
            key={toast.toastKey}
            onMouseEnter={() => {
              hoveredToastIdRef.current = toast.id;
            }}
            onMouseLeave={() => {
              hoveredToastIdRef.current = null;
            }}
            className={`pointer-events-auto w-full p-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border shadow-2xl text-slate-100 transition-all duration-200 transform animate-in slide-in-from-right-4 fade-in ${getBorderColor(
              toast.severity
            )}`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5">{renderIcon(toast.severity)}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-white truncate">
                      {toast.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {toast.timestamp || 'Just now'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed break-words line-clamp-3">
                    {toast.body}
                  </p>

                  {/* Interactive Action Button */}
                  {toast.action && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          toast.action?.onClick();
                          dismissToast(toast.id);
                        }}
                        className="px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span>{toast.action.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
