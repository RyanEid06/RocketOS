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
    expect(res.protocolVersion).toBe('1.0');
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

  it('dispatches messages via webkit message handler when native host is present', async () => {
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
    expect(sentJson.type).toBe('ping');

    // Simulate native GTK4 host answering via window.__rocketBridgeReceive
    const receiver = (globalThis as Record<string, unknown>).__rocketBridgeReceive as (msg: unknown) => void;
    expect(receiver).toBeDefined();

    receiver({
      id: sentJson.id,
      type: 'ping',
      success: true,
      data: { pong: true, timestamp: 123456789 },
    });

    const res = await promise;
    expect(res.pong).toBe(true);
    expect(res.timestamp).toBe(123456789);
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
      id: sentJson.id,
      type: 'ping',
      success: false,
      error: 'Host hardware error',
    });

    await expect(promise).rejects.toThrow('Host hardware error');
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
