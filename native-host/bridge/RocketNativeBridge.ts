/**
 * RocketOS Phase 3 — RocketNativeBridge Client
 * Isolated Phase 3 Native Host boundary client.
 * Provides typed, asynchronous communication between the WebKitGTK 6.0 webview
 * and the native GTK4 host runtime (rocket-shell-host).
 *
 * Scoped strictly to Phase 3 requirements:
 * 1. Ping / round-trip connectivity check
 * 2. Bridge / host version information
 * 3. Safe host / build information
 */

import {
  BridgeRequest,
  BridgeRequestType,
  BridgeResponse,
  PingResponse,
  BridgeVersionInfo,
  SafeSystemInfo,
  CURRENT_BRIDGE_PROTOCOL_VERSION,
} from './types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeoutTimer: ReturnType<typeof setTimeout>;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        rocketBridge?: {
          postMessage: (message: string) => void;
        };
      };
    };
    __rocketBridgeReceive?: (rawMessage: string | BridgeResponse) => void;
  }
}

export class RocketNativeBridge {
  private requestId = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 5000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.registerGlobalReceiver();
  }

  /**
   * Returns true if running inside the native GTK4 + WebKitGTK 6.0 host.
   */
  public hasNativeHost(): boolean {
    const g = typeof window !== 'undefined' ? window : (globalThis as unknown as Window);
    return Boolean(
      g &&
      g.webkit &&
      g.webkit.messageHandlers &&
      g.webkit.messageHandlers.rocketBridge
    );
  }

  /**
   * Registers the global JavaScript callback invoked by GTK4 WebKit script evaluation.
   */
  private registerGlobalReceiver(): void {
    const g = typeof window !== 'undefined' ? window : (globalThis as unknown as Window);
    if (!g) return;

    g.__rocketBridgeReceive = (rawMessage: string | BridgeResponse) => {
      this.handleIncomingMessage(rawMessage);
    };
  }

  /**
   * Processes response messages evaluated by the native host runtime.
   */
  public handleIncomingMessage(rawMessage: string | BridgeResponse): void {
    try {
      const response: BridgeResponse =
        typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;

      if (!response || typeof response !== 'object') {
        console.error('[RocketNativeBridge] Invalid message: not an object');
        return;
      }

      if (typeof response.id !== 'string' || !response.id) {
        console.error('[RocketNativeBridge] Invalid message: missing or invalid id');
        return;
      }

      const handler = this.pendingRequests.get(response.id);
      if (!handler) {
        return;
      }

      clearTimeout(handler.timeoutTimer);
      this.pendingRequests.delete(response.id);

      if (response.version !== CURRENT_BRIDGE_PROTOCOL_VERSION) {
        handler.reject(
          new Error(
            `Unsupported bridge response protocol version: ${response.version}. Expected ${CURRENT_BRIDGE_PROTOCOL_VERSION}`
          )
        );
        return;
      }

      if (response.success) {
        handler.resolve(response.data);
      } else {
        handler.reject(new Error(response.error || 'Native bridge operation failed'));
      }
    } catch (err) {
      console.error('[RocketNativeBridge] Failed to parse native response:', err);
    }
  }

  /**
   * Sends a typed request across the WebKitGTK user content manager bridge.
   */
  public send<T = unknown>(
    type: BridgeRequestType,
    payload?: unknown,
    timeoutMs = this.defaultTimeoutMs
  ): Promise<T> {
    const id = `req_${++this.requestId}_${Date.now()}`;
    const request: BridgeRequest = {
      version: CURRENT_BRIDGE_PROTOCOL_VERSION,
      id,
      type,
      payload,
    };

    return new Promise<T>((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Native bridge request timed out after ${timeoutMs}ms [type: ${type}]`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutTimer,
      });

      if (this.hasNativeHost()) {
        const g = typeof window !== 'undefined' ? window : (globalThis as unknown as Window);
        g.webkit!.messageHandlers!.rocketBridge!.postMessage(JSON.stringify(request));
      } else {
        // Fallback for browser preview / headless tests without native WebKitGTK
        setTimeout(() => this.simulateFallback(request), 10);
      }
    });
  }

  /**
   * Minimum required Phase 3 bridge methods:
   */

  /** 1. Ping / round-trip latency check */
  public ping(): Promise<PingResponse> {
    return this.send<PingResponse>('ping');
  }

  /** 2. Bridge protocol and runtime component version information */
  public getBridgeVersion(): Promise<BridgeVersionInfo> {
    return this.send<BridgeVersionInfo>('getBridgeVersion');
  }

  /** 3. Safe, read-only host and build identification */
  public getSystemInfo(): Promise<SafeSystemInfo> {
    return this.send<SafeSystemInfo>('getSystemInfo');
  }

  /**
   * Provides non-native test/fallback data labeled in compliance with Rule 4 (SIMULATED).
   */
  private simulateFallback(request: BridgeRequest): void {
    let data: unknown = null;

    switch (request.type) {
      case 'ping':
        data = { pong: true, timestamp: Date.now() };
        break;

      case 'getBridgeVersion':
        data = {
          protocolVersion: CURRENT_BRIDGE_PROTOCOL_VERSION,
          host: 'rocket-shell-host (simulated)',
          webkitVersion: '6.0 (simulated)',
          gtkVersion: '4.18 (simulated)',
        };
        break;

      case 'getSystemInfo':
        data = {
          systemName: 'RocketOS',
          prettyName: 'RocketOS 0.1 Alpha (Preview)',
          id: 'rocketos',
          versionId: '0.1',
          kernelUname: 'Linux local 6.12.0-rocketos #1 SMP amd64',
          arch: 'x86_64',
          sessionType: 'simulated',
          compositor: 'cage (simulated)',
          hostRuntime: 'rocket-shell-host (GTK4 + WebKitGTK 6.0)',
          sessionUser: 'rocket',
          hostname: 'rocketos',
          initSystem: 'systemd',
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        this.handleIncomingMessage({
          version: CURRENT_BRIDGE_PROTOCOL_VERSION,
          id: request.id,
          type: request.type,
          success: false,
          error: `Unsupported bridge request type: ${request.type}`,
        });
        return;
    }

    this.handleIncomingMessage({
      version: CURRENT_BRIDGE_PROTOCOL_VERSION,
      id: request.id,
      type: request.type,
      success: true,
      data,
    });
  }
}
