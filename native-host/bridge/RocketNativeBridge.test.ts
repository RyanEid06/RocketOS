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

  it('records all authoritative lifecycle state transitions in rocket-shell-host', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    const requiredStates = [
      'PROCESS_STARTED',
      'GI_IMPORT_OK',
      'APPLICATION_CREATED',
      'APPLICATION_RUN_ENTER',
      'GTK_ACTIVATE_ENTER',
      'WEB_CONTEXT_READY',
      'CONTENT_MANAGER_CREATED',
      'BRIDGE_HANDLER_REGISTERED',
      'SETTINGS_CREATED',
      'WEBVIEW_CREATED',
      'WINDOW_CHILD_SET',
      'LOAD_URI_REQUESTED',
      'GTK_WINDOW_PRESENTED',
      'WEBKIT_LOAD_STARTED',
      'WEBKIT_LOAD_REDIRECTED',
      'WEBKIT_LOAD_COMMITTED',
      'WEBKIT_LOAD_FINISHED',
      'WEBKIT_LOAD_FAILED',
      'WEBKIT_PROCESS_TERMINATED',
      'UI_MARKER_CREATED',
      'BRIDGE_PING_RECEIVED',
      'BRIDGE_MARKER_CREATED',
      'APPLICATION_EXITED',
      'HOST_FATAL_EXCEPTION',
    ];

    for (const state of requiredStates) {
      expect(hostContent).toContain(`"${state}"`);
    }
  });

  it('verifies top-level exception protection in main() and do_activate() with non-zero exit', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('def record_fatal_exception(exc: Exception, context: str = ""):');
    expect(hostContent).toContain('write_state("HOST_FATAL_EXCEPTION", detail)');
    expect(hostContent).toContain('f.write(f"HOST_FATAL_EXCEPTION:');
    expect(hostContent).toContain('record_fatal_exception(exc, "do_activate")');
    expect(hostContent).toContain('record_fatal_exception(exc, "main")');
  });

  it('verifies dedicated host log file writing does not crash on failure', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('HOST_LOG_FILE = os.path.join(RUNTIME_DIR, "rocketos-shell-host.log")');
    expect(hostContent).toContain('with open(HOST_LOG_FILE, "a") as f:');
  });
});

describe('Phase 3 Boot Probe Diagnostics & Failure Code Resolution Contract', () => {
  const probeScriptPath = path.resolve(__dirname, '../../image/includes/usr/local/bin/rocketos-boot-probe');
  const smokeTestPath = path.resolve(__dirname, '../../scripts/phase3/smoke-test-qemu.sh');

  it('collects shell-host state, alive marker, host log, and sandbox prerequisites in debug evidence', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('Shell Host State:');
    expect(probeContent).toContain('Shell Host Alive Marker:');
    expect(probeContent).toContain('Shell Host Log (last 100 lines):');
    expect(probeContent).toContain('ENVIRONMENT & SANDBOX PREREQUISITES:');
    expect(probeContent).toContain('command -v bwrap:');
    expect(probeContent).toContain('bwrap --version:');
    expect(probeContent).toContain('sysctl kernel.unprivileged_userns_clone:');
    expect(probeContent).toContain('cat /proc/sys/user/max_user_namespaces:');
    expect(probeContent).toContain('ls -l /usr/share/rocketos/diagnostic:');
    expect(probeContent).toContain('stat /usr/share/rocketos/diagnostic/index.html:');
  });

  it('resolves specific failure codes for distinct WebKit and host failure modes', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('resolve_readiness_failure_code()');
    expect(probeContent).toContain('shell_host_startup_failure');
    expect(probeContent).toContain('shell_host_exception');
    expect(probeContent).toContain('webview_creation_failure');
    expect(probeContent).toContain('webkit_process_terminated');
    expect(probeContent).toContain('webkit_load_failed');
    expect(probeContent).toContain('ui_marker_creation_failure');
    expect(probeContent).toContain('shell_host_pid_mismatch');
    expect(probeContent).toContain('ui_marker_timeout');
  });

  it('enforces PID validation matching between discovered host, state file, and alive marker', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('Host state PID mismatch');
    expect(probeContent).toContain('Host alive marker PID mismatch');
    expect(probeContent).toContain('"shell_host_pid_mismatch"');
  });

  it('preserves the 60-second readiness timeout and WP5 recovery verification gate', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('INITIAL_READINESS_TIMEOUT_SECS=60');
    expect(probeContent).toContain('RECOVERY_READINESS_TIMEOUT_SECS=60');
    expect(probeContent).toContain('ROCKETOS_WP5_RECOVERY_TEST_PASS');
  });

  it('preserves dual BIOS and UEFI smoke test execution in QEMU runner', () => {
    const smokeContent = fs.readFileSync(smokeTestPath, 'utf8');
    expect(smokeContent).toContain('BOOT_MODE="bios"');
    expect(smokeContent).toContain('--mode)');
    expect(smokeContent).toContain('ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK');
    expect(smokeContent).toContain('UI_LOADED_MARKER: verified');
    expect(smokeContent).toContain('BRIDGE_PING_MARKER: verified');
    expect(smokeContent).toContain('ROCKETOS_WP5_RECOVERY_TEST_PASS');
  });
});

