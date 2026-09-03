import React from 'react';
import { Layers } from 'lucide-react';

interface WorkspaceSwitchBannerProps {
  workspaceId: number;
  visible: boolean;
}

export const WorkspaceSwitchBanner: React.FC<WorkspaceSwitchBannerProps> = ({
  workspaceId,
  visible,
}) => {
  if (!visible) return null;

  const names: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Desktop 1', subtitle: 'Primary Workspace' },
    2: { title: 'Desktop 2', subtitle: 'Development & Code' },
    3: { title: 'Desktop 3', subtitle: 'Design & Creative Tools' },
  };

  const info = names[workspaceId] || {
    title: `Desktop ${workspaceId}`,
    subtitle: 'Virtual Workspace',
  };

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
      <div className="px-6 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-purple-500/40 shadow-2xl shadow-purple-500/20 flex items-center gap-3.5 text-white">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 font-mono font-bold text-base">
          <Layers className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
            <span>{info.title}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-mono">
              Active
            </span>
          </div>
          <div className="text-xs text-slate-300 font-normal">{info.subtitle}</div>
        </div>
      </div>
    </div>
  );
};
