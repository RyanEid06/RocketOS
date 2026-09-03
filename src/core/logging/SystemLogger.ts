// SystemLogger.ts
// Centralized System, Security, and Service Logging
// Persists authoritative system logs under /var/log in RocketFS

import { AuditLogger } from '../admin/AuditLogger';
import { RocketFS } from '../filesystem/RocketFS';
import { UserManager } from '../users/UserManager';

export class SystemLogger {
  private static instance: SystemLogger;

  private constructor() {}

  public static getInstance(): SystemLogger {
    if (!SystemLogger.instance) {
      SystemLogger.instance = new SystemLogger();
    }
    return SystemLogger.instance;
  }

  private appendLog(path: string, line: string): void {
    try {
      const fs = RocketFS.getInstance();
      const rootUser = UserManager.ROOT_USER;
      fs.appendFile(path, line + '\n', rootUser);
    } catch {
      // Best-effort in-memory fallback
    }
  }

  public logProcess(action: 'launched' | 'exited' | 'killed' | 'state_change', pid: number, name: string, detail?: string): void {
    const ts = new Date().toISOString();
    const line = `[${ts}] proc[${pid}:${name}]: ${action.toUpperCase()} ${detail ? `(${detail})` : ''}`;
    this.appendLog('/var/log/system.log', line);
    this.appendLog('/var/log/apps.log', line);
  }

  public logService(action: 'started' | 'stopped' | 'restarted' | 'failed', serviceId: string, status: string): void {
    const ts = new Date().toISOString();
    const line = `[${ts}] svc[${serviceId}]: ${action.toUpperCase()} - ${status}`;
    this.appendLog('/var/log/system.log', line);
    this.appendLog('/var/log/services.log', line);
  }

  public logSecurity(action: string, target: string, success: boolean, message: string): void {
    const user = UserManager.getInstance().getCurrentUser();
    const entry = AuditLogger.getInstance().logSecurity(user, action, target, success, message);
    const ts = new Date().toISOString();
    const status = success ? 'SUCCESS' : 'DENIED';
    const line = `[${ts}] ${status} auth[${user.uid}:${user.username}]: ${action} -> ${target} (${message})`;
    this.appendLog('/var/log/security.log', line);
    this.appendLog('/var/log/system.log', line);
  }

  public logSession(action: 'login' | 'logout' | 'lock' | 'unlock', username: string, sessionId: string): void {
    const ts = new Date().toISOString();
    const line = `[${ts}] session[${sessionId}]: USER ${username} ${action.toUpperCase()}`;
    this.appendLog('/var/log/security.log', line);
    this.appendLog('/var/log/system.log', line);
  }
}
