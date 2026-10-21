/**
 * RocketOS Phase 3 — Native Bridge Protocol Types
 * Isolated Phase 3 Native Host boundary protocol.
 * Minimal typed interface to prove bridge connectivity, protocol version,
 * and safe host/build information.
 */

export const CURRENT_BRIDGE_PROTOCOL_VERSION = 1;

export interface BridgeRequest<T = unknown> {
  version: number;
  id: string;
  type: BridgeRequestType;
  payload?: T;
}

export type BridgeRequestType =
  | 'ping'
  | 'getBridgeVersion'
  | 'getSystemInfo';

export interface BridgeResponse<T = unknown> {
  version: number;
  id: string;
  type: BridgeRequestType;
  success: boolean;
  data?: T;
  error?: string;
}

export interface PingResponse {
  pong: boolean;
  timestamp: number;
}

export interface BridgeVersionInfo {
  protocolVersion: number;
  host: string;
  webkitVersion: string;
  gtkVersion: string;
}

export interface SafeSystemInfo {
  systemName: string;
  prettyName: string;
  id: string;
  versionId: string;
  kernelUname: string;
  arch: string;
  sessionType: 'wayland' | 'x11' | 'simulated';
  compositor: string;
  hostRuntime: string;
  sessionUser: string;
  hostname: string;
  initSystem: string;
  timestamp: string;
}
