// CrashRecoveryService.ts
// TypeScript bridge implementing rocket/apps/recovery.rocket
// Unhandled crash isolation, dirty document journal, and recovery manager

import { AppId } from '../../types';
import { SystemLogger } from '../logging/SystemLogger';

export type CrashSeverity = 'APP_CRASH' | 'SERVICE_FAILURE' | 'KERNEL_PANIC';

export interface DirtyDocumentSnapshot {
  id: string;
  appId: AppId;
  documentType: string;
  filePath: string;
  payloadContent: string;
  snapshotTimestamp: string;
  autoRecovered: boolean;
}

export interface CrashLogEntry {
  id: string;
  timestamp: string;
  appId: AppId;
  windowId: string;
  severity: CrashSeverity;
  errorMessage: string;
  stackTrace: string;
  recoveredDocuments: DirtyDocumentSnapshot[];
}

export class CrashRecoveryService {
  private static instance: CrashRecoveryService | null = null;
  private readonly STORAGE_KEY_SNAPSHOTS = 'rocket_recovery_snapshots_v1';
  private readonly STORAGE_KEY_CRASHES = 'rocket_crash_logs_v1';

  private snapshots: Map<string, DirtyDocumentSnapshot> = new Map();
  private crashLogs: CrashLogEntry[] = [];
  private listeners: Array<() => void> = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): CrashRecoveryService {
    if (!CrashRecoveryService.instance) {
      CrashRecoveryService.instance = new CrashRecoveryService();
    }
    return CrashRecoveryService.instance;
  }

  private loadFromStorage(): void {
    try {
      const rawSnaps = localStorage.getItem(this.STORAGE_KEY_SNAPSHOTS);
      if (rawSnaps) {
        const parsed: DirtyDocumentSnapshot[] = JSON.parse(rawSnaps);
        parsed.forEach((s) => this.snapshots.set(s.id, s));
      }

      const rawCrashes = localStorage.getItem(this.STORAGE_KEY_CRASHES);
      if (rawCrashes) {
        this.crashLogs = JSON.parse(rawCrashes);
      }
    } catch {
      // Storage unavailable or parsing error
    }
  }

  private saveToStorage(): void {
    try {
      const snapList = Array.from(this.snapshots.values());
      localStorage.setItem(this.STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapList));
      localStorage.setItem(this.STORAGE_KEY_CRASHES, JSON.stringify(this.crashLogs));
    } catch {
      // Ignore
    }
  }

  /**
   * Records a dirty working document snapshot (e.g. from Notes, Paint, Editor)
   */
  public recordDraftSnapshot(
    appId: AppId,
    documentType: string,
    filePath: string,
    payloadContent: string
  ): DirtyDocumentSnapshot {
    // Check if an existing snapshot for this app+path exists
    const key = `${appId}:${filePath || 'untitled'}`;
    const existing = Array.from(this.snapshots.values()).find(
      (s) => s.appId === appId && s.filePath === filePath
    );

    const snapshot: DirtyDocumentSnapshot = {
      id: existing ? existing.id : `snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      appId,
      documentType,
      filePath,
      payloadContent,
      snapshotTimestamp: new Date().toISOString(),
      autoRecovered: false,
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.saveToStorage();
    this.notify();
    return snapshot;
  }

  /**
   * Clears saved draft when user explicitly saves or discards
   */
  public clearDraftSnapshot(appId: AppId, filePath: string): void {
    for (const [id, s] of this.snapshots.entries()) {
      if (s.appId === appId && s.filePath === filePath) {
        this.snapshots.delete(id);
      }
    }
    this.saveToStorage();
    this.notify();
  }

  /**
   * Retrieves pending recoverable draft snapshots for an application
   */
  public getRecoverableDrafts(appId: AppId): DirtyDocumentSnapshot[] {
    return Array.from(this.snapshots.values()).filter(
      (s) => s.appId === appId && !s.autoRecovered
    );
  }

  /**
   * Logs an isolated application or service crash
   */
  public logCrash(
    appId: AppId,
    windowId: string,
    severity: CrashSeverity,
    error: Error | string,
    stackTrace?: string
  ): CrashLogEntry {
    const errorMsg = typeof error === 'string' ? error : error.message;
    const trace = stackTrace || (error instanceof Error ? error.stack : '') || 'No stack trace available';

    const recovered = this.getRecoverableDrafts(appId);

    const entry: CrashLogEntry = {
      id: `crash-${Date.now()}`,
      timestamp: new Date().toISOString(),
      appId,
      windowId,
      severity,
      errorMessage: errorMsg,
      stackTrace: trace,
      recoveredDocuments: [...recovered],
    };

    this.crashLogs.unshift(entry);
    if (this.crashLogs.length > 50) this.crashLogs.pop();

    this.saveToStorage();

    // Log to OS SystemLogger
    SystemLogger.getInstance().logProcess(
      'killed',
      0,
      appId,
      `[${severity}] (win: ${windowId}): ${errorMsg}`
    );

    this.notify();
    return entry;
  }

  public getCrashLogs(): CrashLogEntry[] {
    return [...this.crashLogs];
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
