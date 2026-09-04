import React, { useEffect } from 'react';
import {
  X,
  FileCode2,
  FileText,
  Image as ImageIcon,
  Folder,
  FileSpreadsheet,
  BookOpen,
  ExternalLink,
  Copy,
  Clock,
  HardDrive,
  Check,
} from 'lucide-react';
import { FSItem, AppId } from '../../types';
import { FileAssociations } from '../../core/filesystem/FileAssociations';
import { clipboardService } from '../../core/clipboard/ClipboardService';
import { notificationService } from '../../core/notifications/NotificationService';
import { soundEngine } from '../../utils/audio';
import { SHELL_Z_LAYERS } from '../../core/theme/tokens';

interface QuickLookModalProps {
  item: FSItem | null;
  onClose: () => void;
  onOpenWithApp: (appId: AppId, file: FSItem) => void;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({
  item,
  onClose,
  onOpenWithApp,
}) => {
  useEffect(() => {
    if (!item) return;

    soundEngine.play('navigate');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const defaultAppId = FileAssociations.getDefaultAppId(item.name);
  const isRocket = item.name.endsWith('.rocket');
  const isCsv = item.name.endsWith('.csv') || item.name.endsWith('.rcsv');
  const isMarkdown = item.name.endsWith('.md');
  const isPdf = item.name.endsWith('.pdf') || item.name.endsWith('.spec');
  const isImage = item.name.endsWith('.png') || item.name.endsWith('.jpg') || item.name.endsWith('.svg');

  const handleCopyPath = () => {
    clipboardService.copyText(item.path);
    soundEngine.play('click');
    notificationService.sendNotification({
      title: 'Quick Look',
      message: `Copied "${item.path}" to clipboard`,
      type: 'info',
    });
  };

  const renderContentPreview = () => {
    if (item.type === 'folder') {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
          <Folder className="w-16 h-16 text-amber-400 mb-3" />
          <div className="text-base font-bold text-white">{item.name}</div>
          <div className="text-xs text-slate-400 mt-1">Directory Folder</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.path}</div>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="py-6 flex flex-col items-center justify-center">
          <div className="w-full max-h-[300px] flex items-center justify-center bg-black/40 rounded-2xl p-4 border border-white/10">
            <ImageIcon className="w-24 h-24 text-emerald-400/80 animate-pulse" />
          </div>
          <div className="text-xs text-slate-400 mt-2 font-mono">{item.name}</div>
        </div>
      );
    }

    if (isCsv && item.content) {
      const rows = item.content.trim().split('\n').slice(0, 8);
      return (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-2 font-mono text-xs">
          <table className="w-full text-left">
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="border-b border-white/5 last:border-0">
                  {r.split(',').map((c, cIdx) => (
                    <td
                      key={cIdx}
                      className={`p-1.5 truncate max-w-[120px] ${
                        rIdx === 0 ? 'font-bold text-sky-300' : 'text-slate-300'
                      }`}
                    >
                      {c.replace(/"/g, '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {item.content.trim().split('\n').length > 8 && (
            <div className="text-[10px] text-slate-500 pt-2 text-center font-sans">
              Showing first 8 rows
            </div>
          )}
        </div>
      );
    }

    if (item.content) {
      const lines = item.content.split('\n');
      return (
        <div className="max-h-[320px] overflow-y-auto rounded-xl bg-slate-950/80 border border-white/10 p-3 font-mono text-xs text-slate-200">
          <pre className="leading-relaxed">
            {lines.slice(0, 30).map((line, idx) => (
              <div key={idx} className="flex">
                <span className="w-8 text-slate-600 select-none text-right pr-3 font-mono">
                  {idx + 1}
                </span>
                <span className={isRocket ? 'text-cyan-300' : 'text-slate-200'}>{line}</span>
              </div>
            ))}
          </pre>
          {lines.length > 30 && (
            <div className="text-[10px] text-slate-500 pt-3 text-center font-sans">
              ... and {lines.length - 30} more lines
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="py-8 text-center text-slate-500 text-xs">
        No preview content available
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      style={{ zIndex: SHELL_Z_LAYERS.MODAL + 50 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {isRocket ? (
                <FileCode2 className="w-4 h-4 text-cyan-400" />
              ) : isCsv ? (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              ) : isPdf ? (
                <BookOpen className="w-4 h-4 text-rose-400" />
              ) : item.type === 'folder' ? (
                <Folder className="w-4 h-4 text-amber-400" />
              ) : (
                <FileText className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{item.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{item.path}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">{renderContentPreview()}</div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-950/60 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span>{item.size || '0 B'}</span>
            <span>•</span>
            <span>{item.updatedAt}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Path</span>
            </button>
            <button
              onClick={() => {
                onOpenWithApp(defaultAppId, item);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
