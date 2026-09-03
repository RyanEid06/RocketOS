import React, { useState, useEffect, useRef } from 'react';
import { NoteItem, TodoTask, NoteColor } from '../../types';
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
  FileText,
  Save,
  FolderOpen,
  Download,
  Share2,
  FileCheck,
  History,
  AlertCircle
} from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { CrashRecoveryService } from '../../core/recovery/CrashRecoveryService';
import { AppSecurityManager } from '../../core/apps/AppSecurityManager';

interface ExtendedNoteItem extends NoteItem {
  filePath?: string;
  isDirty?: boolean;
}

export interface ColorTheme {
  id: string;
  name: string;
  dotBg: string;
  ringClass: string;
  indicator: string;
  sidebarItemActive: string;
  sidebarBadge: string;
  topStrip: string;
  headerBadge: string;
  accentText: string;
  cardBorder: string;
  cardBg: string;
  cardHeaderGlow: string;
  checkboxCheck: string;
  focusBorder: string;
}

export const NOTE_COLOR_PRESETS: { id: NoteColor; name: string; dotBg: string }[] = [
  { id: 'sky', name: 'Sky Azure', dotBg: 'bg-sky-400' },
  { id: 'emerald', name: 'Emerald Mint', dotBg: 'bg-emerald-400' },
  { id: 'amber', name: 'Amber Gold', dotBg: 'bg-amber-400' },
  { id: 'indigo', name: 'Indigo Iris', dotBg: 'bg-indigo-400' },
  { id: 'rose', name: 'Rose Coral', dotBg: 'bg-rose-400' },
  { id: 'slate', name: 'Slate Platinum', dotBg: 'bg-slate-300' },
];

export const getNoteColorTheme = (color?: string): ColorTheme => {
  switch (color) {
    case 'emerald':
      return {
        id: 'emerald',
        name: 'Emerald Mint',
        dotBg: 'bg-emerald-400',
        ringClass: 'ring-emerald-400/50',
        indicator: 'bg-emerald-400',
        sidebarItemActive: 'bg-emerald-500/15 border-emerald-400/40 text-white shadow-emerald-950/40',
        sidebarBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        topStrip: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent',
        headerBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        accentText: 'text-emerald-400',
        cardBorder: 'border-emerald-500/30',
        cardBg: 'bg-gradient-to-b from-emerald-950/20 to-slate-900/60',
        cardHeaderGlow: 'text-emerald-400',
        checkboxCheck: 'text-emerald-400',
        focusBorder: 'focus:border-emerald-400',
      };
    case 'amber':
    case 'yellow':
      return {
        id: 'amber',
        name: 'Amber Gold',
        dotBg: 'bg-amber-400',
        ringClass: 'ring-amber-400/50',
        indicator: 'bg-amber-400',
        sidebarItemActive: 'bg-amber-500/15 border-amber-400/40 text-white shadow-amber-950/40',
        sidebarBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        topStrip: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-transparent',
        headerBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        accentText: 'text-amber-400',
        cardBorder: 'border-amber-500/30',
        cardBg: 'bg-gradient-to-b from-amber-950/20 to-slate-900/60',
        cardHeaderGlow: 'text-amber-400',
        checkboxCheck: 'text-amber-400',
        focusBorder: 'focus:border-amber-400',
      };
    case 'indigo':
    case 'purple':
      return {
        id: 'indigo',
        name: 'Indigo Iris',
        dotBg: 'bg-indigo-400',
        ringClass: 'ring-indigo-400/50',
        indicator: 'bg-indigo-400',
        sidebarItemActive: 'bg-indigo-500/15 border-indigo-400/40 text-white shadow-indigo-950/40',
        sidebarBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        topStrip: 'bg-gradient-to-r from-indigo-500 via-violet-400 to-transparent',
        headerBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        accentText: 'text-indigo-400',
        cardBorder: 'border-indigo-500/30',
        cardBg: 'bg-gradient-to-b from-indigo-950/20 to-slate-900/60',
        cardHeaderGlow: 'text-indigo-400',
        checkboxCheck: 'text-indigo-400',
        focusBorder: 'focus:border-indigo-400',
      };
    case 'rose':
      return {
        id: 'rose',
        name: 'Rose Coral',
        dotBg: 'bg-rose-400',
        ringClass: 'ring-rose-400/50',
        indicator: 'bg-rose-400',
        sidebarItemActive: 'bg-rose-500/15 border-rose-400/40 text-white shadow-rose-950/40',
        sidebarBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        topStrip: 'bg-gradient-to-r from-rose-500 via-pink-400 to-transparent',
        headerBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        accentText: 'text-rose-400',
        cardBorder: 'border-rose-500/30',
        cardBg: 'bg-gradient-to-b from-rose-950/20 to-slate-900/60',
        cardHeaderGlow: 'text-rose-400',
        checkboxCheck: 'text-rose-400',
        focusBorder: 'focus:border-rose-400',
      };
    case 'slate':
      return {
        id: 'slate',
        name: 'Slate Platinum',
        dotBg: 'bg-slate-300',
        ringClass: 'ring-slate-300/50',
        indicator: 'bg-slate-300',
        sidebarItemActive: 'bg-slate-500/20 border-slate-300/40 text-white shadow-slate-950/40',
        sidebarBadge: 'bg-slate-500/20 text-slate-200 border-slate-500/30',
        topStrip: 'bg-gradient-to-r from-slate-300 via-slate-400 to-transparent',
        headerBadge: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
        accentText: 'text-slate-300',
        cardBorder: 'border-slate-500/30',
        cardBg: 'bg-gradient-to-b from-slate-800/30 to-slate-900/60',
        cardHeaderGlow: 'text-slate-300',
        checkboxCheck: 'text-slate-200',
        focusBorder: 'focus:border-slate-300',
      };
    case 'sky':
    default:
      return {
        id: 'sky',
        name: 'Sky Azure',
        dotBg: 'bg-sky-400',
        ringClass: 'ring-sky-400/50',
        indicator: 'bg-sky-400',
        sidebarItemActive: 'bg-sky-500/15 border-sky-400/40 text-white shadow-sky-950/40',
        sidebarBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        topStrip: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-transparent',
        headerBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        accentText: 'text-sky-400',
        cardBorder: 'border-sky-500/30',
        cardBg: 'bg-gradient-to-b from-sky-950/20 to-slate-900/60',
        cardHeaderGlow: 'text-sky-400',
        checkboxCheck: 'text-sky-400',
        focusBorder: 'focus:border-sky-400',
      };
  }
};

const NOTES_STORAGE_KEY = 'rocket_notes_app_data_v2';

const DEFAULT_STARTER_NOTES: ExtendedNoteItem[] = [
  {
    id: 'note-1',
    title: 'RocketOS Kernel Roadmap & To-Do',
    category: 'todo',
    color: 'sky',
    updatedAt: 'Today, 14:10',
    filePath: '/home/ryan/Documents/kernel_roadmap.rnote',
    isDirty: false,
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
    filePath: '/home/ryan/Documents/rocket_syntax.rnote',
    isDirty: false,
    content: `struct Vector3:\n    x: Float\n    y: Float\n    z: Float\n\nfn magnitude(v: Vector3) -> Float:\n    return math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z)\n\nZero-cost abstractions with explicit memory ownership.`,
    tasks: [
      { id: 't7', text: 'Finalize match pattern exhaustiveness checker', completed: true },
      { id: 't8', text: 'Add SIMD vector intrinsics to stdlib', completed: false },
    ],
  },
  {
    id: 'note-3',
    title: 'Daily Meeting & Personal Scratchpad',
    category: 'notes',
    color: 'amber',
    updatedAt: 'Sep 3',
    filePath: '/home/ryan/Documents/scratchpad.rnote',
    isDirty: false,
    content: 'Remember to verify the x86_64 interrupts IDT table and timer frequency in QEMU test harness.',
    tasks: [
      { id: 't9', text: 'Review APIC timer calibrate register', completed: true },
      { id: 't10', text: 'Benchmark context switch latency (target < 850 cycles)', completed: false },
    ],
  },
];

interface NotesAppProps {
  initialFilePath?: string;
  onSaveFile?: (path: string, content: string) => void;
}

export const NotesApp: React.FC<NotesAppProps> = ({ initialFilePath }) => {
  const [notes, setNotes] = useState<ExtendedNoteItem[]>(() => {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_STARTER_NOTES;
  });

  const [activeNoteId, setActiveNoteId] = useState<string>('note-1');
  const [filterCategory, setFilterCategory] = useState<'all' | 'todo' | 'notes' | 'ideas'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newTaskInput, setNewTaskInput] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [saveAsPath, setSaveAsPath] = useState<string>('/home/ryan/Documents/new_note.rnote');
  const [showOpenModal, setShowOpenModal] = useState<boolean>(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([
    '/home/ryan/Documents/kernel_roadmap.rnote',
    '/home/ryan/Documents/rocket_syntax.rnote',
    '/home/ryan/Documents/scratchpad.rnote',
  ]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];
  const activeTheme = getNoteColorTheme(activeNote?.color);

  // If initialFilePath is provided, attempt to load it from RocketFS
  useEffect(() => {
    if (initialFilePath) {
      try {
        const rfs = RocketFS.getInstance();
        const readRes = rfs.readFile(initialFilePath);
        if (readRes.success && readRes.data) {
          const content = readRes.data;
          if (initialFilePath.endsWith('.rnote') && content.startsWith('{')) {
            try {
              const parsed = JSON.parse(content);
              const loaded: ExtendedNoteItem = {
                id: `note-fs-${Date.now()}`,
                title: parsed.title || 'Loaded Note',
                category: parsed.category || 'notes',
                color: parsed.color || 'sky',
                updatedAt: 'Just loaded',
                filePath: initialFilePath,
                isDirty: false,
                content: parsed.content || '',
                tasks: parsed.tasks || [],
              };
              setNotes((prev) => [loaded, ...prev]);
              setActiveNoteId(loaded.id);
              return;
            } catch {
              // fallback to raw text
            }
          }
          const loadedText: ExtendedNoteItem = {
            id: `note-fs-${Date.now()}`,
            title: initialFilePath.split('/').pop() || 'Loaded Document',
            category: 'notes',
            color: 'sky',
            updatedAt: 'Just loaded',
            filePath: initialFilePath,
            isDirty: false,
            content: content,
            tasks: [],
          };
          setNotes((prev) => [loadedText, ...prev]);
          setActiveNoteId(loadedText.id);
        }
      } catch (err) {
        console.warn('Failed to load initial file in NotesApp:', err);
      }
    }
  }, [initialFilePath]);

  // Persist notes changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  // Debounced Autosave / Crash Recovery Snapshot
  useEffect(() => {
    if (!activeNote) return;
    const timer = setTimeout(() => {
      if (activeNote.isDirty) {
        const json = formatRNoteJSON(activeNote);
        CrashRecoveryService.getInstance().recordDraftSnapshot(
          'notes',
          'rnote',
          activeNote.filePath || `/home/ryan/Documents/${activeNote.title}.rnote`,
          json
        );
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeNote]);

  const filteredNotes = notes.filter((n) => {
    const matchesCategory = filterCategory === 'all' || n.category === filterCategory;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateNote = () => {
    const newNote: ExtendedNoteItem = {
      id: `note-${Date.now()}`,
      title: 'New Untitled Note',
      category: filterCategory === 'all' ? 'notes' : filterCategory,
      color: 'sky',
      updatedAt: 'Just now',
      filePath: `/home/ryan/Documents/note_${Date.now()}.rnote`,
      isDirty: true,
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

  const updateActiveNote = (fields: Partial<ExtendedNoteItem>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...fields, isDirty: true, updatedAt: 'Just now' } : n))
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

  // Format note according to rocket/apps/notes.rocket serialization
  const formatRNoteJSON = (note: ExtendedNoteItem): string => {
    return JSON.stringify(
      {
        format: 'rocket-note-v1',
        id: note.id,
        title: note.title,
        category: note.category,
        color: note.color,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        content: note.content,
        pinned: false,
        tasks: note.tasks.map((t) => ({ id: t.id, text: t.text, completed: t.completed })),
      },
      null,
      2
    );
  };

  // Export to Markdown
  const exportToMarkdown = (note: ExtendedNoteItem): string => {
    let out = `# ${note.title}\n\n> Category: ${note.category} | Modified: ${note.updatedAt}\n\n${note.content}\n\n`;
    if (note.tasks.length > 0) {
      out += '## Tasks & Checklist\n\n';
      note.tasks.forEach((t) => {
        out += `- [${t.completed ? 'x' : ' '}] ${t.text}\n`;
      });
    }
    return out;
  };

  // Export to Plain Text
  const exportToPlainText = (note: ExtendedNoteItem): string => {
    let out = `${note.title.toUpperCase()}\n========================================\n\n${note.content}\n\n`;
    if (note.tasks.length > 0) {
      out += 'TASKS / CHECKLIST:\n';
      note.tasks.forEach((t) => {
        out += `  [${t.completed ? 'DONE' : 'TODO'}] ${t.text}\n`;
      });
    }
    return out;
  };

  // Save to RocketFS
  const handleSave = () => {
    if (!activeNote) return;
    const targetPath = activeNote.filePath || `/home/ryan/Documents/${activeNote.title.replace(/\s+/g, '_')}.rnote`;

    // Validate security capability
    const secResult = AppSecurityManager.getInstance().validateFilesystem('notes', targetPath, true);
    if (secResult.type !== 'GRANTED') {
      setSaveStatus(`Access Denied: ${secResult.type}`);
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    try {
      const rfs = RocketFS.getInstance();
      const payload = formatRNoteJSON(activeNote);
      rfs.writeFile(targetPath, payload);

      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNote.id ? { ...n, filePath: targetPath, isDirty: false } : n
        )
      );

      // Clear draft snapshot since file is cleanly committed
      CrashRecoveryService.getInstance().clearDraftSnapshot('notes', targetPath);

      if (!recentFiles.includes(targetPath)) {
        setRecentFiles([targetPath, ...recentFiles.slice(0, 5)]);
      }

      setSaveStatus('Saved to RocketFS!');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      setSaveStatus('Save failed: ' + (err instanceof Error ? err.message : String(err)));
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSaveAsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAsPath.trim() || !activeNote) return;
    const target = saveAsPath.trim();

    try {
      const rfs = RocketFS.getInstance();
      const payload = formatRNoteJSON(activeNote);
      rfs.writeFile(target, payload);

      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNote.id ? { ...n, filePath: target, isDirty: false } : n
        )
      );

      setShowSaveAsModal(false);
      setSaveStatus('Saved As: ' + target);
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      setSaveStatus('Save As failed: ' + String(err));
    }
  };

  // Export to External Downloads
  const handleExportDownload = (type: 'md' | 'txt' | 'rnote') => {
    if (!activeNote) return;
    let content = '';
    let ext = 'txt';
    let mime = 'text/plain';

    if (type === 'md') {
      content = exportToMarkdown(activeNote);
      ext = 'md';
      mime = 'text/markdown';
    } else if (type === 'txt') {
      content = exportToPlainText(activeNote);
      ext = 'txt';
      mime = 'text/plain';
    } else {
      content = formatRNoteJSON(activeNote);
      ext = 'rnote';
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveStatus(`Exported .${ext}!`);
    setTimeout(() => setSaveStatus(null), 2500);
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
              <span>Notes & Tasks</span>
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

        {/* Category Filter Pills */}
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
            const itemTheme = getNoteColorTheme(n.color);
            return (
              <div
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={`p-2.5 rounded-xl cursor-pointer transition-all border group relative flex flex-col gap-1 ${
                  isSelected
                    ? `${itemTheme.sidebarItemActive} shadow-lg ring-1 ring-white/10`
                    : 'bg-black/20 hover:bg-white/5 border-transparent text-slate-300'
                }`}
              >
                {/* Visual color indicator strip on left edge */}
                <div
                  className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all ${
                    itemTheme.indicator
                  } ${isSelected ? 'opacity-100 scale-y-100' : 'opacity-40 group-hover:opacity-80'}`}
                />

                <div className="flex items-center justify-between pl-1">
                  <div className="flex items-center gap-1.5 truncate max-w-[145px]">
                    {n.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                    <span className="font-semibold text-xs truncate">{n.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pl-1">
                  <span className="truncate">{n.updatedAt}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] px-1 py-0.2 rounded font-medium border ${itemTheme.sidebarBadge}`}>
                      {itemTheme.name.split(' ')[0]}
                    </span>
                    {n.tasks.length > 0 && (
                      <span className="font-mono text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                        {completedCount}/{n.tasks.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Locations Drawer */}
        <div className="p-2 border-t border-white/10 bg-black/20 text-[10px] text-slate-400">
          <div className="flex items-center gap-1 mb-1 font-semibold text-slate-300">
            <History className="w-3 h-3 text-sky-400" />
            <span>Recent RocketFS Documents</span>
          </div>
          <div className="space-y-0.5 truncate">
            {recentFiles.slice(0, 3).map((rf) => (
              <div key={rf} className="truncate text-slate-500 hover:text-slate-300 cursor-pointer" title={rf}>
                • {rf.split('/').pop()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Editor Area */}
      {activeNote && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* Top visual accent strip matching note color */}
          <div className={`h-1 w-full shrink-0 ${activeTheme.topStrip}`} />

          {/* Note Header Toolbar */}
          <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => updateActiveNote({ title: e.target.value })}
                className={`text-sm font-bold bg-transparent outline-none text-white border-b border-transparent ${activeTheme.focusBorder} flex-1`}
                placeholder="Note Title"
              />
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${activeTheme.headerBadge}`}>
                {activeTheme.name}
              </span>
              {activeNote.isDirty && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  DIRTY *
                </span>
              )}
            </div>

            {/* Actions: Save, Save As, Export, Color */}
            <div className="flex items-center gap-2">
              {saveStatus && (
                <span className="text-[11px] text-emerald-400 font-mono animate-pulse flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saveStatus}
                </span>
              )}

              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] cursor-pointer shadow-sm transition-all"
                title="Save into RocketFS"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                onClick={() => {
                  setSaveAsPath(activeNote.filePath || `/home/ryan/Documents/${activeNote.title.replace(/\s+/g, '_')}.rnote`);
                  setShowSaveAsModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer border border-white/10 transition-all"
                title="Save As..."
              >
                <span>Save As</span>
              </button>

              {/* Export menu */}
              <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                <button
                  onClick={() => handleExportDownload('md')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer border border-white/10"
                  title="Export to Markdown (.md)"
                >
                  .md
                </button>
                <button
                  onClick={() => handleExportDownload('txt')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer border border-white/10"
                  title="Export to Plain Text (.txt)"
                >
                  .txt
                </button>
              </div>

              {/* Color Preset Palette */}
              <div className="flex items-center gap-1.5 border-l border-white/10 pl-2.5">
                {NOTE_COLOR_PRESETS.map((preset) => {
                  const isActive = (activeNote.color || 'sky') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => updateActiveNote({ color: preset.id })}
                      className={`w-4 h-4 rounded-full cursor-pointer transition-all ${
                        preset.dotBg
                      } ${
                        isActive
                          ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md'
                          : 'opacity-50 hover:opacity-100 hover:scale-110'
                      }`}
                      title={`${preset.name} theme`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subtitle / File Path */}
          <div className="px-4 py-1 bg-black/40 border-b border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono truncate">{activeNote.filePath || 'Not yet saved to disk'}</span>
            <span>RocketFS VFS Synced</span>
          </div>

          {/* Editor Workspace */}
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {/* Interactive To-Do List Section */}
            <div className={`p-4 rounded-2xl ${activeTheme.cardBg} border ${activeTheme.cardBorder} shadow-lg space-y-3 transition-all`}>
              <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CheckSquare className={`w-4 h-4 ${activeTheme.accentText}`} />
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
                        <CheckSquare className={`w-4 h-4 ${activeTheme.checkboxCheck} shrink-0`} />
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
                  className={`flex-1 px-3 py-2 bg-black/40 rounded-xl border border-white/10 text-xs text-white outline-none ${activeTheme.focusBorder} placeholder:text-slate-500`}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white font-semibold text-xs cursor-pointer border border-white/10 transition-all"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Note Content Body */}
            <div className={`p-4 rounded-2xl ${activeTheme.cardBg} border ${activeTheme.cardBorder} shadow-lg space-y-2 transition-all`}>
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <FileText className={`w-4 h-4 ${activeTheme.accentText}`} />
                <span>Extended Notes & Documentation</span>
              </div>
              <textarea
                value={activeNote.content}
                onChange={(e) => updateActiveNote({ content: e.target.value })}
                rows={8}
                placeholder="Write detailed notes, code snippets, or thoughts..."
                className={`w-full bg-black/30 p-3 rounded-xl border border-white/5 text-xs text-slate-200 font-mono outline-none ${activeTheme.focusBorder} resize-none leading-relaxed`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save As Modal Dialog */}
      {showSaveAsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">Save Note to RocketFS</h3>
            <p className="text-slate-400 text-xs">Specify the target VFS path for this document:</p>
            <form onSubmit={handleSaveAsSubmit} className="space-y-4">
              <input
                type="text"
                value={saveAsPath}
                onChange={(e) => setSaveAsPath(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-400 outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveAsModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs shadow-md"
                >
                  Save As
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
