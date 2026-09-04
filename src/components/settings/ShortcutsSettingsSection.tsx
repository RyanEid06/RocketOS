import React, { useState, useEffect } from 'react';
import {
  ShortcutManager,
  ShortcutDefinition,
} from '../../core/shortcuts/ShortcutManager';
import {
  Keyboard,
  RotateCcw,
  Search,
  Edit2,
  Check,
  AlertTriangle,
  X,
  Filter,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

export const ShortcutsSettingsSection: React.FC = () => {
  const shortcutMgr = ShortcutManager.getInstance();
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(() =>
    shortcutMgr.getShortcuts()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    return shortcutMgr.subscribe(() => {
      setShortcuts(shortcutMgr.getShortcuts());
    });
  }, [shortcutMgr]);

  const categories = ['All', 'System', 'Window Management', 'Workspace', 'File Explorer'];

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesCategory =
      activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.currentKey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStartEdit = (shortcut: ShortcutDefinition) => {
    setEditingId(shortcut.id);
    setEditingKey(shortcut.currentKey);
    setConflictError(null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const result = shortcutMgr.updateShortcut(editingId, editingKey);
    if (result.success) {
      soundEngine.playSuccess();
      setEditingId(null);
      setEditingKey('');
      setConflictError(null);
    } else {
      soundEngine.playDelete();
      setConflictError(
        `Shortcut combination already in use by: "${result.conflictWith}"`
      );
    }
  };

  const handleResetDefaults = () => {
    shortcutMgr.resetToDefaults();
    soundEngine.playSuccess();
    setEditingId(null);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-sky-400" />
            <span>Keyboard Shortcuts & Hotkeys</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            View and customize system-wide keybindings, window snapping, and desktop navigation shortcuts.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Defaults</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shortcuts or keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Shortcuts List Table */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
        {filteredShortcuts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No keyboard shortcuts match your search.
          </div>
        ) : (
          filteredShortcuts.map((s) => {
            const isEditing = editingId === s.id;
            const isModified = s.currentKey !== s.defaultKey;

            return (
              <div
                key={s.id}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">
                      {s.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {s.category}
                    </span>
                    {isModified && (
                      <span className="text-[9px] px-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                        Customized
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {s.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={editingKey}
                        onChange={(e) => {
                          setEditingKey(e.target.value);
                          setConflictError(null);
                        }}
                        placeholder="e.g. Ctrl+Alt+T"
                        className="w-32 px-2 py-1 bg-slate-900 border border-sky-500 rounded-lg text-xs font-mono text-sky-200 text-center focus:outline-none"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-colors cursor-pointer"
                        title="Save Shortcut"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setConflictError(null);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <kbd className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-semibold text-slate-200 shadow-inner">
                        {s.currentKey}
                      </kbd>
                      <button
                        onClick={() => handleStartEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit Shortcut"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Conflict Warning Toast if duplicate keys entered */}
      {conflictError && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{conflictError}</span>
        </div>
      )}
    </div>
  );
};
