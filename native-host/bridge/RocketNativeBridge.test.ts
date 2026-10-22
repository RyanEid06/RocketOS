import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RocketNativeBridge } from './RocketNativeBridge';

describe('RocketNativeBridge (Phase 3 Isolated Native Bridge Protocol)', () => {
  let bridge: RocketNativeBridge;

  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).webkit;
    delete (globalThis as Record<string, unknown>).__rocketBridgeReceive;
    bridge = new RocketNativeBridge(1000);
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).webkit;
    delete (globalThis as Record<string, unknown>).__rocketBridgeReceive;
  });

  it('detects absence of native WebKitGTK host correctly in test/browser environment', () => {
    expect(bridge.hasNativeHost()).toBe(false);
  });

  it('detects presence of native WebKitGTK user content message handler', () => {
    (globalThis as Record<string, unknown>).webkit = {
      messageHandlers: {
        rocketBridge: {
          postMessage: vi.fn(),
        },
      },
    };
    expect(bridge.hasNativeHost()).toBe(true);
  });

  it('returns valid simulated ping response when no native host is present', async () => {
    const res = await bridge.ping();
    expect(res).toBeDefined();
    expect(res.pong).toBe(true);
    expect(typeof res.timestamp).toBe('number');
  });

  it('returns valid simulated bridge version info', async () => {
    const res = await bridge.getBridgeVersion();
    expect(res.protocolVersion).toBe(1);
    expect(res.webkitVersion).toContain('6.0');
    expect(res.gtkVersion).toContain('4.');
  });

  it('returns safe system info identifying RocketOS and session configuration', async () => {
    const info = await bridge.getSystemInfo();
    expect(info.systemName).toBe('RocketOS');
    expect(info.id).toBe('rocketos');
    expect(info.sessionUser).toBe('rocket');
    expect(info.compositor).toContain('cage');
    expect(info.hostRuntime).toContain('GTK4 + WebKitGTK 6.0');
  });

  it('includes protocol version 1 on outgoing requests', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as Record<string, unknown>).webkit = {
      messageHandlers: {
        rocketBridge: {
          postMessage: postMessageSpy,
        },
      },
    };

    const nativeBridge = new RocketNativeBridge(1000);
    void nativeBridge.ping();

    expect(postMessageSpy).toHaveBeenCalledOnce();
    const sentJson = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sentJson.version).toBe(1);
    expect(sentJson.type).toBe('ping');
    expect(typeof sentJson.id).toBe('string');
    expect(sentJson.id.length).toBeGreaterThan(0);
  });

  it('dispatches messages via webkit message handler and handles valid version response', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as Record<string, unknown>).webkit = {
      messageHandlers: {
        rocketBridge: {
          postMessage: postMessageSpy,
        },
      },
    };

    const nativeBridge = new RocketNativeBridge(1000);
    const promise = nativeBridge.ping();

    expect(postMessageSpy).toHaveBeenCalledOnce();
    const sentJson = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(sentJson.version).toBe(1);
    expect(sentJson.type).toBe('ping');

    // Simulate native GTK4 host answering with valid version
    const receiver = (globalThis as Record<string, unknown>).__rocketBridgeReceive as (msg: unknown) => void;
    expect(receiver).toBeDefined();

    receiver({
      version: 1,
      id: sentJson.id,
      type: 'ping',
      success: true,
      data: { pong: true, timestamp: 123456789 },
    });

    const res = await promise;
    expect(res.pong).toBe(true);
    expect(res.timestamp).toBe(123456789);
  });

  it('rejects response when native host returns an unsupported protocol version', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as Record<string, unknown>).webkit = {
      messageHandlers: {
        rocketBridge: {
          postMessage: postMessageSpy,
        },
      },
    };

    const nativeBridge = new RocketNativeBridge(1000);
    const promise = nativeBridge.ping();

    const sentJson = JSON.parse(postMessageSpy.mock.calls[0][0]);
    const receiver = (globalThis as Record<string, unknown>).__rocketBridgeReceive as (msg: unknown) => void;

    // Simulate response with unsupported protocol version 99
    receiver({
      version: 99,
      id: sentJson.id,
      type: 'ping',
      success: true,
      data: { pong: true, timestamp: 123456789 },
    });

    await expect(promise).rejects.toThrow(/Unsupported bridge response protocol version: 99/);
  });

  it('handles native error responses gracefully', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as Record<string, unknown>).webkit = {
      messageHandlers: {
        rocketBridge: {
          postMessage: postMessageSpy,
        },
      },
    };

    const nativeBridge = new RocketNativeBridge(1000);
    const promise = nativeBridge.ping();

    const sentJson = JSON.parse(postMessageSpy.mock.calls[0][0]);
    const receiver = (globalThis as Record<string, unknown>).__rocketBridgeReceive as (msg: unknown) => void;

    receiver({
      version: 1,
      id: sentJson.id,
      type: 'ping',
      success: false,
      error: 'Host hardware error',
    });

    await expect(promise).rejects.toThrow('Host hardware error');
  });

  it('safely handles malformed and invalid messages without throwing or crashing', () => {
    const nativeBridge = new RocketNativeBridge(1000);
    const receiver = (globalThis as Record<string, unknown>).__rocketBridgeReceive as (msg: unknown) => void;

    expect(() => {
      // Malformed string
      receiver('{"not-valid-json');
      // Primitive instead of object
      receiver(42);
      // Null
      receiver(null);
      // Object missing id
      receiver({ version: 1, type: 'ping' });
      // Unknown request id
      receiver({ version: 1, id: 'unknown_req_id', type: 'ping', success: true });
    }).not.toThrow();
  });

  it('rejects on timeout if native host does not respond', async () => {
    (globalThis as Record<string, unknown>).webkit = {
      messageHandlers: {
        rocketBridge: {
          postMessage: vi.fn(), // never calls __rocketBridgeReceive
        },
      },
    };

    const fastTimeoutBridge = new RocketNativeBridge(50);
    await expect(fastTimeoutBridge.ping()).rejects.toThrow(/timed out/);
  });
});

describe('Phase 3 Shell Host & WebKit Sandbox Contract', () => {
  const hostScriptPath = path.resolve(__dirname, '../../image/includes/usr/local/bin/rocket-shell-host');
  const sessionScriptPath = path.resolve(__dirname, '../../image/includes/usr/local/bin/rocketos-session');

  it('defines diagnostic directory and mounts it to WebKit sandbox before WebView creation', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('DIAGNOSTIC_DIR = "/usr/share/rocketos/diagnostic"');
    expect(hostContent).toContain('default_context = WebKit.WebContext.get_default()');
    expect(hostContent).toContain('default_context.add_path_to_sandbox(DIAGNOSTIC_DIR, True)');

    const sandboxIdx = hostContent.indexOf('default_context.add_path_to_sandbox');
    const webviewCreateIdx = hostContent.indexOf('WebKit.WebView.new_with_user_content_manager');
    expect(sandboxIdx).toBeGreaterThan(0);
    expect(webviewCreateIdx).toBeGreaterThan(0);
    expect(sandboxIdx).toBeLessThan(webviewCreateIdx);
  });

  it('verifies obsolete WEBKIT_FORCE_SANDBOX=0 is absent from session launcher', () => {
    const sessionContent = fs.readFileSync(sessionScriptPath, 'utf8');
    expect(sessionContent).not.toContain('WEBKIT_FORCE_SANDBOX');
    expect(sessionContent).toContain('WEBKIT_DISABLE_COMPOSITING_MODE=1');
    expect(sessionContent).toContain('WEBKIT_DISABLE_DMABUF_RENDERER=1');
  });

  it('verifies UI marker creation is strictly tied to successful WebKit FINISHED event', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('event == WebKit.LoadEvent.FINISHED');
    expect(hostContent).toContain('create_runtime_marker(UI_LOADED_MARKER)');
    expect(hostContent).toContain('if self.load_failed:');
    expect(hostContent).toContain('refusing to create UI_LOADED_MARKER');
  });

  it('verifies bridge marker creation is strictly tied to an actual native ping request', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('if req_type == "ping":');
    expect(hostContent).toContain('create_runtime_marker(BRIDGE_PING_MARKER)');
  });

  it('verifies failure evidence includes web-process-terminated signal handler', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('self.webview.connect("web-process-terminated", self.on_web_process_terminated)');
    expect(hostContent).toContain('def on_web_process_terminated(self, webview, reason):');
    expect(hostContent).toContain('WEBKIT_ERROR_FILE');
    expect(hostContent).toContain('WEB_PROCESS_TERMINATED: reason=');
  });
});

