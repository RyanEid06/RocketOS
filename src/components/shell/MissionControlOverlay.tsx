import React, { useState } from 'react';
import {
  Layers,
  X,
  Maximize2,
  Minimize2,
  Search,
  ExternalLink,
  Plus,
  Monitor,
  LayoutGrid,
} from 'lucide-react';
import { WindowState, AppId } from '../../types';
import { soundEngine } from '../../utils/audio';

interface MissionControlOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  windows: WindowState[];
  currentWorkspace: number;
  onChangeWorkspace: (wsId: number) => void;
  onFocusWindow: (id: string) => void;
  onMoveWindowToWorkspace: (windowId: string, wsId: number) => void;
  onCloseWindow: (windowId: string) => void;
}

export const MissionControlOverlay: React.FC<MissionControlOverlayProps> = ({
  isOpen,
  onClose,
  windows,
  currentWorkspace,
  onChangeWorkspace,
  onFocusWindow,
  onMoveWindowToWorkspace,
  onCloseWindow,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const workspaces = [1, 2, 3, 4];

  const filteredWindows = windows.filter((w) =>
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.appId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectWindow = (w: WindowState) => {
    if (w.workspaceId && w.workspaceId !== currentWorkspace) {
      onChangeWorkspace(w.workspaceId);
    }
    onFocusWindow(w.id);
    onClose();
    soundEngine.playSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/75 backdrop-blur-xl flex flex-col p-8 select-none font-sans text-slate-100 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar: Search & Workspace indicators */}
      <div
        className="flex items-center justify-between max-w-6xl w-full mx-auto mb-6 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Mission Control & Workspaces</h1>
            <p className="text-xs text-slate-400">Bird's-eye overview of all active windows and virtual desks</p>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search open windows..."
            autoFocus
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 outline-none focus:border-orange-500 font-mono"
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4 Workspaces Desk Bar */}
      <div
        className="grid grid-cols-4 gap-4 max-w-6xl w-full mx-auto mb-6 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {workspaces.map((ws) => {
          const count = windows.filter((w) => (w.workspaceId || 1) === ws).length;
          const isActive = currentWorkspace === ws;

          return (
            <div
              key={ws}
              onClick={() => {
                onChangeWorkspace(ws);
                soundEngine.playSnap();
              }}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isActive
                  ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                <span className="text-xs font-semibold">Workspace {ws}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 font-mono">
                {count} {count === 1 ? 'window' : 'windows'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Windows Exposé Grid */}
      <div
        className="flex-1 max-w-6xl w-full mx-auto overflow-y-auto custom-scrollbar p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {filteredWindows.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
            <LayoutGrid className="w-10 h-10 opacity-30" />
            <p className="text-xs">No active windows found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredWindows.map((w) => (
              <div
                key={w.id}
                onClick={() => handleSelectWindow(w)}
                className="group relative rounded-2xl bg-slate-900/80 border border-white/10 hover:border-orange-500/60 transition-all overflow-hidden flex flex-col h-56 shadow-2xl cursor-pointer hover:scale-[1.02] transform"
              >
                {/* Mini Titlebar */}
                <div className="h-8 px-3 bg-slate-800 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-xs font-semibold text-slate-200 truncate">{w.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/50 text-slate-400 font-mono">
                      WS {w.workspaceId || 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseWindow(w.id);
                        soundEngine.playSnap();
                      }}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Simulated Window Body Preview */}
                <div className="flex-1 p-4 bg-slate-950/60 flex flex-col justify-between">
                  <div className="space-y-1.5 opacity-60">
                    <div className="h-2.5 w-3/4 rounded bg-slate-700" />
                    <div className="h-2 w-1/2 rounded bg-slate-800" />
                    <div className="h-2 w-5/6 rounded bg-slate-800" />
                  </div>

                  {/* Move to another workspace shortcuts */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Send to:</span>
                    <div className="flex gap-1">
                      {workspaces.map((destWs) => (
                        <button
                          key={destWs}
                          onClick={() => {
                            onMoveWindowToWorkspace(w.id, destWs);
                            soundEngine.playSnap();
                          }}
                          className={`w-5 h-5 rounded flex items-center justify-center font-mono cursor-pointer transition-colors ${
                            (w.workspaceId || 1) === destWs
                              ? 'bg-orange-500 text-white font-bold'
                              : 'bg-white/5 hover:bg-white/15 text-slate-300'
                          }`}
                        >
                          {destWs}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
