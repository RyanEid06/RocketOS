import React from 'react';
import { Layers, Plus, Check } from 'lucide-react';
import { WindowState } from '../../types';

interface WorkspaceSwitcherProps {
  isOpen: boolean;
  currentWorkspace: number;
  windows: WindowState[];
  onChangeWorkspace: (wsId: number) => void;
  onClose: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  isOpen,
  currentWorkspace,
  windows,
  onChangeWorkspace,
  onClose,
}) => {
  if (!isOpen) return null;

  const workspaces = [
    { id: 1, name: 'Desktop 1', description: 'Primary Workspace' },
    { id: 2, name: 'Desktop 2', description: 'Development & Code' },
    { id: 3, name: 'Desktop 3', description: 'Design & Tools' },
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 left-28 z-50 w-72 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-4 text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-xs text-white">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Virtual Workspaces</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Active: #{currentWorkspace}
        </span>
      </div>

      <div className="space-y-1.5">
        {workspaces.map((ws) => {
          const isActive = currentWorkspace === ws.id;
          const openInWs = windows.filter((w) => (w.workspaceId || 1) === ws.id);

          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => {
                onChangeWorkspace(ws.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-purple-500/20 border-purple-400/50 text-white shadow-lg shadow-purple-500/10 font-bold'
                  : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold ${
                    isActive ? 'bg-purple-500 text-white' : 'bg-black/30 text-slate-400'
                  }`}
                >
                  {ws.id}
                </div>
                <div>
                  <div className="text-xs">{ws.name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {openInWs.length} {openInWs.length === 1 ? 'window' : 'windows'}
                  </div>
                </div>
              </div>

              {isActive && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
