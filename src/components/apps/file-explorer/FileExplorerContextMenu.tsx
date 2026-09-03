import React from 'react';
import { Folder, Copy, Scissors, Trash2, Edit2, Shield } from 'lucide-react';
import { FSItem } from '../../../types';

interface FileExplorerContextMenuProps {
  x: number;
  y: number;
  item: FSItem;
  onOpen: (item: FSItem) => void;
  onOpenWith?: (item: FSItem, appId: string) => void;
  onCopy: (item: FSItem) => void;
  onCut: (item: FSItem) => void;
  onRename: (item: FSItem) => void;
  onDelete: (item: FSItem) => void;
  onProperties?: (item: FSItem) => void;
  onClose: () => void;
}

export const FileExplorerContextMenu: React.FC<FileExplorerContextMenuProps> = ({
  x,
  y,
  item,
  onOpen,
  onOpenWith,
  onCopy,
  onCut,
  onRename,
  onDelete,
  onProperties,
  onClose,
}) => {
  const [showOpenWith, setShowOpenWith] = React.useState(false);

  return (
    <div
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-52 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-1.5 text-slate-200 text-xs space-y-1 select-none"
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 truncate">
        {item.name}
      </div>

      <button
        type="button"
        onClick={() => {
          onOpen(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors font-medium text-white"
      >
        <Folder className="w-3.5 h-3.5 text-sky-400" />
        <span>Open</span>
      </button>

      {item.type === 'file' && onOpenWith && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOpenWith(!showOpenWith)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 text-center font-bold text-sky-400">⚡</span>
              <span>Open With...</span>
            </span>
            <span className="text-[10px] text-slate-400">▶</span>
          </button>

          {showOpenWith && (
            <div className="my-1 pl-4 space-y-0.5 border-l-2 border-sky-500/40 ml-2">
              <button
                type="button"
                onClick={() => {
                  onOpenWith(item, 'editor');
                  onClose();
                }}
                className="w-full text-left px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                Rocket Text Editor
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenWith(item, 'notes');
                  onClose();
                }}
                className="w-full text-left px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                Notes & Tasks
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenWith(item, 'paint');
                  onClose();
                }}
                className="w-full text-left px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                Paint Canvas
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenWith(item, 'terminal');
                  onClose();
                }}
                className="w-full text-left px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                Terminal (cat / run)
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onCopy(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Copy className="w-3.5 h-3.5 text-slate-300" />
        <span>Copy (Ctrl+C)</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onCut(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Scissors className="w-3.5 h-3.5 text-amber-400" />
        <span>Cut (Ctrl+X)</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onRename(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
        <span>Rename</span>
      </button>

      {onProperties && (
        <button
          type="button"
          onClick={() => {
            onProperties(item);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
        >
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>Properties & Permissions</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          onDelete(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left cursor-pointer transition-colors border-t border-white/5 pt-1.5"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        <span>Move to Recycle Bin (Del)</span>
      </button>
    </div>
  );
};
