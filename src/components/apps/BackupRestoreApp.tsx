import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
  FolderArchive,
  Save,
  FileText,
  FileArchive,
} from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { RocketFSSnapshot } from '../../core/filesystem/types';
import { browserPersistenceProvider } from '../../platform/browser/BrowserPersistenceProvider';
import { settingsService } from '../../core/settings/SettingsService';
import { notificationService } from '../../core/notifications/NotificationService';
import { soundEngine } from '../../utils/audio';
import { FSItem, SystemSettings } from '../../types';

interface SnapshotRecord {
  id: string;
  name: string;
  createdAt: string;
  itemCount: number;
  totalSizeBytes: number;
  snapshotData: {
    fileSystem: FSItem[];
    rawSnapshot?: RocketFSSnapshot;
    settings?: SystemSettings;
  };
}

interface BackupRestoreAppProps {
  onReboot: () => void;
  onRefreshFileSystem: (newFs: FSItem[]) => void;
}

export const BackupRestoreApp: React.FC<BackupRestoreAppProps> = ({
  onReboot,
  onRefreshFileSystem,
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>(() => {
    try {
      const saved = localStorage.getItem('rocket_snapshots_index');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [snapshotName, setSnapshotName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const saveSnapshotsIndex = (list: SnapshotRecord[]) => {
    setSnapshots(list);
    try {
      localStorage.setItem('rocket_snapshots_index', JSON.stringify(list));
    } catch (e) {
      console.error('Failed to write snapshots index:', e);
    }
  };

  // Calculate current filesystem statistics
  const currentStats = React.useMemo(() => {
    const rfs = RocketFS.getInstance();
    const all = rfs.getAllNodes();
    let totalBytes = 0;
    all.forEach((n) => {
      if (n.content) totalBytes += n.content.length;
    });
    return {
      count: all.length,
      bytes: totalBytes,
    };
  }, []);

  // 1. Create named snapshot
  const handleCreateSnapshot = () => {
    const rfs = RocketFS.getInstance();
    const rawSnapshot = rfs.snapshot();
    const tree = rfs.getTree();
    const settings = settingsService.getSettings();
    const name = snapshotName.trim() || `Snapshot-${new Date().toLocaleTimeString()}`;

    const newRecord: SnapshotRecord = {
      id: `snap-${Date.now()}`,
      name,
      createdAt: new Date().toLocaleString(),
      itemCount: currentStats.count,
      totalSizeBytes: currentStats.bytes,
      snapshotData: {
        fileSystem: tree,
        rawSnapshot,
        settings,
      },
    };

    const updated = [newRecord, ...snapshots];
    saveSnapshotsIndex(updated);
    setSnapshotName('');
    soundEngine.play('click');
    notificationService.sendNotification({
      title: 'Snapshot Created',
      message: `Saved restore point "${name}" (${currentStats.count} items)`,
      type: 'success',
    });
  };

  // 2. Restore snapshot
  const handleRestoreSnapshot = (record: SnapshotRecord) => {
    const rfs = RocketFS.getInstance();
    if (record.snapshotData.rawSnapshot) {
      rfs.loadSnapshot(record.snapshotData.rawSnapshot);
    }
    const currentTree = rfs.getTree();
    onRefreshFileSystem(currentTree);

    if (record.snapshotData.settings) {
      settingsService.updateSettings(record.snapshotData.settings);
    }

    soundEngine.play('navigate');
    notificationService.sendNotification({
      title: 'System Restored',
      message: `RocketOS restored to snapshot: ${record.name}`,
      type: 'success',
    });
  };

  // 3. Delete snapshot
  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    saveSnapshotsIndex(updated);
    soundEngine.play('click');
  };

  // 4. Export full filesystem bundle as downloadable JSON
  const handleExportSystemBundle = () => {
    const rfs = RocketFS.getInstance();
    const bundle = {
      format: 'rocket-os-system-backup-v2',
      exportedAt: new Date().toISOString(),
      rawSnapshot: rfs.snapshot(),
      fileSystem: rfs.getTree(),
      settings: settingsService.getSettings(),
    };

    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RocketOS-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notificationService.sendNotification({
      title: 'Backup Downloaded',
      message: 'System JSON archive downloaded to your local computer',
      type: 'info',
    });
  };

  // 4b. Export full filesystem tree as standard .ZIP archive
  const handleExportZipArchive = async () => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const rfs = RocketFS.getInstance();
      const nodes = rfs.getAllNodes();

      for (const node of nodes) {
        if (node.nodeType === 'file') {
          const relativePath = node.canonicalPath.startsWith('/')
            ? node.canonicalPath.slice(1)
            : node.canonicalPath;
          zip.file(relativePath, node.content || '');
        }
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RocketOS-Filesystem-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      soundEngine.play('navigate');
      notificationService.sendNotification({
        title: 'ZIP Archive Exported',
        message: 'RocketOS userland filesystem downloaded as .zip archive',
        type: 'success',
      });
    } catch (e) {
      console.error('Failed to generate ZIP archive:', e);
      notificationService.sendNotification({
        title: 'Export Failed',
        message: 'Could not generate .zip archive of filesystem',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Import & Restore from uploaded JSON file
  const handleImportSystemBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const rfs = RocketFS.getInstance();
        if (parsed.rawSnapshot) {
          rfs.loadSnapshot(parsed.rawSnapshot);
          onRefreshFileSystem(rfs.getTree());
        } else if (parsed.fileSystem && Array.isArray(parsed.fileSystem)) {
          onRefreshFileSystem(parsed.fileSystem);
        }

        if (parsed.settings) {
          settingsService.updateSettings(parsed.settings);
        }

        notificationService.sendNotification({
          title: 'Restore Completed',
          message: 'Successfully imported filesystem and system settings',
          type: 'success',
        });
      } catch (err) {
        alert('Could not parse backup file');
      }
    };
    reader.readAsText(file);
  };

  // 6. Factory Reset
  const handleFactoryReset = async () => {
    setIsProcessing(true);
    await browserPersistenceProvider.clearAll();
    localStorage.clear();
    soundEngine.play('click');
    onReboot();
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              Backup & Restore Center
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              RocketFS Volume Snapshots & Recovery
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportSystemBundle}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportZipArchive}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            title="Download entire filesystem as standard .zip archive"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Export .ZIP</span>
          </button>
          <button
            onClick={handleExportSystemBundle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* System Health Status Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>RocketFS Virtual Storage Healthy</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  ACTIVE
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                {currentStats.count} items recorded • {(currentStats.bytes / 1024).toFixed(1)} KB userland data
              </div>
            </div>
          </div>
        </div>

        {/* Create Snapshot Form */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Create New Restore Snapshot</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Restore Point Description (e.g. 'Before compiler upgrade')"
              className="flex-1 bg-black/40 border border-white/10 focus:border-sky-400 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>
          </div>
        </div>

        {/* Snapshots History Table */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Local Snapshots ({snapshots.length})
          </div>

          {snapshots.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-slate-400 text-xs">
              <FolderArchive className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              No local snapshots created yet. Create one above to preserve your system state.
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{snap.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {snap.createdAt} • {snap.itemCount} items • {(snap.totalSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone: Factory Reset */}
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Reset RocketOS to Factory Defaults</span>
            </div>
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset System...
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFactoryReset}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Erasing...' : 'Confirm Wipe & Reboot'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Erases all IndexedDB records, user documents, and custom settings, restoring clean original demo files.
          </p>
        </div>
      </div>
    </div>
  );
};
