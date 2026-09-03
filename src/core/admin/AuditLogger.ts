// AuditLogger.ts
// Authoritative TypeScript binding implementing rocket/admin/elevation.rocket

import { SystemUser } from '../filesystem/types';

export interface SecurityLogEntry {
  timestamp: string;
  uid: number;
  username: string;
  action: string;
  targetResource: string;
  success: boolean;
  message: string;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private entries: SecurityLogEntry[] = [];
  private onLogCallbacks: Set<(entry: SecurityLogEntry) => void> = new Set();

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public logSecurity(
    user: SystemUser,
    action: string,
    targetResource: string,
    success: boolean,
    message: string
  ): SecurityLogEntry {
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      uid: user.uid,
      username: user.username,
      action,
      targetResource,
      success,
      message,
    };
    this.entries.push(entry);

    for (const cb of this.onLogCallbacks) {
      try {
        cb(entry);
      } catch {}
    }

    return entry;
  }

  public formatEntry(entry: SecurityLogEntry): string {
    const status = entry.success ? 'SUCCESS' : 'FAILURE';
    return `[${entry.timestamp}] ${status} sudo[${entry.uid}:${entry.username}]: ${entry.action} -> ${entry.targetResource} (${entry.message})`;
  }

  public getEntries(): SecurityLogEntry[] {
    return [...this.entries];
  }

  public getFormattedLog(): string {
    if (this.entries.length === 0) {
      return `[${new Date().toISOString()}] SYSTEM: Security audit log daemon initialized. No security events recorded.\n`;
    }
    return this.entries.map((e) => this.formatEntry(e)).join('\n') + '\n';
  }

  public onLog(cb: (entry: SecurityLogEntry) => void): () => void {
    this.onLogCallbacks.add(cb);
    return () => this.onLogCallbacks.delete(cb);
  }
}
