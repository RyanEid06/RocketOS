import React, { useState } from 'react';
import { FSItem } from '../../../types';
import { RocketFS } from '../../../core/filesystem/RocketFS';
import { PermissionsEngine } from '../../../core/filesystem/PermissionsEngine';
import { UserManager } from '../../../core/users/UserManager';
import { FileAssociations } from '../../../core/filesystem/FileAssociations';
import { PathEngine } from '../../../core/filesystem/PathEngine';
import { X, Shield, Lock, FileCode, Check } from 'lucide-react';

interface FileExplorerPropertiesModalProps {
  item: FSItem;
  onClose: () => void;
  onPermissionsUpdated?: () => void;
}

export const FileExplorerPropertiesModal: React.FC<FileExplorerPropertiesModalProps> = ({
  item,
  onClose,
  onPermissionsUpdated,
}) => {
  const rfs = RocketFS.getInstance();
  const currentUser = UserManager.getInstance().getCurrentUser();
  const statRes = rfs.lookup(item.path, currentUser);
  const inode = statRes.success ? statRes.data : null;

  const [mode, setMode] = useState<number>(inode ? inode.mode : 0o644);
  const isOwnerOrRoot = currentUser.uid === 0 || (inode && currentUser.uid === inode.uid);
  const ext = PathEngine.getExtension(item.name);
  const defaultApp = FileAssociations.getDefaultApp(ext);

  const toggleBit = (bit: number) => {
    if (!isOwnerOrRoot) return;
    const newMode = mode ^ bit;
    setMode(newMode);
    if (inode) {
      inode.mode = newMode;
      inode.modifiedAt = new Date().toISOString();
      if (onPermissionsUpdated) onPermissionsUpdated();
    }
  };

  const isDir = item.type === 'folder' || inode?.nodeType === 'directory';
  const modeStr = PermissionsEngine.formatMode(mode, isDir);
  const ownerUser = inode ? UserManager.getInstance().getUser(inode.uid) : null;
  const groupObj = inode ? UserManager.getInstance().getGroup(inode.gid) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden select-none text-slate-200 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-white/10">
          <div className="flex items-center gap-2 font-semibold text-sky-400">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="truncate">Properties: {item.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* General Metadata */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Canonical Path:</span>
              <span className="font-mono text-slate-200 truncate max-w-[240px]">{item.path}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inode Number:</span>
              <span className="font-mono text-emerald-400">#{inode?.inode ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Node Type:</span>
              <span className="capitalize text-slate-200">{inode?.nodeType || item.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Size:</span>
              <span className="font-mono text-slate-200">{inode?.sizeBytes ?? 0} bytes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Default Association:</span>
              <span className="font-semibold text-sky-300 capitalize">{defaultApp}</span>
            </div>
          </div>

          {/* Ownership & Identity */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Owner (UID):</span>
              <span className="font-mono text-slate-200">
                {ownerUser ? `${ownerUser.username} (${ownerUser.uid})` : (inode?.uid ?? 1000)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Group (GID):</span>
              <span className="font-mono text-slate-200">
                {groupObj ? `${groupObj.name} (${groupObj.gid})` : (inode?.gid ?? 100)}
              </span>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Unix Permissions</span>
              </span>
              <span className="font-mono text-amber-300">
                {modeStr} (0{mode.toString(8)})
              </span>
            </div>

            <div className="grid grid-cols-4 text-center font-mono text-[11px] gap-1 pt-1">
              <div className="text-left text-slate-400 font-sans">Role</div>
              <div className="text-slate-400">Read</div>
              <div className="text-slate-400">Write</div>
              <div className="text-slate-400">Exec</div>

              {/* User / Owner */}
              <div className="text-left text-slate-300 font-sans font-medium">User</div>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o400)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o400) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                r
              </button>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o200)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o200) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                w
              </button>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o100)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o100) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                x
              </button>

              {/* Group */}
              <div className="text-left text-slate-300 font-sans font-medium">Group</div>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o040)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o040) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                r
              </button>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o020)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o020) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                w
              </button>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o010)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o010) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                x
              </button>

              {/* Others */}
              <div className="text-left text-slate-300 font-sans font-medium">Others</div>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o004)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o004) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                r
              </button>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o002)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o002) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                w
              </button>
              <button
                type="button"
                disabled={!isOwnerOrRoot}
                onClick={() => toggleBit(0o001)}
                className={`py-1 rounded cursor-pointer transition-colors ${
                  (mode & 0o001) !== 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40' : 'bg-white/5 text-slate-500'
                }`}
              >
                x
              </button>
            </div>

            {!isOwnerOrRoot && (
              <div className="text-[11px] text-amber-400/80 pt-1">
                Read-only: you must be the owner ({ownerUser?.username || 'root'}) or elevated to modify permissions.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-3 bg-slate-950/80 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
