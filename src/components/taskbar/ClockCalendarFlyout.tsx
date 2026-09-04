import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Sliders } from 'lucide-react';
import { SystemSettings } from '../../types';

interface ClockCalendarFlyoutProps {
  isOpen: boolean;
  timeStr: string;
  dateStr: string;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onOpenSettings: () => void;
  onOpenCalendar?: () => void;
}

export const ClockCalendarFlyout: React.FC<ClockCalendarFlyoutProps> = ({
  isOpen,
  timeStr,
  dateStr,
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenCalendar,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 right-4 z-50 w-[340px] max-w-[90vw] bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-5 text-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      {/* Big Digital Clock */}
      <div className="pb-3 border-b border-white/10">
        <div className="font-mono text-3xl font-bold text-white tracking-tight">{timeStr}</div>
        <div className="text-xs text-sky-400 font-medium mt-1">{dateStr}</div>
      </div>

      {/* Calendar Month Navigation */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-white">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 text-center text-xs gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="py-1.5 opacity-0" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === dayNum;

          return (
            <div
              key={`day-${dayNum}`}
              className={`py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                isToday
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30'
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      {/* Quick Time Toggles & Launch Calendar */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                timeFormat: settings.timeFormat === '12h' ? '24h' : '12h',
              })
            }
            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[10px] transition-colors cursor-pointer"
          >
            {settings.timeFormat.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ showSeconds: !settings.showSeconds })}
            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[10px] transition-colors cursor-pointer"
          >
            Sec: {settings.showSeconds ? 'ON' : 'OFF'}
          </button>
        </div>

        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-colors cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Open Calendar</span>
          </button>
        )}
      </div>
    </div>
  );
};
