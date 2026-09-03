// SessionTypes.ts
// TypeScript bindings matching rocket/sessions/session.rocket

import { SystemUser } from '../filesystem/types';

export type SessionState = 'ACTIVE' | 'LOCKED' | 'TERMINATED';

export interface ElevationGrant {
  isElevated: boolean;
  grantedAtEpochMs: number;
  expiresAtEpochMs: number; // 0 for persistent root
  grantedByUid: number;
  targetUid: number;
  reason: string;
}

export interface UserSessionRecord {
  sessionId: string;
  user: SystemUser;
  startTimeEpochMs: number;
  lastActiveEpochMs: number;
  state: SessionState;
  elevation: ElevationGrant;
  workspaceId: number;
}
