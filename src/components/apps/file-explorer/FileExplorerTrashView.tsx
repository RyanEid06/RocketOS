import React from 'react';
import { Trash2, RotateCcw, Folder, FileText } from 'lucide-react';
import { TrashItem, FSItem } from '../../../types';

interface FileExplorerTrashViewProps {
  trashItems: TrashItem[];
  onEmptyTrash?: () => void;
  onRestoreTrashItem?: (id: string) => void;
  getFileIcon: (item: FSItem) => React.ReactNode;
}

export const FileExplorerTrashView: React.FC<FileExplorerTrashViewProps> = ({
  trashItems,
  onEmptyTrash,
  onRestoreTrashItem,
  getFileIcon,
}) => {
  return (
    <div className="space-y-4 select-none">
      {/* Trash Header Controls */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span className="font-bold text-white text-xs">
            Recycle Bin ({trashItems.length} items)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEmptyTrash}
            disabled={trashItems.length === 0}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-all"
          >
            Empty Recycle Bin
          </button>
        </div>
      </div>

      {trashItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
          <div className="p-4 rounded-full bg-white/5 border border-white/10">
            <Trash2 className="w-8 h-8 text-slate-400" />
          </div>
          <div className="font-semibold text-sm text-slate-300">The Recycle Bin is empty</div>
          <p className="text-[11px] text-slate-500">Deleted files and folders will appear here</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden shadow-lg bg-slate-900/60">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/30 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-4">Original Location</th>
                <th className="py-2.5 px-4">Deleted At</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {trashItems.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-4 flex items-center gap-2 text-white font-medium">
                    {getFileIcon(t.item)}
                    <span>{t.item.name}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {t.originalPath}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {t.deletedAt}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {onRestoreTrashItem && (
                      <button
                        type="button"
                        onClick={() => onRestoreTrashItem(t.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
