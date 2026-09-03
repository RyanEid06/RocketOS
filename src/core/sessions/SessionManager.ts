// SessionManager.ts
// Authoritative Session & Privilege Elevation Supervisor for RocketOS
// Implements rocket/sessions/session.rocket domain model

import { SystemLogger } from '../logging/SystemLogger';
import { ProcessManager } from '../process/ProcessManager';
import { UserManager } from '../users/UserManager';
import { ElevationGrant, SessionState, UserSessionRecord } from './SessionTypes';

export class SessionManager {
  private static instance: SessionManager;

  private currentSession: UserSessionRecord;
  private listeners: Set<() => void> = new Set();
  private logger = SystemLogger.getInstance();

  private constructor() {
    const userMgr = UserManager.getInstance();
    const normalUser = userMgr.getCurrentUser();
    const now = Date.now();

    this.currentSession = {
      sessionId: 'session-ryan-1',
      user: normalUser,
      startTimeEpochMs: now,
      lastActiveEpochMs: now,
      state: 'ACTIVE',
      elevation: {
        isElevated: normalUser.uid === 0,
        grantedAtEpochMs: normalUser.uid === 0 ? now : 0,
        expiresAtEpochMs: 0,
        grantedByUid: normalUser.uid === 0 ? 0 : -1,
        targetUid: 0,
        reason: normalUser.uid === 0 ? 'Root Initial' : '',
      },
      workspaceId: 1,
    };

    // Keep session user synchronized with UserManager
    userMgr.subscribe((user) => {
      this.currentSession.user = user;
      if (user.uid === 0) {
        this.currentSession.elevation.isElevated = true;
        this.currentSession.elevation.expiresAtEpochMs = 0;
      }
      this.notify();
    });
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public getCurrentSession(): UserSessionRecord {
    this.checkElevationExpiry();
    return this.currentSession;
  }

  public isElevated(): boolean {
    this.checkElevationExpiry();
    if (this.currentSession.user.uid === 0) return true;
    return this.currentSession.elevation.isElevated;
  }

  private checkElevationExpiry(): void {
    if (
      this.currentSession.elevation.isElevated &&
      this.currentSession.elevation.expiresAtEpochMs > 0 &&
      Date.now() > this.currentSession.elevation.expiresAtEpochMs
    ) {
      this.currentSession.elevation.isElevated = false;
      this.logger.logSecurity('elevation_expired', 'session', true, 'Temporary sudo authorization expired');
      this.notify();
    }
  }

  // =========================================================================
  // PRIVILEGE ELEVATION (SUDO)
  // =========================================================================
  public requestElevation(
    operation: string,
    reason = 'Administrative action',
    durationMs = 5 * 60 * 1000 // 5 minutes standard sudo timeout
  ): { success: boolean; message: string } {
    const userMgr = UserManager.getInstance();
    const user = this.currentSession.user;

    if (!userMgr.canElevate(user)) {
      const msg = `User '${user.username}' is not in the sudoers/admin group (GID 10). Elevation denied.`;
      this.logger.logSecurity('elevation_denied', operation, false, msg);
      return { success: false, message: msg };
    }

    const now = Date.now();
    this.currentSession.elevation = {
      isElevated: true,
      grantedAtEpochMs: now,
      expiresAtEpochMs: now + durationMs,
      grantedByUid: user.uid,
      targetUid: 0,
      reason,
    };

    const msg = `Granted administrative elevation to '${user.username}' for 5 minutes (${operation})`;
    this.logger.logSecurity('elevation_granted', operation, true, msg);
    this.notify();
    return { success: true, message: msg };
  }

  public dropElevation(): void {
    this.currentSession.elevation.isElevated = false;
    this.currentSession.elevation.expiresAtEpochMs = 0;
    if (this.currentSession.user.uid === 0) {
      UserManager.getInstance().dropToNormalUser();
    }
    this.logger.logSecurity('elevation_dropped', 'session', true, 'Session dropped to unprivileged state');
    this.notify();
  }

  // =========================================================================
  // SESSION LIFECYCLE
  // =========================================================================
  public lockSession(): void {
    this.currentSession.state = 'LOCKED';
    this.logger.logSession('lock', this.currentSession.user.username, this.currentSession.sessionId);
    this.notify();
  }

  public unlockSession(): boolean {
    this.currentSession.state = 'ACTIVE';
    this.currentSession.lastActiveEpochMs = Date.now();
    this.logger.logSession('unlock', this.currentSession.user.username, this.currentSession.sessionId);
    this.notify();
    return true;
  }

  public switchUser(username: string): boolean {
    const userMgr = UserManager.getInstance();
    const target = userMgr.getUserByUsername(username);
    if (!target) return false;

    this.logger.logSession('logout', this.currentSession.user.username, this.currentSession.sessionId);
    userMgr.switchUser(username);

    this.currentSession.sessionId = `session-${username}-${Date.now() % 10000}`;
    this.currentSession.user = target;
    this.currentSession.startTimeEpochMs = Date.now();
    this.currentSession.state = 'ACTIVE';
    this.currentSession.elevation.isElevated = target.uid === 0;

    this.logger.logSession('login', target.username, this.currentSession.sessionId);
    this.notify();
    return true;
  }

  public getSessionProcesses() {
    return ProcessManager.getInstance().getProcessesBySession(this.currentSession.sessionId);
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {}
    }
  }
}
