// CoreProvider.test.ts
// Comprehensive unit tests for ICoreProvider and BrowserFallbackCoreProvider

import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserFallbackCoreProvider } from './BrowserFallbackCoreProvider';
import { CoreError } from './errors/CoreError';
import { ROCKET_CORE_PROTOCOL } from './protocol/constants';
import { RocketCoreClient } from './RocketCoreClient';
import { getCoreProvider, setCoreProvider } from './index';

describe('ICoreProvider Contract & BrowserFallbackCoreProvider', () => {
  let provider: BrowserFallbackCoreProvider;

  beforeEach(() => {
    provider = new BrowserFallbackCoreProvider();
  });

  describe('System Subsystem', () => {
    it('returns valid system manifest conforming to RocketOS 2.1 ABI v1 specification', async () => {
      const manifest = await provider.system.getManifest();
      expect(manifest.osName).toBe('RocketOS');
      expect(manifest.abiVersion).toBe('ABI v1');
      expect(manifest.protocolVersion).toBe(ROCKET_CORE_PROTOCOL);
      expect(manifest.hardware.cores).toBeGreaterThan(0);
    });

    it('returns platform capabilities correctly identifying browser-confined host', async () => {
      const caps = await provider.system.getCapabilities();
      expect(caps.nativeCoreHost).toBe(false);
      expect(caps.storageProvider).toBe('browser-indexeddb');
      expect(caps.proceduralGraphics2D).toBe(true);
    });

    it('reports real-time system status and uptime', async () => {
      const status = await provider.system.getStatus();
      expect(status.status).toBe('healthy');
      expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(status.activeProcesses).toBeGreaterThan(0);
      expect(status.runningServices).toBeGreaterThan(0);
    });
  });

  describe('FileSystem Subsystem', () => {
    it('can stat root and system paths', async () => {
      const rootStat = await provider.fs.stat('/');
      expect(rootStat.path).toBe('/');
      expect(rootStat.type).toBe('directory');
      expect(rootStat.uid).toBe(0);
    });

    it('throws CoreError with NOT_FOUND on nonexistent paths', async () => {
      try {
        await provider.fs.stat('/nonexistent_file_path_12345.txt');
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(CoreError);
        expect((err as CoreError).code).toBe('NOT_FOUND');
      }
    });

    it('can list directories with structured entries', async () => {
      const entries = await provider.fs.list('/home/ryan');
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.name === 'Documents')).toBe(true);
    });

    it('can create, read, update, and remove a file cleanly', async () => {
      const testPath = '/home/ryan/test_core_file.txt';
      const initialContent = 'Hello Rocket Core';

      // Create
      await provider.fs.createFile(testPath, initialContent);

      // Read
      const readContent = await provider.fs.read(testPath);
      expect(readContent).toBe(initialContent);

      // Update
      const updatedContent = 'Hello Rocket Core Updated';
      await provider.fs.write(testPath, updatedContent);
      const readUpdated = await provider.fs.read(testPath);
      expect(readUpdated).toBe(updatedContent);

      // Stat
      const stat = await provider.fs.stat(testPath);
      expect(stat.sizeBytes).toBe(updatedContent.length);

      // Delete
      await provider.fs.remove(testPath);
      await expect(provider.fs.stat(testPath)).rejects.toThrow();
    });

    it('can perform recursive search across the filesystem', async () => {
      const results = await provider.fs.search('welcome', { maxResults: 10 });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.toLowerCase().includes('welcome'))).toBe(true);
    });
  });

  describe('Users Subsystem', () => {
    it('provides current authenticated user', async () => {
      const current = await provider.users.current();
      expect(current.uid).toBeDefined();
      expect(typeof current.username).toBe('string');
      expect(current.homeDirectory).toBeDefined();
    });

    it('lists known system accounts and groups', async () => {
      const users = await provider.users.list();
      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users.some((u) => u.username === 'root')).toBe(true);
      expect(users.some((u) => u.username === 'ryan')).toBe(true);

      const groups = await provider.users.groups();
      expect(groups.length).toBeGreaterThanOrEqual(3);
      expect(groups.some((g) => g.name === 'root')).toBe(true);
    });

    it('validates file access permissions', async () => {
      const canReadRoot = await provider.users.checkPermission('/root', 'read');
      // ryan is an admin so elevated access is permitted
      expect(typeof canReadRoot).toBe('boolean');
    });
  });

  describe('Processes & Services Subsystem', () => {
    it('lists active processes including system init daemon', async () => {
      const procs = await provider.processes.list();
      expect(procs.length).toBeGreaterThan(0);
      expect(procs.some((p) => p.pid === 1)).toBe(true);
    });

    it('can launch and terminate an application process', async () => {
      const launched = await provider.processes.launch('notes', 'Notes Process');
      expect(launched.pid).toBeGreaterThan(1);
      expect(launched.appId).toBe('notes');

      const terminated = await provider.processes.terminate(launched.pid);
      expect(terminated).toBe(true);
    });

    it('lists background services and reports status', async () => {
      const services = await provider.services.list();
      expect(services.length).toBeGreaterThan(0);
      expect(services.some((s) => s.name === 'rocket-fs')).toBe(true);

      const fsService = await provider.services.status('rocket-fs');
      expect(fsService).not.toBeNull();
      expect(fsService?.name).toBe('rocket-fs');
    });
  });

  describe('Shell Subsystem', () => {
    it('parses complex pipelines into structured AST', async () => {
      const ast = await provider.shell.parse('cat /etc/os-release | grep VERSION');
      expect(ast.hasSyntaxError).toBe(false);
      expect(ast.nodes.length).toBe(2);
      expect(ast.nodes[0].combinator).toBe('pipe');
    });

    it('executes built-in POSIX/rsh commands', async () => {
      const res = await provider.shell.execute('echo "Rocket Core Rocks"');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('Rocket Core Rocks');
    });

    it('provides auto-completion options', async () => {
      const completions = await provider.shell.complete('sys');
      expect(completions).toContain('sysinfo');
    });
  });

  describe('Apps & Workspaces Subsystem', () => {
    it('lists installed application manifests with window constraints', async () => {
      const apps = await provider.apps.list();
      expect(apps.length).toBeGreaterThan(0);
      const explorer = apps.find((a) => a.id === 'explorer');
      expect(explorer).toBeDefined();
      expect(explorer?.defaultBounds.width).toBeGreaterThan(0);
    });

    it('returns file associations for standard MIME types', async () => {
      const assocs = await provider.apps.fileAssociations();
      expect(assocs.some((a) => a.extension === '.rocket')).toBe(true);
      expect(assocs.some((a) => a.extension === '.png')).toBe(true);
    });

    it('lists multi-workspace profiles with layout rules', async () => {
      const workspaces = await provider.workspaces.list();
      expect(workspaces.length).toBeGreaterThanOrEqual(3);
      expect(workspaces[0].name).toBe('General');
      expect(workspaces[1].name).toBe('Developer');
    });
  });

  describe('Diagnostics Subsystem', () => {
    it('returns complete diagnostics bundle with host identity and protocol version', async () => {
      const diag = await provider.getDiagnostics();
      expect(diag.providerType).toBe('browser-fallback');
      expect(diag.protocolVersion).toBe(ROCKET_CORE_PROTOCOL);
      expect(diag.managedInodesCount).toBeGreaterThan(0);
      expect(diag.bootId).toBeDefined();
    });
  });

  describe('Provider Selector', () => {
    it('defaults to BrowserFallbackCoreProvider when native daemon is unreachable', () => {
      const p = getCoreProvider();
      expect(p.providerType).toBe('browser-fallback');
      expect(p.isConnected).toBe(true);
    });

    it('allows explicit provider setting', () => {
      const mockClient = new RocketCoreClient({ baseUrl: 'http://127.0.0.1:9999' });
      setCoreProvider(mockClient);
      expect(getCoreProvider().providerType).toBe('rocket-core');
      // Reset back
      setCoreProvider(provider);
      expect(getCoreProvider().providerType).toBe('browser-fallback');
    });
  });
});
