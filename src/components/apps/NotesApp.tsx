import React, { useState } from 'react';
import { NoteItem, TodoTask } from '../../types';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Search,
  BookOpen,
  Tag,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  ListTodo,
  FileText
} from 'lucide-react';

export const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: 'note-1',
      title: 'RocketOS Kernel Roadmap & To-Do',
      category: 'todo',
      color: 'sky',
      updatedAt: 'Today, 14:10',
      content: 'Primary architectural goals for the Long Mode microkernel release.',
      tasks: [
        { id: 't1', text: 'Initialize Stage-3 Bootloader with PML4 4-level paging', completed: true },
        { id: 't2', text: 'Build Raylib safe primitive 2D drawing adapter', completed: true },
        { id: 't3', text: 'Implement sleek liquid glass compositor & taskbar', completed: true },
        { id: 't4', text: 'Support Recycle Bin with restore and permanent deletion', completed: true },
        { id: 't5', text: 'Refine rocketc borrowing & lifetime checks in LLVM backend', completed: false },
        { id: 't6', text: 'Add virtio-gpu hardware acceleration driver', completed: false },
      ],
    },
    {
      id: 'note-2',
      title: 'Rocket Language Syntax Ideas',
      category: 'ideas',
      color: 'emerald',
      updatedAt: 'Yesterday',
      content: `struct Vector3:\n    x: f32\n    y: f32\n    z: f32\n\nfn magnitude(v: Vector3) -> f32:\n    return sqrt(v.x*v.x + v.y*v.y + v.z*v.z)\n\nZero-cost abstractions with explicit memory ownership.`,
      tasks: [
        { id: 't7', text: 'Finalize match pattern exhaustiveness checker', completed: true },
        { id: 't8', text: 'Add SIMD vector intrinsics to stdlib', completed: false },
      ],
    },
    {
      id: 'note-3',
      title: 'Daily Meeting & Personal Scratchpad',
      category: 'notes',
      color: 'yellow',
      updatedAt: 'Sep 3',
      content: 'Remember to verify the x86_64 interrupts IDT table and timer frequency in QEMU test harness.',
      tasks: [
        { id: 't9', text: 'Review APIC timer calibrate register', completed: true },
        { id: 't10', text: 'Benchmark context switch latency (target < 850 cycles)', completed: false },
      ],
    },
  ]);

  const [activeNoteId, setActiveNoteId] = useState<string>('note-1');
  const [filterCategory, setFilterCategory] = useState<'all' | 'todo' | 'notes' | 'ideas'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newTaskInput, setNewTaskInput] = useState<string>('');

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const filteredNotes = notes.filter((n) => {
    const matchesCategory = filterCategory === 'all' || n.category === filterCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: 'New Untitled Note',
      category: filterCategory === 'all' ? 'notes' : filterCategory,
      color: 'sky',
      updatedAt: 'Just now',
      content: 'Write your thoughts or plans here...',
      tasks: [
        { id: `t-${Date.now()}-1`, text: 'First to-do item', completed: false },
      ],
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) return;
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (activeNoteId === id) {
      setActiveNoteId(next[0].id);
    }
  };

  const updateActiveNote = (fields: Partial<NoteItem>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...fields, updatedAt: 'Just now' } : n))
    );
  };

  const handleToggleTask = (taskId: string) => {
    if (!activeNote) return;
    const updatedTasks = activeNote.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateActiveNote({ tasks: updatedTasks });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim() || !activeNote) return;
    const newTask: TodoTask = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      completed: false,
    };
    updateActiveNote({ tasks: [...activeNote.tasks, newTask] });
    setNewTaskInput('');
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeNote) return;
    const updatedTasks = activeNote.tasks.filter((t) => t.id !== taskId);
    updateActiveNote({ tasks: updatedTasks });
  };

  const colorBadgeClasses = {
    yellow: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    sky: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
    purple: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    rose: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  };

  return (
    <div id="notes-app" className="flex h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-900/90 border-r border-white/10 flex flex-col shrink-0">
        {/* Header & Search */}
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <ListTodo className="w-4 h-4 text-sky-400" />
              <span>Notes & To-Do</span>
            </div>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-2 py-1.5 bg-black/40 rounded-xl border border-white/10 text-[11px] text-slate-200 outline-none focus:border-sky-400 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 p-2 border-b border-white/10 overflow-x-auto text-[10px]">
          {(['all', 'todo', 'notes', 'ideas'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer shrink-0 ${
                filterCategory === cat
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.map((n) => {
            const isSelected = n.id === activeNoteId;
            const completedCount = n.tasks.filter((t) => t.completed).length;
            return (
              <div
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={`p-2.5 rounded-xl cursor-pointer transition-all border group ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400/40 text-white shadow-md'
                    : 'bg-black/20 hover:bg-white/5 border-transparent text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs truncate max-w-[150px]">{n.title}</span>
                  <button
                    onClick={(e) => handleDeleteNote(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{n.updatedAt}</span>
                  {n.tasks.length > 0 && (
                    <span className="font-mono text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      {completedCount}/{n.tasks.length} done
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Editor Area */}
      {activeNote && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Note Header Toolbar */}
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              className="text-base font-bold bg-transparent outline-none text-white border-b border-transparent focus:border-sky-400 flex-1 min-w-[200px]"
              placeholder="Note Title"
            />

            {/* Color Tag Selector */}
            <div className="flex items-center gap-1.5">
              {(['yellow', 'emerald', 'sky', 'purple', 'rose'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => updateActiveNote({ color: c })}
                  className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                    activeNote.color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110 opacity-70'
                  } ${
                    c === 'yellow'
                      ? 'bg-amber-400'
                      : c === 'emerald'
                      ? 'bg-emerald-400'
                      : c === 'sky'
                      ? 'bg-sky-400'
                      : c === 'purple'
                      ? 'bg-purple-400'
                      : 'bg-rose-400'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Editor Workspace */}
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {/* Interactive To-Do List Section */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Checklist & Tasks</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeNote.tasks.filter((t) => t.completed).length} of {activeNote.tasks.length} Completed
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-1.5">
                {activeNote.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-white/5 group transition-colors"
                  >
                    <div
                      onClick={() => handleToggleTask(task.id)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                      )}
                      <span
                        className={`text-xs select-text ${
                          task.completed
                            ? 'line-through text-slate-500'
                            : 'text-slate-200'
                        }`}
                      >
                        {task.text}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Task Input */}
              <form onSubmit={handleAddTask} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  placeholder="Add a new task... (press Enter)"
                  className="flex-1 px-3 py-2 bg-black/40 rounded-xl border border-white/10 text-xs text-white outline-none focus:border-sky-400 placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white font-semibold text-xs cursor-pointer border border-white/10 transition-all"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Note Markdown / Content Body */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Extended Notes & Details</span>
              </div>
              <textarea
                value={activeNote.content}
                onChange={(e) => updateActiveNote({ content: e.target.value })}
                rows={7}
                placeholder="Write detailed notes, code snippets, or thoughts..."
                className="w-full bg-black/30 p-3 rounded-xl border border-white/5 text-xs text-slate-200 font-mono outline-none focus:border-sky-400 resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
