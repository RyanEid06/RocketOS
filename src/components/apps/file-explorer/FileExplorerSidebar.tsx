import React from 'react';
import {
  Folder,
  HardDrive,
  Download,
  Monitor,
  Trash2,
  Server,
  Layers,
  Terminal as TerminalIcon,
  FileText,
  Disc,
  X as EjectIcon,
} from 'lucide-react';
import { TrashItem } from '../../../types';
import { MountManager, MountedDisk } from '../../../core/filesystem/MountManager';

interface FileExplorerSidebarProps {
  activePath: string;
  trashItems: TrashItem[];
  onNavigate: (path: string) => void;
  onOpenTerminal?: (path: string) => void;
}

export const FileExplorerSidebar: React.FC<FileExplorerSidebarProps> = ({
  activePath,
  trashItems,
  onNavigate,
  onOpenTerminal,
}) => {
  const mountMgr = MountManager.getInstance();
  const [mountedDisks, setMountedDisks] = React.useState<MountedDisk[]>(() => mountMgr.getMounts());

  React.useEffect(() => {
    return mountMgr.subscribe(() => {
      setMountedDisks(mountMgr.getMounts());
    });
  }, [mountMgr]);
  const quickLinks = [
    { label: 'Home (~)', path: '/home/ryan', icon: Monitor, color: 'text-sky-400' },
    { label: 'Desktop', path: '/Desktop', icon: Monitor, color: 'text-sky-400' },
    { label: 'Documents', path: '/Documents', icon: FileText, color: 'text-amber-400' },
    { label: 'Downloads', path: '/Downloads', icon: Download, color: 'text-emerald-400' },
  ];

  const systemLinks = [
    { label: 'This PC', path: '/ThisPC', icon: HardDrive, color: 'text-sky-400' },
    { label: 'Root (/)', path: '/', icon: Folder, color: 'text-slate-300' },
    { label: 'Processes (/proc)', path: '/proc', icon: Server, color: 'text-emerald-400' },
    { label: 'Devices (/sys)', path: '/sys', icon: Layers, color: 'text-purple-400' },
    { label: 'Kernel (/kernel)', path: '/kernel', icon: Server, color: 'text-rose-400' },
  ];

  return (
    <aside className="w-56 bg-slate-950/70 border-r border-white/10 p-3 flex flex-col gap-4 shrink-0 overflow-y-auto backdrop-blur-md select-none text-xs">
      {/* Quick Access */}
      <section className="space-y-1">
        <h4 className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Quick Access
        </h4>
        <ul className="space-y-0.5">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activePath === link.path;
            return (
              <li key={link.path}>
                <button
                  type="button"
                  onClick={() => onNavigate(link.path)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.color}`} />
                  <span className="truncate">{link.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* System Locations */}
      <section className="space-y-1">
        <h4 className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          System & Storage
        </h4>
        <ul className="space-y-0.5">
          {systemLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activePath === link.path;
            return (
              <li key={link.path}>
                <button
                  type="button"
                  onClick={() => onNavigate(link.path)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.color}`} />
                  <span className="truncate">{link.label}</span>
                </button>
              </li>
            );
          })}

          {/* Recycle Bin */}
          <li>
            <button
              type="button"
              onClick={() => onNavigate('/Trash')}
              className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                activePath === '/Trash'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="truncate">Recycle Bin</span>
              </div>
              {trashItems.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-rose-500/30 text-rose-200 rounded-full">
                  {trashItems.length}
                </span>
              )}
            </button>
          </li>
        </ul>
      </section>

      {/* Mounted Volumes & Virtual Images */}
      {mountedDisks.length > 0 && (
        <section className="space-y-1">
          <h4 className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Mounted Disks ({mountedDisks.length})
          </h4>
          <ul className="space-y-0.5">
            {mountedDisks.map((disk) => {
              const isActive = activePath === disk.mountPoint;
              return (
                <li key={disk.mountPoint} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onNavigate(disk.mountPoint)}
                    className={`flex-1 text-left px-2 py-1.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer min-w-0 ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Disc className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-xs">{disk.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mountMgr.unmount(disk.mountPoint);
                    }}
                    className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                    title={`Unmount ${disk.label}`}
                  >
                    <EjectIcon className="w-3 h-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {onOpenTerminal && (
        <div className="pt-3 border-t border-white/10 mt-auto">
          <button
            type="button"
            onClick={() => onOpenTerminal(activePath)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer text-xs font-semibold"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Terminal Here</span>
          </button>
        </div>
      )}
    </aside>
  );
};
