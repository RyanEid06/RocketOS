import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Tag,
  Trash2,
  Check,
  AlertCircle,
  CalendarDays,
  List,
  Sparkles,
  Filter,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: 'dev' | 'meeting' | 'release' | 'personal';
  location?: string;
  description?: string;
  color: string;
}

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Rocket 2.1 ABI Freeze Review',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:30',
    category: 'release',
    location: 'Conference Room Alpha / Virtual',
    description: 'Final signoff on deterministic ARC promotion and stage0 C++ bootstrap.',
    color: '#38bdf8', // sky-400
  },
  {
    id: 'evt-2',
    title: 'LLVM 22.1.6 CodeGen Benchmark',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:15',
    category: 'dev',
    location: 'Lab Station 4',
    description: 'Verify vectorization and SIMD instruction throughput on x86_64 target.',
    color: '#a855f7', // purple-500
  },
  {
    id: 'evt-3',
    title: 'Sprint Retrospective & Roadmap',
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })(),
    startTime: '11:00',
    endTime: '12:00',
    category: 'meeting',
    location: 'Main Workspace',
    description: 'Review delivered desktop subsystems, wifi driver, and compiler tooling.',
    color: '#34d399', // emerald-400
  },
  {
    id: 'evt-4',
    title: 'Raylib 2D Graphics Testing',
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    })(),
    startTime: '16:00',
    endTime: '17:30',
    category: 'dev',
    location: 'Graphics Sandbox',
    description: 'Validate bezier curve rendering and window buffer swaps in native mode.',
    color: '#f59e0b', // amber-500
  },
  {
    id: 'evt-5',
    title: 'Community Dev Sync',
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      return d.toISOString().split('T')[0];
    })(),
    startTime: '17:00',
    endTime: '18:00',
    category: 'meeting',
    location: 'Discord Stage',
    description: 'Q&A session with external contributors and library developers.',
    color: '#ec4899', // pink-500
  },
];

export const CalendarApp: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state for creating event
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newCategory, setNewCategory] = useState<'dev' | 'meeting' | 'release' | 'personal'>('dev');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#38bdf8');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    soundEngine.play('click');
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    soundEngine.play('click');
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
    soundEngine.play('click');
  };

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      category: newCategory,
      location: newLocation.trim() || undefined,
      description: newDescription.trim() || undefined,
      color: newColor,
    };

    setEvents((prev) => [...prev, created]);
    setIsCreating(false);
    setSelectedEventId(created.id);
    setSelectedDate(newDate);
    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    soundEngine.play('click');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    if (selectedEventId === id) setSelectedEventId(null);
    soundEngine.playTrash();
  };

  // Filtered events
  const visibleEvents = events.filter((ev) => {
    if (filterCategory === 'all') return true;
    return ev.category === filterCategory;
  });

  const selectedDayEvents = visibleEvents.filter((ev) => ev.date === selectedDate);
  const activeEvent = events.find((ev) => ev.id === selectedEventId);

  // Generate calendar cells
  const calendarCells = [];
  // Prev month filler
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    calendarCells.push({
      dayNumber: dayNum,
      isCurrentMonth: false,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
    });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: true,
      dateStr,
    });
  }
  // Next month filler to complete 35 or 42 grid
  const remaining = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let i = 1; i <= remaining; i++) {
    const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateStr,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Rocket Calendar
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                v2.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">System schedule & events engine</p>
          </div>
        </div>

        {/* Center navigation */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-xs text-white min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            type="button"
            onClick={jumpToToday}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'month' ? 'bg-sky-500 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'agenda' ? 'bg-sky-500 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setNewDate(selectedDate);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Category Filters & Agenda Overview */}
        <div className="w-64 border-r border-white/10 bg-slate-900/40 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
          {/* Category Filter Pills */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              <span>Calendars</span>
            </div>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Categories', color: '#94a3b8' },
                { id: 'dev', label: 'Development', color: '#a855f7' },
                { id: 'release', label: 'Milestones & Release', color: '#38bdf8' },
                { id: 'meeting', label: 'Meetings & Syncs', color: '#34d399' },
                { id: 'personal', label: 'Personal & Reminders', color: '#f59e0b' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                    filterCategory === cat.id
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] opacity-60">
                    {cat.id === 'all'
                      ? events.length
                      : events.filter((e) => e.category === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Selected Day ({selectedDate})</span>
              <span className="text-sky-400 text-xs font-mono">{selectedDayEvents.length}</span>
            </div>
            {selectedDayEvents.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-500">
                No events on this day.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedEventId === ev.id
                        ? 'bg-white/15 border-sky-400 shadow-md'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ev.color }}
                      />
                      <span className="text-xs font-semibold text-white truncate">{ev.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>
                        {ev.startTime} - {ev.endTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Area: Calendar Grid or Agenda */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950/60 overflow-hidden">
          {viewMode === 'month' ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Grid Cells */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1.5 min-h-0">
                {calendarCells.map((cell, idx) => {
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDate;
                  const cellEvents = visibleEvents.filter((e) => e.date === cell.dateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(cell.dateStr);
                        soundEngine.play('click');
                      }}
                      className={`rounded-2xl border p-2 flex flex-col overflow-hidden transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-400/80 bg-sky-500/10 shadow-lg'
                          : cell.isCurrentMonth
                          ? 'border-white/5 bg-slate-900/50 hover:bg-slate-800/60'
                          : 'border-white/[0.02] bg-slate-950/30 opacity-40 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 shrink-0">
                        <span
                          className={`text-xs font-mono font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                            isToday
                              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40'
                              : isSelected
                              ? 'text-sky-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cellEvents.length > 0 && (
                          <span className="text-[9px] font-mono font-bold px-1 rounded-full bg-white/10 text-slate-400">
                            {cellEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips inside cell */}
                      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                        {cellEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventId(ev.id);
                              setSelectedDate(cell.dateStr);
                            }}
                            className="px-1.5 py-0.5 rounded-lg text-[10px] font-medium truncate flex items-center gap-1 transition-opacity hover:opacity-90"
                            style={{
                              backgroundColor: `${ev.color}25`,
                              color: '#ffffff',
                              borderLeft: `3px solid ${ev.color}`,
                            }}
                            title={`${ev.title} (${ev.startTime})`}
                          >
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda View */
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                All Scheduled Events
              </h2>
              <div className="space-y-2.5">
                {visibleEvents
                  .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
                  .map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-sky-400/50 transition-all flex items-start justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <div>
                          <div className="font-bold text-sm text-white">{ev.title}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                            <span className="font-mono text-sky-400">{ev.date}</span>
                            <span>•</span>
                            <span className="font-mono">
                              {ev.startTime} - {ev.endTime}
                            </span>
                            {ev.location && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {ev.location}
                                </span>
                              </>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(ev.id);
                        }}
                        className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Detail Panel (If an event is selected) */}
        {activeEvent && (
          <div className="w-72 border-l border-white/10 bg-slate-900/60 p-5 flex flex-col justify-between shrink-0 animate-in slide-in-from-right-4 duration-200">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <span
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${activeEvent.color}30`,
                    color: activeEvent.color,
                  }}
                >
                  {activeEvent.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{activeEvent.title}</h3>
                <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {activeEvent.date} ({activeEvent.startTime} - {activeEvent.endTime})
                  </span>
                </div>
              </div>

              {activeEvent.location && (
                <div className="text-xs text-slate-300 flex items-center gap-1.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{activeEvent.location}</span>
                </div>
              )}

              {activeEvent.description && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Details
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                    {activeEvent.description}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleDeleteEvent(activeEvent.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Event</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Event Modal Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                Schedule New Event
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architecture Sync"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
                  >
                    <option value="dev">Development</option>
                    <option value="release">Milestones</option>
                    <option value="meeting">Meeting</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room Beta"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes, agenda, or link..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  {['#38bdf8', '#a855f7', '#34d399', '#f59e0b', '#ec4899', '#64748b'].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          newColor === color ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
