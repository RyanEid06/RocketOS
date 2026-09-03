// src/core-api/RocketCoreHost.integration.test.ts
// Integration test: boots the actual Rocket Core Host on localhost and tests real IPC / RocketFS operations

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRocketCoreHost, RocketCoreHostInstance } from '../../rocket/core-host/server';
import { RocketCoreClient } from './RocketCoreClient';
import { ROCKET_CORE_PROTOCOL } from './protocol/constants';
import path from 'path';
import fs from 'fs';

describe('Rocket Core Host Integration Proof Test', () => {
  let hostInstance: RocketCoreHostInstance;
  let client: RocketCoreClient;
  const testPort = 5188;
  const testHost = '127.0.0.1';
  const testToken = `test_token_${Date.now()}`;
  const testDataDir = path.resolve(process.cwd(), '.rocketos-test-data');

  beforeAll(async () => {
    // 1. Boot the actual Rocket Core Host
    hostInstance = await createRocketCoreHost({
      host: testHost,
      port: testPort,
      authToken: testToken,
      dataDir: testDataDir,
      silent: true,
    });

    // 2. Instantiate RocketCoreClient
    client = new RocketCoreClient({
      baseUrl: `http://${testHost}:${testPort}`,
      authToken: testToken,
      timeoutMs: 5000,
    });
  });

  afterAll(async () => {
    // Clean up test server and directories
    await hostInstance.stop();
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  it('connects to real Rocket Core Host and receives genuine compiler identity', async () => {
    const handshake = await client.connect();

    expect(handshake.protocolVersion).toBe(ROCKET_CORE_PROTOCOL);
    expect(handshake.engine).toBe('rocketc');
    expect(handshake.runtimeVersion).toContain('2.1.0');
    expect(handshake.bootId).toBe(hostInstance.bootId);
    expect(handshake.bootTimestampMs).toBeGreaterThan(0);
    expect(client.isConnected).toBe(true);
  });

  it('retrieves system diagnostics and proves native core execution', async () => {
    const diag = await client.getDiagnostics();

    expect(diag.providerType).toBe('rocket-core');
    expect(diag.providerName).toBe('Rocket Core Host (Native)');
    expect(diag.compilerIdentity).toContain('rocketc 2.1.0 Self-Hosted');
    expect(diag.engineIdentity).toContain('rocketc');
    expect(diag.bootId).toBe(hostInstance.bootId);
    expect(diag.storageBackend).toBeDefined();
  });

  it('retrieves system manifest matching RocketOS 2.1 ABI v1 specification', async () => {
    const manifest = await client.system.getManifest();

    expect(manifest.osName).toBe('RocketOS');
    expect(manifest.osVersion).toBe('0.1.0-alpha');
    expect(manifest.abiVersion).toBe('ABI v1');
    expect(manifest.protocolVersion).toBe(ROCKET_CORE_PROTOCOL);
    expect(manifest.hardware.cores).toBe(8);
  });

  it('performs RocketFS file manipulation, persistence, and verification through the API', async () => {
    const testFilePath = '/home/ryan/integration_proof.txt';
    const initialContent = `Proof of genuine Rocket execution: ${Date.now()}`;

    // 1. Create file
    await client.fs.createFile(testFilePath, initialContent);

    // 2. Read file back
    const readBack = await client.fs.read(testFilePath);
    expect(readBack).toBe(initialContent);

    // 3. Stat file
    const stat = await client.fs.stat(testFilePath);
    expect(stat.path).toBe(testFilePath);
    expect(stat.type).toBe('file');
    expect(stat.sizeBytes).toBe(Buffer.byteLength(initialContent, 'utf8'));
    expect(stat.uid).toBe(1000);

    // 4. Overwrite file
    const updatedContent = `${initialContent} - Appended modification`;
    await client.fs.write(testFilePath, updatedContent);
    const readUpdated = await client.fs.read(testFilePath);
    expect(readUpdated).toBe(updatedContent);

    // 5. Verify presence in directory listing
    const dirEntries = await client.fs.list('/home/ryan');
    const entry = dirEntries.find((e) => e.name === 'integration_proof.txt');
    expect(entry).toBeDefined();
    expect(entry?.type).toBe('file');

    // 6. Remove file
    await client.fs.remove(testFilePath);
    await expect(client.fs.stat(testFilePath)).rejects.toThrow();
  });

  it('executes shell commands through the core host', async () => {
    const result = await client.shell.execute('echo "Rocket Core Native Test"');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Rocket Core Native Test');
  });

  it('supervises background processes and services', async () => {
    // Process launch and terminate
    const launched = await client.processes.launch('test-app', 'Test App Process');
    expect(launched.pid).toBeGreaterThan(1);
    expect(launched.appId).toBe('test-app');

    const terminated = await client.processes.terminate(launched.pid);
    expect(terminated).toBe(true);

    // Services
    const services = await client.services.list();
    expect(services.length).toBeGreaterThan(0);
    expect(services.some((s) => s.name === 'rocket-fs')).toBe(true);

    const restarted = await client.services.restart('rocket-fs');
    expect(restarted).toBe(true);
  });
});
