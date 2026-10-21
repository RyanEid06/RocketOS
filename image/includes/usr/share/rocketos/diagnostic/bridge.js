/**
 * RocketOS Phase 3 — Standalone Native Bridge Client for Diagnostic UI
 */
(function(window) {
  'use strict';

  class RocketNativeBridge {
    constructor() {
      this.requestId = 0;
      this.pendingRequests = new Map();
      this.isNative = Boolean(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rocketBridge);

      window.__rocketBridgeReceive = this.handleMessage.bind(this);
    }

    hasNativeHost() {
      return this.isNative;
    }

    handleMessage(rawMessage) {
      try {
        const response = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
        if (!response || typeof response !== 'object') return;
        const handler = this.pendingRequests.get(response.id);
        if (!handler) return;

        clearTimeout(handler.timeoutTimer);
        this.pendingRequests.delete(response.id);

        if (response.version !== 1) {
          handler.reject(new Error('Unsupported protocol version: ' + response.version));
          return;
        }

        if (response.success) {
          handler.resolve(response.data);
        } else {
          handler.reject(new Error(response.error || 'Native bridge error'));
        }
      } catch (err) {
        console.error('Bridge error processing message:', err);
      }
    }

    send(type, payload, timeoutMs = 5000) {
      const id = 'diag_' + (++this.requestId) + '_' + Date.now();
      const request = { version: 1, id, type, payload };

      return new Promise((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error('Request timed out: ' + type));
          }
        }, timeoutMs);

        this.pendingRequests.set(id, { resolve, reject, timeoutTimer });

        if (this.isNative) {
          window.webkit.messageHandlers.rocketBridge.postMessage(JSON.stringify(request));
        } else {
          setTimeout(() => this.simulatedResponse(request), 20);
        }
      });
    }

    ping() {
      return this.send('ping');
    }

    getSystemInfo() {
      return this.send('getSystemInfo');
    }

    getBridgeVersion() {
      return this.send('getBridgeVersion');
    }

    simulatedResponse(request) {
      let data = null;
      if (request.type === 'ping') {
        data = { pong: true, timestamp: Date.now() };
      } else if (request.type === 'getSystemInfo') {
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
          timestamp: new Date().toISOString()
        };
      } else if (request.type === 'getBridgeVersion') {
        data = {
          protocolVersion: 1,
          host: 'rocket-shell-host',
          webkitVersion: '6.0 (simulated)',
          gtkVersion: '4.18 (simulated)'
        };
      }

      this.handleMessage({ version: 1, id: request.id, type: request.type, success: true, data });
    }
  }

  window.rocketBridge = new RocketNativeBridge();
})(window);
