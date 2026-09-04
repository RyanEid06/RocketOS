import React from 'react';
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Moon,
} from 'lucide-react';
import {
  notificationService,
  SystemNotification,
  NotificationSeverity,
} from '../../core/notifications/NotificationService';
import { soundEngine } from '../../utils/audio';

interface NotificationFlyoutProps {
  isOpen: boolean;
  notifications: SystemNotification[];
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  onClose: () => void;
}

export const NotificationFlyout: React.FC<NotificationFlyoutProps> = ({
  isOpen,
  notifications,
  focusMode = false,
  onToggleFocusMode,
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
      className="absolute bottom-16 right-16 z-50 w-84 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-4 text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-xs text-white">
          <Bell className="w-4 h-4 text-sky-400" />
          <span>Notification Center</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
            {notifications.length}
          </span>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={() => {
              notificationService.clear();
              soundEngine.play('click');
            }}
            className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Focus Mode Banner / Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-white/5 text-xs">
        <div className="flex items-center gap-2">
          {focusMode ? (
            <BellOff className="w-4 h-4 text-purple-400" />
          ) : (
            <Bell className="w-4 h-4 text-slate-400" />
          )}
          <div>
            <div className="font-semibold text-xs text-white">Do Not Disturb</div>
            <div className="text-[10px] text-slate-400">
              {focusMode ? 'Muting toast banners' : 'Standard alert delivery'}
            </div>
          </div>
        </div>

        {onToggleFocusMode && (
          <button
            type="button"
            onClick={() => {
              onToggleFocusMode();
              soundEngine.play('click');
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              focusMode
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/10 text-slate-300 hover:bg-white/15'
            }`}
          >
            {focusMode ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No unread notifications
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
              <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">{notif.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
