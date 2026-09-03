import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Folder,
  FileText,
  Settings as SettingsIcon,
  Sparkles,
  ArrowRight,
  Terminal,
  Cpu,
  Monitor,
  HardDrive,
  Sliders,
} from 'lucide-react';
import { AppId, FSItem } from '../../types';
import { searchService, UniversalSearchResults } from '../../core/search/SearchService';

interface SearchFlyoutProps {
  isOpen: boolean;
  fileSystem: FSItem[];
  onClose: () => void;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onOpenFile: (file: FSItem) => void;
  onOpenExplorerPath: (path: string) => void;
}

export const SearchFlyout: React.FC<SearchFlyoutProps> = ({
  isOpen,
  fileSystem,
  onClose,
  onOpenApp,
  onOpenFile,
  onOpenExplorerPath,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'apps' | 'files' | 'folders' | 'settings'>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results: UniversalSearchResults = searchService.search(query, fileSystem, () => {
    onOpenApp('settings');
    onClose();
  });

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-[580px] max-w-[95vw] bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-5 text-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search RocketOS apps, files, directories, settings..."
          className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/15 focus:border-sky-400/80 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none shadow-inner transition-colors font-medium"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-white/10 text-xs overflow-x-auto">
        {(['all', 'apps', 'files', 'folders', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl capitalize transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Results Container */}
      <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
        {/* Apps section */}
        {(activeTab === 'all' || activeTab === 'apps') && results.apps.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Applications ({results.apps.length})
            </div>
            <div className="grid grid-cols-2 gap-2">
              {results.apps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    onOpenApp(app.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xl">{app.glyph}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white group-hover:text-sky-300 truncate">
                      {app.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{app.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Folders section */}
        {(activeTab === 'all' || activeTab === 'folders') && results.folders.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Directories ({results.folders.length})
            </div>
            <div className="space-y-1">
              {results.folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => {
                    onOpenExplorerPath(folder.path);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                      {folder.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                    {folder.path}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files section */}
        {(activeTab === 'all' || activeTab === 'files') && results.files.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Files ({results.files.length})
            </div>
            <div className="space-y-1">
              {results.files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => {
                    onOpenFile(file);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">{file.path}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{file.size || '0 B'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings section */}
        {(activeTab === 'all' || activeTab === 'settings') && results.settings.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              System Settings & Actions
            </div>
            <div className="space-y-1">
              {results.settings.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    s.action();
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-sky-300">
                        {s.title}
                      </div>
                      <div className="text-[10px] text-slate-400">{s.description}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-sky-400 font-medium">Open Settings →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {results.apps.length === 0 &&
          results.folders.length === 0 &&
          results.files.length === 0 &&
          results.settings.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No matching apps, files, or settings found for "{query}".
            </div>
          )}
      </div>
    </div>
  );
};
