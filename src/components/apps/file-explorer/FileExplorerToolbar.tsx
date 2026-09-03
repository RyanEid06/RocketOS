import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  Grid,
  List,
  Plus,
  Copy,
  ClipboardPaste,
  Scissors,
  Trash2,
} from 'lucide-react';
import { FSItem } from '../../../types';
import { ClipboardItem } from '../../../core/clipboard/ClipboardService';

interface FileExplorerToolbarProps {
  activePath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  clipboard: ClipboardItem | null;
  hasSelection: boolean;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  onSearchChange: (q: string) => void;
  onToggleViewMode: (mode: 'grid' | 'list') => void;
  onStartCreate: (type: 'file' | 'folder') => void;
  onCopySelection?: () => void;
  onCutSelection?: () => void;
  onPaste?: () => void;
  onDeleteSelection?: () => void;
}

export const FileExplorerToolbar: React.FC<FileExplorerToolbarProps> = ({
  activePath,
  canGoBack,
  canGoForward,
  searchQuery,
  viewMode,
  clipboard,
  hasSelection,
  onBack,
  onForward,
  onUp,
  onSearchChange,
  onToggleViewMode,
  onStartCreate,
  onCopySelection,
  onCutSelection,
  onPaste,
  onDeleteSelection,
}) => {
  const isSpecialPath = activePath === '/ThisPC' || activePath === '/Trash';

  return (
    <header className="h-12 bg-slate-900/90 border-b border-white/10 px-3 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md">
      {/* Navigation and Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onForward}
            disabled={!canGoForward}
            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onUp}
            disabled={activePath === '/'}
            className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors cursor-pointer"
            title="Up Directory"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-slate-300 font-mono text-xs max-w-sm truncate shadow-inner">
          <span className="text-slate-500 select-none">root@rocket:</span>
          <span className="text-sky-300 font-semibold truncate">{activePath}</span>
        </div>
      </div>

      {/* Action Buttons: New, Cut, Copy, Paste, Delete */}
      <div className="flex items-center gap-1.5">
        {!isSpecialPath && (
          <>
            <button
              type="button"
              onClick={() => onStartCreate('folder')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>New Folder</span>
            </button>
            <button
              type="button"
              onClick={() => onStartCreate('file')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New File</span>
            </button>
            {hasSelection && onCopySelection && (
              <button
                type="button"
                onClick={onCopySelection}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer"
                title="Copy (Ctrl+C)"
              >
                <Copy className="w-3.5 h-3.5 text-slate-300" />
              </button>
            )}
            {hasSelection && onCutSelection && (
              <button
                type="button"
                onClick={onCutSelection}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer"
                title="Cut (Ctrl+X)"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
            {clipboard?.item && onPaste && (
              <button
                type="button"
                onClick={onPaste}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 transition-colors cursor-pointer text-xs font-medium animate-pulse"
                title={`Paste ${clipboard.item.name} (${clipboard.op.toUpperCase()})`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}
            {hasSelection && onDeleteSelection && (
              <button
                type="button"
                onClick={onDeleteSelection}
                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                title="Delete to Recycle Bin (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {/* Search Field */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search folder..."
            className="w-36 sm:w-44 pl-8 pr-2.5 py-1 bg-black/30 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => onToggleViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
