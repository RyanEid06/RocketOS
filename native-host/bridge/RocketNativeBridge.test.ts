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
    const webviewCreateIdx = hostContent.indexOf('self.webview = WebKit.WebView(');
    expect(sandboxIdx).toBeGreaterThan(0);
    expect(webviewCreateIdx).toBeGreaterThan(0);
    expect(sandboxIdx).toBeLessThan(webviewCreateIdx);
  });

  it('verifies Skia CPU and SHM transport rendering profile in session launcher and Cage flags', () => {
    const sessionContent = fs.readFileSync(sessionScriptPath, 'utf8');
    expect(sessionContent).not.toContain('WEBKIT_FORCE_SANDBOX');
    // Obsolete and broken disabling flags must not be exported
    expect(sessionContent).not.toContain('export WEBKIT_DISABLE_COMPOSITING_MODE=1');
    expect(sessionContent).not.toContain('export WEBKIT_DISABLE_DMABUF_RENDERER=1');
    expect(sessionContent).toContain('unset WEBKIT_DISABLE_COMPOSITING_MODE');
    expect(sessionContent).toContain('unset WEBKIT_DISABLE_DMABUF_RENDERER');

    // Safe WebKitGTK 2.54 Skia CPU and SHM rendering profile
    expect(sessionContent).toContain('export WEBKIT_SKIA_ENABLE_CPU_RENDERING=1');
    expect(sessionContent).toContain('export WEBKIT_DMABUF_RENDERER_FORCE_SHM=1');
    expect(sessionContent).toContain('export LIBGL_ALWAYS_SOFTWARE=1');
    expect(sessionContent).toContain('export WLR_RENDERER=');

    // Cage kiosk invocation uses valid Trixie -s flag (VT switching) and strictly avoids unsupported uppercase -D
    expect(sessionContent).toContain('/usr/bin/cage -s -- /usr/local/bin/rocket-shell-host');
    expect(sessionContent).not.toContain('/usr/bin/cage -s -D');
    expect(sessionContent).not.toContain(' -D ');
    expect(sessionContent).toContain('CAGE_VERSION="$(/usr/bin/cage -v 2>&1 || true)"');
  });

  it('verifies rocket-shell-host does not force HardwareAccelerationPolicy.NEVER', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).not.toContain('HardwareAccelerationPolicy.NEVER');
    expect(hostContent).toContain('get_hardware_acceleration_policy');
    expect(hostContent).toContain('WEBKIT_SKIA_ENABLE_CPU_RENDERING');
    expect(hostContent).toContain('WEBKIT_DMABUF_RENDERER_FORCE_SHM');
  });

  it('verifies strict WebKitGTK 6 message handler registration and diagnostic asset validation', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    // WebKitGTK 6 expects (name: str, world_name: Optional[str])
    expect(hostContent).toContain('register_script_message_handler(\n                    "rocketBridge",\n                    None,\n                )');
    expect(hostContent).toContain('if not reg_ok:');
    expect(hostContent).toContain('raise RuntimeError');
    expect(hostContent).toContain('BRIDGE_HANDLER_REGISTERED');

    // Strict diagnostic asset check: fails immediately if missing without fallback HTML
    expect(hostContent).toContain('DIAGNOSTIC_ASSET_MISSING');
    expect(hostContent).toContain('Required Phase 3 diagnostic asset missing:');
    expect(hostContent).not.toContain('get_fallback_html');
    expect(hostContent).not.toContain('about:blank');
  });

  it('maintains per-PID generation state, log, and error evidence with correct startup marker lifecycle', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('HOST_PID = os.getpid()');
    expect(hostContent).toContain('GEN_STATE_FILE = f"{STATE_FILE}.{HOST_PID}"');
    expect(hostContent).toContain('GEN_LOG_FILE = f"{HOST_LOG_FILE}.{HOST_PID}"');
    expect(hostContent).toContain('GEN_ERROR_FILE = f"{WEBKIT_ERROR_FILE}.{HOST_PID}"');
    expect(hostContent).toContain('def write_error_evidence(error_type: str, details: str):');
    expect(hostContent).toContain('os.replace(tmp_gen, GEN_STATE_FILE)');
    expect(hostContent).toContain('os.replace(tmp_shared, STATE_FILE)');

    // Startup marker cleanup occurs before PROCESS_STARTED and never in do_activate()
    const cleanupIdx = hostContent.indexOf('cleanup_stale_markers()');
    const processStartedIdx = hostContent.indexOf('write_state("PROCESS_STARTED"');
    const activateIdx = hostContent.indexOf('def do_activate(self):');
    const aliveMarkerIdx = hostContent.indexOf('create_runtime_marker(ALIVE_MARKER)');

    expect(cleanupIdx).toBeGreaterThan(0);
    expect(processStartedIdx).toBeGreaterThan(cleanupIdx);
    expect(activateIdx).toBeGreaterThan(processStartedIdx);
    expect(aliveMarkerIdx).toBeGreaterThan(activateIdx);

    // Verify cleanup_stale_markers is not called inside do_activate
    const doActivateBody = hostContent.slice(activateIdx, hostContent.indexOf('def on_load_changed'));
    expect(doActivateBody).not.toContain('cleanup_stale_markers()');
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
      'WEBVIEW_CONSTRUCTION_ENTER',
      'WEBVIEW_CREATED',
      'WINDOW_CHILD_SET',
      'DIAGNOSTIC_ASSET_MISSING',
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

  it('verifies WebKitGTK 6 compatibility by ensuring removed 4.x constructors are not used', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    // WebKitGTK 6.0 removed specialized C/GI constructors
    expect(hostContent).not.toContain('WebKit.WebView.new_with_user_content_manager');
    expect(hostContent).not.toContain('WebKit.WebView.new_with_settings');
    expect(hostContent).not.toContain('WebKit.WebView.new_with_context');

    // Verifies WebKitGTK 6 strict GObject construct property usage with network_session
    expect(hostContent).toContain('network_session=default_session');
    expect(hostContent).toContain('user_content_manager=self.user_content_manager');
    expect(hostContent).toContain('settings=settings');

    // Verifies absence of degraded fallback construction that omits network_session
    expect(hostContent).not.toContain('fallback constructing WebView');
    expect(hostContent).not.toContain('attempting hyphenated properties');

    // Verifies GI introspection property validation
    expect(hostContent).toContain('WebKit.WebView.list_properties');
    expect(hostContent).toContain('"user-content-manager"');
    expect(hostContent).toContain('"settings"');
    expect(hostContent).toContain('"network-session"');

    // Verifies that constructor errors or missing properties trigger HOST_FATAL_EXCEPTION via do_activate handler
    expect(hostContent).toContain('record_fatal_exception(exc, "do_activate")');
  });

  it('verifies top-level exception protection in main() and do_activate() with non-zero exit', () => {
    const hostContent = fs.readFileSync(hostScriptPath, 'utf8');
    expect(hostContent).toContain('def record_fatal_exception(exc: Exception, context: str = ""):');
    expect(hostContent).toContain('write_state("HOST_FATAL_EXCEPTION", detail)');
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

  it('collects expected generation evidence, runtime versions, and rendering profile in debug evidence', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('EXPECTED HOST GENERATION:');
    expect(probeContent).toContain('CURRENT HOST GENERATION:');
    expect(probeContent).toContain('CAGE SESSION EXIT DIAGNOSTICS:');
    expect(probeContent).toContain('CAGE / WEBKIT RUNTIME:');
    expect(probeContent).toContain('Cage version:');
    expect(probeContent).toContain('GTK version:');
    expect(probeContent).toContain('WebKitGTK version:');
    expect(probeContent).toContain('RENDERING PROFILE:');
    expect(probeContent).toContain('WEBKIT_SKIA_ENABLE_CPU_RENDERING');
    expect(probeContent).toContain('WEBKIT_DMABUF_RENDERER_FORCE_SHM');
    expect(probeContent).toContain('WEBKIT_DISABLE_COMPOSITING_MODE');
    expect(probeContent).toContain('WEBKIT_DISABLE_DMABUF_RENDERER');
    expect(probeContent).toContain('ENVIRONMENT & SANDBOX PREREQUISITES:');
    expect(probeContent).toContain('command -v bwrap:');
    expect(probeContent).toContain('bwrap --version:');
    expect(probeContent).toContain('sysctl kernel.unprivileged_userns_clone:');
    expect(probeContent).toContain('cat /proc/sys/user/max_user_namespaces:');
    expect(probeContent).toContain('ls -l /usr/share/rocketos/diagnostic:');
    expect(probeContent).toContain('stat /usr/share/rocketos/diagnostic/index.html:');
  });

  it('resolves expected PID from .PID evidence and maps Cage exit status 133 to shell_host_native_sigtrap', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('local gen_state_file="${STATE_FILE}.${expected_pid}"');
    expect(probeContent).toContain('local gen_error_file="${WEBKIT_ERROR_FILE}.${expected_pid}"');
    expect(probeContent).toContain('diagnostic_asset_missing');
    expect(probeContent).toContain('shell_host_native_sigtrap');
    expect(probeContent).toContain('shell_host_native_signal');
    expect(probeContent).toContain('shell_host_startup_failure');
    expect(probeContent).toContain('shell_host_exception');
    expect(probeContent).toContain('webview_creation_failure');
    expect(probeContent).toContain('webkit_process_terminated');
    expect(probeContent).toContain('webkit_load_failed');
    expect(probeContent).toContain('ui_marker_creation_failure');
    expect(probeContent).toContain('shell_host_pid_mismatch');
    expect(probeContent).toContain('ui_marker_timeout');
  });

  it('detects early graphical launcher failures and resolves newest generation PID from state files', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('graphical_session_launcher_failure');
    expect(probeContent).toContain('NRestarts');
    expect(probeContent).toContain('ExecMainStatus');
    expect(probeContent).toContain('HOST_DISCOVERY_FAILED_RESOLVING_NEWEST_GENERATION');
    expect(probeContent).toContain('ls -1t "${STATE_FILE}".*');
  });

  it('enforces generation-aware PID validation matching without masking crashes', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('kill -0 "${STATE_PID}"');
    expect(probeContent).toContain('kill -0 "${HOST_PID}"');
    expect(probeContent).toContain('"shell_host_pid_mismatch"');
  });

  it('preserves the 60-second readiness timeout and WP5 recovery verification gate', () => {
    const probeContent = fs.readFileSync(probeScriptPath, 'utf8');
    expect(probeContent).toContain('INITIAL_READINESS_TIMEOUT_SECS=60');
    expect(probeContent).toContain('RECOVERY_READINESS_TIMEOUT_SECS=60');
    expect(probeContent).toContain('ROCKETOS_WP5_RECOVERY_TEST_PASS');
  });

  it('writes at least 300 serial lines to dedicated failure log artifact and preserves dual BIOS/UEFI', () => {
    const smokeContent = fs.readFileSync(smokeTestPath, 'utf8');
    expect(smokeContent).toContain('FAILURE_LOG="${LOG_DIR}/qemu-failure-phase3-${BOOT_MODE}.log"');
    expect(smokeContent).toContain('tail -n 300 "${LOG_FILE}" > "${FAILURE_LOG}"');
    expect(smokeContent).toContain('cat "${FAILURE_LOG}"');
    expect(smokeContent).toContain('BOOT_MODE="bios"');
    expect(smokeContent).toContain('--mode)');
    expect(smokeContent).toContain('ROCKETOS_PHASE3_GRAPHICAL_BOOT_OK');
    expect(smokeContent).toContain('UI_LOADED_MARKER: verified');
    expect(smokeContent).toContain('BRIDGE_PING_MARKER: verified');
    expect(smokeContent).toContain('ROCKETOS_WP5_RECOVERY_TEST_PASS');
  });
});

