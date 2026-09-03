import React from 'react';
import { Bell, Check, Trash2, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import {
  notificationService,
  SystemNotification,
  NotificationSeverity,
} from '../../core/notifications/NotificationService';

interface NotificationFlyoutProps {
  isOpen: boolean;
  notifications: SystemNotification[];
  onClose: () => void;
}

export const NotificationFlyout: React.FC<NotificationFlyoutProps> = ({
  isOpen,
  notifications,
  onClose,
}) => {
  if (!isOpen) return null;

  const getSeverityIcon = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 right-16 z-50 w-80 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-4 text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-xs text-white">
          <Bell className="w-4 h-4 text-sky-400" />
          <span>Notifications ({notifications.length})</span>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={() => notificationService.clear()}
            className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No new notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-2xl border transition-all text-xs space-y-1 ${
                notif.isRead
                  ? 'bg-white/5 border-white/5 text-slate-300'
                  : 'bg-sky-500/10 border-sky-400/30 text-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold truncate">
                  {getSeverityIcon(notif.severity)}
                  <span className="truncate">{notif.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {notif.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pl-6">{notif.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
