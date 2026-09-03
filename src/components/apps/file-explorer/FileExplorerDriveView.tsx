import React from 'react';
import { HardDrive, Server, Monitor, FileText, Download, Cpu, Layers } from 'lucide-react';
import { SystemManifest } from '../../../core/manifest/SystemManifest';

interface FileExplorerDriveViewProps {
  onNavigate: (path: string) => void;
}

export const FileExplorerDriveView: React.FC<FileExplorerDriveViewProps> = ({ onNavigate }) => {
  const hw = SystemManifest.HARDWARE;

  return (
    <div className="space-y-6 select-none">
      {/* Devices and Drives */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Devices and Drives
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Drive C */}
          <div
            onClick={() => onNavigate('/')}
            className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-sky-400/50 cursor-pointer group transition-all shadow-md flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform">
              <HardDrive className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white group-hover:text-sky-300">
                  System Disk (C:)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {hw.storageCapacityGb - 28} GB free / {hw.storageCapacityGb} GB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full w-[15%]" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {hw.storageType} • Posix VFS
              </div>
            </div>
          </div>

          {/* Drive D */}
          <div
            onClick={() => onNavigate('/kernel')}
            className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-emerald-400/50 cursor-pointer group transition-all shadow-md flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
              <Server className="w-7 h-7" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white group-hover:text-emerald-300">
                  RocketFS RAM Disk (D:)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {(hw.totalMemoryMb / 1024 - 1.2).toFixed(1)} GB free / {(hw.totalMemoryMb / 1024).toFixed(1)} GB
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[14%]" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {hw.pagingMode}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Folders & System Locations */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Folders & Locations
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => onNavigate('/Desktop')}
            className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
          >
            <Monitor className="w-5 h-5 text-sky-400" />
            <div>
              <div className="font-semibold text-white">Desktop</div>
              <div className="text-[10px] text-slate-400">Active Workspace</div>
            </div>
          </div>
          <div
            onClick={() => onNavigate('/Documents')}
            className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
          >
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-semibold text-white">Documents</div>
              <div className="text-[10px] text-slate-400">Source Files</div>
            </div>
          </div>
          <div
            onClick={() => onNavigate('/Downloads')}
            className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
          >
            <Download className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-semibold text-white">Downloads</div>
              <div className="text-[10px] text-slate-400">Packages & Media</div>
            </div>
          </div>
          <div
            onClick={() => onNavigate('/kernel')}
            className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
          >
            <Cpu className="w-5 h-5 text-rose-400" />
            <div>
              <div className="font-semibold text-white">Kernel & Boot</div>
              <div className="text-[10px] text-slate-400">Stage-3 & Drivers</div>
            </div>
          </div>
          <div
            onClick={() => onNavigate('/drivers')}
            className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
          >
            <Layers className="w-5 h-5 text-purple-400" />
            <div>
              <div className="font-semibold text-white">Drivers</div>
              <div className="text-[10px] text-slate-400">Hardware Layer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
