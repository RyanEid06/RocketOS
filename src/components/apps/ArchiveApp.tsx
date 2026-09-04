import React, { useState, useEffect } from 'react';
import {
  Archive,
  FolderArchive,
  FileText,
  Folder,
  Download,
  Upload,
  Disc,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  HardDrive,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { rocketFS } from '../../core/filesystem/RocketFS';
import { MountManager } from '../../core/filesystem/MountManager';
import { notificationService } from '../../core/notifications/NotificationService';

interface ArchiveEntry {
  path: string;
  name: string;
  size: number;
  compressedSize: number;
  crc32: string;
  isFolder: boolean;
  modified: string;
}

export const ArchiveApp: React.FC = () => {
  const [currentArchiveName, setCurrentArchiveName] = useState<string>('rocket_toolchain_v2.1.zip');
  const [entries, setEntries] = useState<ArchiveEntry[]>([
    { path: 'bin/rocketc', name: 'rocketc', size: 14208500, compressedSize: 4890200, crc32: '8FA2B14C', isFolder: false, modified: '2026-09-01 10:20' },
    { path: 'bin/rocket-fmt', name: 'rocket-fmt', size: 3120000, compressedSize: 980000, crc32: 'C391AA02', isFolder: false, modified: '2026-09-01 10:20' },
    { path: 'bin/rocket-lldb', name: 'rocket-lldb', size: 8900000, compressedSize: 2840000, crc32: '1E885B44', isFolder: false, modified: '2026-09-01 10:20' },
    { path: 'lib/libstd.rlib', name: 'libstd.rlib', size: 6450000, compressedSize: 2100000, crc32: '77D01FA9', isFolder: false, modified: '2026-09-02 14:15' },
    { path: 'lib/libraylib2d.a', name: 'libraylib2d.a', size: 4890000, compressedSize: 1600000, crc32: '44FA8891', isFolder: false, modified: '2026-09-02 14:15' },
    { path: 'include/rocket.h', name: 'rocket.h', size: 45200, compressedSize: 12400, crc32: '990B33A1', isFolder: false, modified: '2026-09-02 14:15' },
    { path: 'docs/README.md', name: 'README.md', size: 12400, compressedSize: 4200, crc32: 'FE102344', isFolder: false, modified: '2026-09-03 09:00' },
    { path: 'LICENSE', name: 'LICENSE', size: 1840, compressedSize: 820, crc32: 'AB4487C0', isFolder: false, modified: '2026-08-15 12:00' },
  ]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntryPath, setSelectedEntryPath] = useState<string | null>(null);
  const [extractPath, setExtractPath] = useState<string>('/home/ryan/Downloads');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'ok' | 'fail'; message: string } | null>(null);

  const totalRaw = entries.reduce((acc, e) => acc + e.size, 0);
  const totalComp = entries.reduce((acc, e) => acc + e.compressedSize, 0);
  const ratio = totalRaw > 0 ? ((1 - totalComp / totalRaw) * 100).toFixed(1) : '0.0';

  const filteredEntries = entries.filter((e) =>
    e.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExtractAll = () => {
    soundEngine.play('click');
    setIsExtracting(true);

    setTimeout(() => {
      setIsExtracting(false);
      soundEngine.playSuccess();

      // Write mock extracted files into RocketFS
      try {
        if (!rocketFS.findItemByPath(extractPath)) {
          rocketFS.createDirectory(extractPath);
        }
        rocketFS.createFile(`${extractPath}/README.md`, '# Extracted from ' + currentArchiveName + '\nRocketOS Toolchain ready.');
      } catch (e) {}

      notificationService.sendNotification({
        title: 'Extraction Finished',
        body: `Extracted ${entries.length} files to ${extractPath}`,
        severity: 'info',
        sourceAppId: 'archive',
      });
    }, 1200);
  };

  const handleMountVirtualDisk = () => {
    soundEngine.play('snap');
    const mountMgr = MountManager.getInstance();
    const res = mountMgr.mountVirtualDisk(`/media/${currentArchiveName}`);
    if (res.success) {
      notificationService.sendNotification({
        title: 'Virtual Volume Mounted',
        body: `Mounted ${currentArchiveName} at ${res.mountPoint}`,
        severity: 'info',
        sourceAppId: 'archive',
      });
    } else {
      notificationService.sendNotification({
        title: 'Volume Mount Notification',
        body: res.error || `Volume already mounted at ${res.mountPoint}`,
        severity: 'warning',
        sourceAppId: 'archive',
      });
    }
  };

  const handleTestIntegrity = () => {
    soundEngine.play('click');
    setTestResult(null);
    setTimeout(() => {
      soundEngine.playSuccess();
      setTestResult({
        status: 'ok',
        message: 'All 8 archive records passed CRC32 parity check. Deflate header valid (ZIP 2.0).',
      });
    }, 600);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderArchive className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-bold text-xs text-white flex items-center gap-2">
              <span>{currentArchiveName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">ZIP (Deflated)</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {entries.length} files • {formatBytes(totalRaw)} total ({ratio}% compression)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExtractAll}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-sm shadow-sky-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExtracting ? 'Extracting...' : 'Extract All'}</span>
          </button>

          <button
            type="button"
            onClick={handleMountVirtualDisk}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-white/10 transition-colors"
            title="Mount as Virtual Disk Volume"
          >
            <Disc className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mount as Disk</span>
          </button>

          <button
            type="button"
            onClick={handleTestIntegrity}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs cursor-pointer border border-white/10 transition-colors"
            title="Verify CRC32 checksums"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Test Integrity</span>
          </button>
        </div>
      </div>

      {/* Test Results Banner */}
      {testResult && (
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{testResult.message}</span>
          </div>
          <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10 w-72">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files inside archive..."
            className="bg-transparent text-xs text-white outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>Extract target:</span>
          <input
            type="text"
            value={extractPath}
            onChange={(e) => setExtractPath(e.target.value)}
            className="bg-slate-950 px-2 py-0.5 rounded border border-white/10 text-slate-300 font-mono text-[11px] w-48 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Files Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-black/30 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-white/10 sticky top-0 backdrop-blur-md">
              <th className="py-2.5 px-3">File Path</th>
              <th className="py-2.5 px-3 text-right">Original Size</th>
              <th className="py-2.5 px-3 text-right">Compressed</th>
              <th className="py-2.5 px-3 text-right">Ratio</th>
              <th className="py-2.5 px-3 text-center">CRC-32</th>
              <th className="py-2.5 px-3 text-right">Date Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
            {filteredEntries.map((entry) => {
              const isSelected = selectedEntryPath === entry.path;
              const savedRatio = ((1 - entry.compressedSize / entry.size) * 100).toFixed(0);

              return (
                <tr
                  key={entry.path}
                  onClick={() => setSelectedEntryPath(entry.path)}
                  className={`hover:bg-white/5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-sky-500/20 text-sky-200' : 'text-slate-300'
                  }`}
                >
                  <td className="py-2 px-3 font-sans flex items-center gap-2 font-medium">
                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{entry.path}</span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">{formatBytes(entry.size)}</td>
                  <td className="py-2 px-3 text-right text-slate-400">{formatBytes(entry.compressedSize)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">{savedRatio}%</td>
                  <td className="py-2 px-3 text-center text-slate-500">{entry.crc32}</td>
                  <td className="py-2 px-3 text-right text-slate-400 font-sans text-[10px]">{entry.modified}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Status */}
      <div className="p-2.5 bg-slate-900 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
        <span>{filteredEntries.length} items listed</span>
        <div className="flex items-center gap-4">
          <span>Uncompressed: <strong className="text-white">{formatBytes(totalRaw)}</strong></span>
          <span>Compressed: <strong className="text-white">{formatBytes(totalComp)}</strong></span>
        </div>
      </div>
    </div>
  );
};
