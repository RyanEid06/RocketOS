// constants.ts
// Authoritative protocol constants for Rocket Core IPC / HTTP interface

export const ROCKET_CORE_PROTOCOL = 1;

export const DEFAULT_ROCKET_CORE_PORT = 5180;
export const DEFAULT_ROCKET_CORE_HOST = '127.0.0.1';

export const CORE_API_PREFIX = '/core/v1';

export interface ProtocolHandshake {
  protocolVersion: number;
  engine: string;
  runtimeVersion: string;
  bootId: string;
  bootTimestampMs: number;
  serverTimeIso: string;
}
