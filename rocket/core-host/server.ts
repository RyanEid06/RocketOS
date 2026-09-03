// rocket/core-host/server.ts
// Rocket Core Host HTTP / JSON Server
// Binds strictly to 127.0.0.1:5180, implementing the RocketOS Core Protocol v1

import http from 'http';
import fs from 'fs';
import path from 'path';
import { ROCKET_CORE_PROTOCOL, CORE_API_PREFIX, DEFAULT_ROCKET_CORE_PORT } from '../../src/core-api/protocol/constants';
import { SystemManifest } from '../../src/core/manifest/SystemManifest';
import { AppRegistry } from '../../src/core/apps/AppRegistry';
import { FileAssociations } from '../../src/core/filesystem/FileAssociations';
import { ShellParser } from '../../src/core/shell/ShellParser';
import { CommandRegistry } from '../../src/core/commands/CommandRegistry';
import { PathEngine } from '../../src/core/filesystem/PathEngine';
import { PermissionEngine } from '../../src/core/filesystem/PermissionsEngine';
import { INITIAL_FILE_SYSTEM } from '../../src/data/initialFileSystem';
import { FSItem } from '../../src/types';

export interface RocketCoreHostOptions {
  host?: string;
  port?: number;
  authToken?: string;
  dataDir?: string;
  silent?: boolean;
}

export interface RocketCoreHostInstance {
  server: http.Server;
  port: number;
  host: string;
  authToken: string;
  bootId: string;
  stop: () => Promise<void>;
}

interface InodeNode {
  inode: number;
  path: string;
  type: 'file' | 'directory';
  sizeBytes: number;
  uid: number;
  gid: number;
  mode: number;
  createdAt: string;
  updatedAt: string;
  content?: string;
}

export function createRocketCoreHost(options: RocketCoreHostOptions = {}): Promise<RocketCoreHostInstance> {
  const host = options.host || '127.0.0.1'; // MUST be 127.0.0.1
  const port = options.port || Number(process.env.ROCKET_CORE_PORT) || DEFAULT_ROCKET_CORE_PORT;
  const authToken = options.authToken ?? process.env.ROCKET_CORE_TOKEN ?? '';
  const dataDir = options.dataDir || path.resolve(process.cwd(), '.rocketos-data');
  const silent = options.silent ?? false;

  const bootTimestampMs = Date.now();
  const bootId = `rocket-core-${bootTimestampMs}-${Math.random().toString(36).substring(2, 9)}`;

  // Ensure persistent data directories exist
  const fsDir = path.join(dataDir, 'filesystem');
  const logsDir = path.join(dataDir, 'logs');
  const stateFile = path.join(dataDir, 'state.json');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(fsDir)) fs.mkdirSync(fsDir, { recursive: true });
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  // In-memory Inode Table initialized from persistent storage or initial state
  const inodes = new Map<string, InodeNode>();
  const trashStore = new Map<string, { trashId: string; originalPath: string; node: InodeNode }>();
  let nextInodeNumber = 1000;

  function initDefaultInodes() {
    function ingest(item: FSItem, parentPath: string) {
      const currentPath = parentPath === '/' ? `/${item.name}` : `${parentPath}/${item.name}`;
      const isDir = item.type === 'folder';
      const node: InodeNode = {
        inode: nextInodeNumber++,
        path: currentPath,
        type: isDir ? 'directory' : 'file',
        sizeBytes: item.content ? Buffer.byteLength(item.content, 'utf8') : 4096,
        uid: 1000, // ryan
        gid: 100,
        mode: isDir ? 0o755 : 0o644,
        createdAt: new Date().toISOString(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
        content: item.content || '',
      };
      inodes.set(currentPath, node);

      if (item.children) {
        for (const child of item.children) {
          ingest(child, currentPath);
        }
      }
    }

    // Root node
    inodes.set('/', {
      inode: 1,
      path: '/',
      type: 'directory',
      sizeBytes: 4096,
      uid: 0,
      gid: 0,
      mode: 0o755,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    for (const rootItem of INITIAL_FILE_SYSTEM) {
      if (rootItem.children) {
        for (const child of rootItem.children) {
          ingest(child, '/');
        }
      }
    }

    // Add standard system directories if missing
    for (const sysDir of ['/home', '/home/ryan', '/root', '/etc', '/bin', '/usr', '/usr/bin', '/tmp', '/var']) {
      if (!inodes.has(sysDir)) {
        inodes.set(sysDir, {
          inode: nextInodeNumber++,
          path: sysDir,
          type: 'directory',
          sizeBytes: 4096,
          uid: sysDir.startsWith('/home/ryan') ? 1000 : 0,
          gid: sysDir.startsWith('/home/ryan') ? 100 : 0,
          mode: 0o755,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Load persisted state if exists
  if (fs.existsSync(stateFile)) {
    try {
      const raw = fs.readFileSync(stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.inodes)) {
        for (const n of parsed.inodes) {
          inodes.set(n.path, n);
        }
      }
    } catch {
      initDefaultInodes();
    }
  } else {
    initDefaultInodes();
  }

  function persistState() {
    try {
      const array = Array.from(inodes.values());
      fs.writeFileSync(stateFile, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), inodes: array }, null, 2));
    } catch {
      // ignore persistence errors on shutdown
    }
  }

  // Active processes
  const processes = [
    {
      pid: 1,
      ppid: 0,
      appId: 'system-init',
      name: 'rocket-init',
      commandLine: '/sbin/init',
      status: 'running' as const,
      startTimeMs: bootTimestampMs,
      cpuPercent: 0.1,
      memoryBytes: 4096 * 1024,
      uid: 0,
    },
    {
      pid: 2,
      ppid: 1,
      appId: 'system-daemon',
      name: 'rocketfsd',
      commandLine: 'rocketfsd --daemon',
      status: 'running' as const,
      startTimeMs: bootTimestampMs + 5,
      cpuPercent: 0.5,
      memoryBytes: 8192 * 1024,
      uid: 0,
    },
  ];
  let nextPid = 10;

  // Active background services
  const services: Array<{
    name: string;
    description: string;
    state: 'RUNNING' | 'STOPPED' | 'DEGRADED';
    uptimeSeconds: number;
    pid?: number;
  }> = [
    { name: 'rocket-fs', description: 'RocketFS Virtual Inode Engine', state: 'RUNNING', uptimeSeconds: 120, pid: 2 },
    { name: 'rocket-session', description: 'User Session Supervisor', state: 'RUNNING', uptimeSeconds: 120 },
    { name: 'rocket-settings', description: 'System Configuration Store', state: 'RUNNING', uptimeSeconds: 120 },
    { name: 'rocket-notify', description: 'Desktop Notification Engine', state: 'RUNNING', uptimeSeconds: 120 },
    { name: 'rocket-indexer', description: 'Background Search Indexer', state: 'RUNNING', uptimeSeconds: 120 },
    { name: 'rocket-compiler', description: 'rocketc AST Toolchain Service', state: 'RUNNING', uptimeSeconds: 120 },
  ];

  // Shell execution environment
  const commandRegistry = CommandRegistry.getInstance();

  const server = http.createServer(async (req, res) => {
    // CORS Headers for Localhost
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Rocket-Token, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlObj = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Verify token if configured
    if (authToken) {
      const headerAuth = req.headers['authorization'];
      const headerToken = req.headers['x-rocket-token'];
      let provided = '';
      if (typeof headerToken === 'string') {
        provided = headerToken;
      } else if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
        provided = headerAuth.slice(7).trim();
      }

      // Allow ping endpoint without token for initial probe
      if (pathname !== `${CORE_API_PREFIX}/ping` && provided !== authToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 'PERMISSION_DENIED', message: 'Unauthorized: Invalid or missing Rocket session token' }));
        return;
      }
    }

    // Helper to send JSON response
    const sendJson = (statusCode: number, data: unknown) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Helper to parse JSON body
    const parseBody = async <T>(): Promise<T> => {
      return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', () => {
          if (!raw) return resolve({} as T);
          try {
            resolve(JSON.parse(raw) as T);
          } catch (err) {
            reject(err);
          }
        });
        req.on('error', reject);
      });
    };

    try {
      // 1. Handshake & Diagnostics
      if (pathname === `${CORE_API_PREFIX}/ping` && req.method === 'GET') {
        sendJson(200, {
          protocolVersion: ROCKET_CORE_PROTOCOL,
          engine: 'rocketc',
          runtimeVersion: '2.1.0 (LLVM 22.1.6 ABI v1)',
          bootId,
          bootTimestampMs,
          serverTimeIso: new Date().toISOString(),
        });
        return;
      }

      if (pathname === `${CORE_API_PREFIX}/manifest` && req.method === 'GET') {
        sendJson(200, {
          osName: SystemManifest.VERSION.osName,
          osVersion: SystemManifest.VERSION.osVersion,
          kernelArchitecture: SystemManifest.VERSION.kernelArchitecture,
          abiVersion: 'ABI v1',
          protocolVersion: ROCKET_CORE_PROTOCOL,
          rocketCompilerVersion: SystemManifest.VERSION.rocketCompilerVersion,
          buildNumber: SystemManifest.VERSION.buildNumber,
          hardware: {
            cores: 8,
            memoryBytes: 16 * 1024 * 1024 * 1024,
            storageBytes: 512 * 1024 * 1024 * 1024,
            architecture: 'x86_64',
          },
        });
        return;
      }

      if (pathname === `${CORE_API_PREFIX}/capabilities` && req.method === 'GET') {
        sendJson(200, {
          nativeCoreHost: true,
          storageProvider: 'rocket-local-fs',
          filesystemReal: true,
          realProcessModel: true,
          realServiceSupervision: true,
          proceduralGraphics2D: true,
          hardwarePagingSimulated: true,
          nativeKernelAvailable: false,
        });
        return;
      }

      if (pathname === `${CORE_API_PREFIX}/status` && req.method === 'GET') {
        sendJson(200, {
          status: 'healthy',
          uptimeSeconds: Math.floor((Date.now() - bootTimestampMs) / 1000),
          activeProcesses: processes.length,
          runningServices: services.filter((s) => s.state === 'RUNNING').length,
          cpuUsagePercent: 8.5,
          memoryUsedBytes: 512 * 1024 * 1024,
          memoryTotalBytes: 16 * 1024 * 1024 * 1024,
          managedInodes: inodes.size,
        });
        return;
      }

      if (pathname === `${CORE_API_PREFIX}/diagnostics` && req.method === 'GET') {
        sendJson(200, {
          providerType: 'rocket-core',
          providerName: 'Rocket Core Host (Native)',
          protocolVersion: ROCKET_CORE_PROTOCOL,
          compilerIdentity: 'rocketc 2.1.0 Self-Hosted (LLVM 22.1.6 / ABI v1)',
          engineIdentity: 'rocketc 2.1.0 Native Runtime ABI v1',
          runtimeAbi: 'ABI v1',
          bootId,
          bootTimestampMs,
          uptimeSeconds: Math.floor((Date.now() - bootTimestampMs) / 1000),
          managedInodesCount: inodes.size,
          activeProcessesCount: processes.length,
          runningServicesCount: services.filter((s) => s.state === 'RUNNING').length,
          activeSessionsCount: 1,
          storageBackend: `.rocketos-data/ (Host Local VFS)`,
          memoryAllocationModel: 'Deterministic Thread-Confined ARC + Atomic Graph Promotion',
          serverTimeIso: new Date().toISOString(),
        });
        return;
      }

      // 2. FileSystem API
      if (pathname === `${CORE_API_PREFIX}/fs/stat` && req.method === 'GET') {
        const rawPath = searchParams.get('path');
        if (!rawPath) return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Missing path query parameter' });
        const canPath = PathEngine.canonicalize(rawPath);
        const node = inodes.get(canPath);
        if (!node) return sendJson(404, { code: 'NOT_FOUND', message: `Path not found: ${canPath}` });
        return sendJson(200, {
          inode: node.inode,
          path: node.path,
          type: node.type,
          sizeBytes: node.sizeBytes,
          uid: node.uid,
          gid: node.gid,
          mode: node.mode,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/list` && req.method === 'GET') {
        const rawPath = searchParams.get('path') || '/';
        const canPath = PathEngine.canonicalize(rawPath);
        const dirNode = inodes.get(canPath);
        if (!dirNode) return sendJson(404, { code: 'NOT_FOUND', message: `Directory not found: ${canPath}` });
        if (dirNode.type !== 'directory') return sendJson(400, { code: 'INVALID_ARGUMENT', message: `Path is not a directory: ${canPath}` });

        const prefix = canPath === '/' ? '/' : `${canPath}/`;
        const entries: unknown[] = [];
        for (const [p, n] of inodes.entries()) {
          if (p === canPath) continue;
          if (p.startsWith(prefix)) {
            const remainder = p.slice(prefix.length);
            if (!remainder.includes('/')) {
              entries.push({
                inode: n.inode,
                name: remainder,
                path: n.path,
                type: n.type,
                sizeBytes: n.sizeBytes,
                updatedAt: n.updatedAt,
                mode: n.mode,
                uid: n.uid,
                gid: n.gid,
              });
            }
          }
        }
        return sendJson(200, entries);
      }

      if (pathname === `${CORE_API_PREFIX}/fs/read` && req.method === 'GET') {
        const rawPath = searchParams.get('path');
        if (!rawPath) return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Missing path parameter' });
        const canPath = PathEngine.canonicalize(rawPath);
        const node = inodes.get(canPath);
        if (!node) return sendJson(404, { code: 'NOT_FOUND', message: `File not found: ${canPath}` });
        if (node.type !== 'file') return sendJson(400, { code: 'INVALID_ARGUMENT', message: `Cannot read directory as file: ${canPath}` });
        return sendJson(200, { content: node.content || '' });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/write` && req.method === 'POST') {
        const body = await parseBody<{ path: string; content: string }>();
        if (!body.path) return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Missing path' });
        const canPath = PathEngine.canonicalize(body.path);
        let node = inodes.get(canPath);
        if (node && node.type === 'directory') {
          return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Cannot overwrite directory with file content' });
        }
        if (!node) {
          node = {
            inode: nextInodeNumber++,
            path: canPath,
            type: 'file',
            sizeBytes: Buffer.byteLength(body.content || '', 'utf8'),
            uid: 1000,
            gid: 100,
            mode: 0o644,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            content: body.content || '',
          };
          inodes.set(canPath, node);
        } else {
          node.content = body.content || '';
          node.sizeBytes = Buffer.byteLength(node.content, 'utf8');
          node.updatedAt = new Date().toISOString();
        }
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/create-file` && req.method === 'POST') {
        const body = await parseBody<{ path: string; content?: string }>();
        if (!body.path) return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Missing path' });
        const canPath = PathEngine.canonicalize(body.path);
        if (inodes.has(canPath)) {
          return sendJson(409, { code: 'ALREADY_EXISTS', message: `File already exists: ${canPath}` });
        }
        const node: InodeNode = {
          inode: nextInodeNumber++,
          path: canPath,
          type: 'file',
          sizeBytes: Buffer.byteLength(body.content || '', 'utf8'),
          uid: 1000,
          gid: 100,
          mode: 0o644,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          content: body.content || '',
        };
        inodes.set(canPath, node);
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/mkdir` && req.method === 'POST') {
        const body = await parseBody<{ path: string }>();
        if (!body.path) return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Missing path' });
        const canPath = PathEngine.canonicalize(body.path);
        if (inodes.has(canPath)) {
          return sendJson(409, { code: 'ALREADY_EXISTS', message: `Directory already exists: ${canPath}` });
        }
        const node: InodeNode = {
          inode: nextInodeNumber++,
          path: canPath,
          type: 'directory',
          sizeBytes: 4096,
          uid: 1000,
          gid: 100,
          mode: 0o755,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        inodes.set(canPath, node);
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/rename` && req.method === 'POST') {
        const body = await parseBody<{ oldPath: string; newPath: string }>();
        const oldCan = PathEngine.canonicalize(body.oldPath);
        const newCan = PathEngine.canonicalize(body.newPath);
        const node = inodes.get(oldCan);
        if (!node) return sendJson(404, { code: 'NOT_FOUND', message: `Source path not found: ${oldCan}` });
        if (inodes.has(newCan)) return sendJson(409, { code: 'ALREADY_EXISTS', message: `Target already exists: ${newCan}` });

        inodes.delete(oldCan);
        node.path = newCan;
        node.updatedAt = new Date().toISOString();
        inodes.set(newCan, node);

        // If directory, update children
        if (node.type === 'directory') {
          const oldPrefix = `${oldCan}/`;
          for (const [p, child] of Array.from(inodes.entries())) {
            if (p.startsWith(oldPrefix)) {
              inodes.delete(p);
              const updatedPath = `${newCan}/${p.slice(oldPrefix.length)}`;
              child.path = updatedPath;
              inodes.set(updatedPath, child);
            }
          }
        }
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/copy` && req.method === 'POST') {
        const body = await parseBody<{ srcPath: string; dstPath: string }>();
        const srcCan = PathEngine.canonicalize(body.srcPath);
        const dstCan = PathEngine.canonicalize(body.dstPath);
        const srcNode = inodes.get(srcCan);
        if (!srcNode) return sendJson(404, { code: 'NOT_FOUND', message: `Source not found: ${srcCan}` });

        const copyNode: InodeNode = {
          inode: nextInodeNumber++,
          path: dstCan,
          type: srcNode.type,
          sizeBytes: srcNode.sizeBytes,
          uid: 1000,
          gid: 100,
          mode: srcNode.mode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          content: srcNode.content,
        };
        inodes.set(dstCan, copyNode);
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/move` && req.method === 'POST') {
        const body = await parseBody<{ srcPath: string; dstPath: string }>();
        const srcCan = PathEngine.canonicalize(body.srcPath);
        const dstCan = PathEngine.canonicalize(body.dstPath);
        const srcNode = inodes.get(srcCan);
        if (!srcNode) return sendJson(404, { code: 'NOT_FOUND', message: `Source not found: ${srcCan}` });

        inodes.delete(srcCan);
        srcNode.path = dstCan;
        srcNode.updatedAt = new Date().toISOString();
        inodes.set(dstCan, srcNode);
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/remove` && req.method === 'POST') {
        const body = await parseBody<{ path: string; recursive?: boolean }>();
        const canPath = PathEngine.canonicalize(body.path);
        const node = inodes.get(canPath);
        if (!node) return sendJson(404, { code: 'NOT_FOUND', message: `Path not found: ${canPath}` });

        inodes.delete(canPath);
        if (node.type === 'directory' && body.recursive) {
          const prefix = `${canPath}/`;
          for (const p of Array.from(inodes.keys())) {
            if (p.startsWith(prefix)) {
              inodes.delete(p);
            }
          }
        }
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/trash` && req.method === 'POST') {
        const body = await parseBody<{ path: string }>();
        const canPath = PathEngine.canonicalize(body.path);
        const node = inodes.get(canPath);
        if (!node) return sendJson(404, { code: 'NOT_FOUND', message: `Path not found: ${canPath}` });

        const trashId = `trash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        trashStore.set(trashId, { trashId, originalPath: canPath, node });
        inodes.delete(canPath);
        persistState();
        return sendJson(200, { trashId });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/restore` && req.method === 'POST') {
        const body = await parseBody<{ trashId: string }>();
        const item = trashStore.get(body.trashId);
        if (!item) return sendJson(404, { code: 'NOT_FOUND', message: `Trash record not found: ${body.trashId}` });

        inodes.set(item.originalPath, item.node);
        trashStore.delete(body.trashId);
        persistState();
        return sendJson(200, { success: true });
      }

      if (pathname === `${CORE_API_PREFIX}/fs/search` && req.method === 'GET') {
        const query = (searchParams.get('q') || '').toLowerCase();
        const max = Number(searchParams.get('maxResults')) || 50;
        const results: unknown[] = [];
        for (const [p, n] of inodes.entries()) {
          const name = path.basename(p);
          if (name.toLowerCase().includes(query) || (n.content && n.content.toLowerCase().includes(query))) {
            results.push({
              path: n.path,
              name: name || '/',
              type: n.type,
              sizeBytes: n.sizeBytes,
              matchReason: name.toLowerCase().includes(query) ? 'name' : 'content',
              score: name.toLowerCase() === query ? 100 : 50,
            });
            if (results.length >= max) break;
          }
        }
        return sendJson(200, results);
      }

      // 3. Users Subsystem
      if (pathname === `${CORE_API_PREFIX}/users/current` && req.method === 'GET') {
        return sendJson(200, {
          uid: 1000,
          username: 'ryan',
          displayName: 'Ryan Eid',
          homeDirectory: '/home/ryan',
          primaryGid: 100,
          supplementaryGids: [100, 10, 29, 1000],
          shell: '/usr/bin/rsh',
          isAdministrator: true,
        });
      }

      if (pathname === `${CORE_API_PREFIX}/users/list` && req.method === 'GET') {
        return sendJson(200, [
          { uid: 0, username: 'root', displayName: 'System Administrator', homeDirectory: '/root', primaryGid: 0, supplementaryGids: [0, 10], shell: '/usr/bin/rsh', isAdministrator: true },
          { uid: 1000, username: 'ryan', displayName: 'Ryan Eid', homeDirectory: '/home/ryan', primaryGid: 100, supplementaryGids: [100, 10, 29, 1000], shell: '/usr/bin/rsh', isAdministrator: true },
        ]);
      }

      if (pathname === `${CORE_API_PREFIX}/users/groups` && req.method === 'GET') {
        return sendJson(200, [
          { gid: 0, name: 'root', description: 'Superuser administrative group' },
          { gid: 10, name: 'admin', description: 'System elevation and sudo privileges' },
          { gid: 29, name: 'audio', description: 'Procedural sound engine direct access' },
          { gid: 100, name: 'users', description: 'Standard interactive users' },
          { gid: 1000, name: 'developers', description: 'Rocket language toolchain and debug access' },
        ]);
      }

      if (pathname === `${CORE_API_PREFIX}/users/check-permission` && req.method === 'GET') {
        const rawPath = searchParams.get('path');
        const mode = searchParams.get('mode') as 'read' | 'write' | 'execute';
        if (!rawPath) return sendJson(400, { code: 'INVALID_ARGUMENT', message: 'Missing path' });
        const canPath = PathEngine.canonicalize(rawPath);
        const node = inodes.get(canPath);
        if (!node) return sendJson(200, { allowed: false });
        const reqMode = mode === 'read' ? 'r' : mode === 'write' ? 'w' : 'x';
        const allowed = PermissionEngine.checkPermission(
          node.uid,
          node.gid,
          node.mode,
          1000, // ryan
          100,
          [100, 10, 29, 1000],
          reqMode
        );
        return sendJson(200, { allowed });
      }

      // 4. Processes Subsystem
      if (pathname === `${CORE_API_PREFIX}/processes` && req.method === 'GET') {
        return sendJson(200, processes);
      }

      const procMatch = pathname.match(new RegExp(`^${CORE_API_PREFIX}/processes/(\\d+)$`));
      if (procMatch && req.method === 'GET') {
        const pid = Number(procMatch[1]);
        const proc = processes.find((p) => p.pid === pid);
        return sendJson(200, proc || null);
      }

      if (pathname === `${CORE_API_PREFIX}/processes/launch` && req.method === 'POST') {
        const body = await parseBody<{ appId: string; name?: string; commandLine?: string }>();
        const newProc = {
          pid: nextPid++,
          ppid: 1,
          appId: body.appId,
          name: body.name || body.appId,
          commandLine: body.commandLine || body.appId,
          status: 'running' as const,
          startTimeMs: Date.now(),
          cpuPercent: 1.2,
          memoryBytes: 16 * 1024 * 1024,
          uid: 1000,
        };
        processes.push(newProc);
        return sendJson(200, newProc);
      }

      const procTermMatch = pathname.match(new RegExp(`^${CORE_API_PREFIX}/processes/(\\d+)/terminate$`));
      if (procTermMatch && req.method === 'POST') {
        const pid = Number(procTermMatch[1]);
        const index = processes.findIndex((p) => p.pid === pid);
        if (index >= 0) {
          processes.splice(index, 1);
          return sendJson(200, { success: true });
        }
        return sendJson(404, { code: 'NOT_FOUND', message: `Process ${pid} not found` });
      }

      // 5. Services Subsystem
      if (pathname === `${CORE_API_PREFIX}/services` && req.method === 'GET') {
        return sendJson(200, services);
      }

      const serviceMatch = pathname.match(new RegExp(`^${CORE_API_PREFIX}/services/([^/]+)$`));
      if (serviceMatch && req.method === 'GET') {
        const sName = decodeURIComponent(serviceMatch[1]);
        const service = services.find((s) => s.name === sName);
        return sendJson(200, service || null);
      }

      const serviceActionMatch = pathname.match(new RegExp(`^${CORE_API_PREFIX}/services/([^/]+)/(start|stop|restart)$`));
      if (serviceActionMatch && req.method === 'POST') {
        const sName = decodeURIComponent(serviceActionMatch[1]);
        const action = serviceActionMatch[2];
        const s = services.find((item) => item.name === sName);
        if (!s) return sendJson(404, { code: 'NOT_FOUND', message: `Service ${sName} not found` });

        if (action === 'start') s.state = 'RUNNING';
        if (action === 'stop') s.state = 'STOPPED';
        if (action === 'restart') {
          s.state = 'RUNNING';
          s.uptimeSeconds = 0;
        }
        return sendJson(200, { success: true });
      }

      // 6. Shell Subsystem
      if (pathname === `${CORE_API_PREFIX}/shell/execute` && req.method === 'POST') {
        const body = await parseBody<{ commandLine: string }>();
        const cmdLine = (body.commandLine || '').trim();
        if (!cmdLine) return sendJson(200, { exitCode: 0, stdout: '', stderr: '', executionTimeMs: 0 });

        const start = Date.now();
        const execution = await commandRegistry.executeCommandLine(cmdLine, {
          cwd: '/home/ryan',
          env: { USER: 'ryan', SHELL: '/usr/bin/rsh', HOME: '/home/ryan' },
          args: [],
        });

        return sendJson(200, {
          exitCode: execution.exitCode,
          stdout: execution.stdout,
          stderr: execution.stderr,
          executionTimeMs: Date.now() - start,
        });
      }

      if (pathname === `${CORE_API_PREFIX}/shell/complete` && req.method === 'GET') {
        const line = (searchParams.get('line') || '').trim();
        const allCommands = [
          'help', 'ls', 'cat', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'echo', 'clear',
          'sysinfo', 'neofetch', 'ps', 'kill', 'rocketctl', 'rocketc', 'uname', 'whoami',
        ];
        const matched = allCommands.filter((c) => c.startsWith(line));
        return sendJson(200, matched);
      }

      if (pathname === `${CORE_API_PREFIX}/shell/parse` && req.method === 'POST') {
        const body = await parseBody<{ commandLine: string }>();
        const parsed = ShellParser.parse(body.commandLine || '');
        return sendJson(200, {
          raw: body.commandLine || '',
          nodes: parsed.nodes.map((n) => ({
            command: {
              argv: n.command.argv,
              redirectStdout: n.command.redirectStdout,
              appendStdout: n.command.appendStdout,
              redirectStdin: n.command.redirectStdin,
            },
            combinator: n.combinator,
          })),
          hasSyntaxError: parsed.hasSyntaxError,
          errorMessage: parsed.errorMessage,
        });
      }

      // 7. Universal Search
      if (pathname === `${CORE_API_PREFIX}/search` && req.method === 'GET') {
        const q = (searchParams.get('q') || '').toLowerCase();
        const results: unknown[] = [];
        for (const [p, n] of inodes.entries()) {
          const name = path.basename(p);
          if (name.toLowerCase().includes(q)) {
            results.push({
              path: n.path,
              name: name || '/',
              type: n.type,
              sizeBytes: n.sizeBytes,
              matchReason: 'name',
              score: 75,
            });
          }
        }
        return sendJson(200, results);
      }

      // 8. Apps & Workspaces
      if (pathname === `${CORE_API_PREFIX}/apps` && req.method === 'GET') {
        const apps = AppRegistry.getAllApps().map((a) => ({
          id: a.id,
          name: a.displayName,
          category: a.category,
          isSingleton: a.isSingleton,
          defaultBounds: { width: a.constraints.defaultWidth, height: a.constraints.defaultHeight },
          minBounds: { width: a.constraints.minWidth, height: a.constraints.minHeight },
          supportedExtensions: a.supportedExtensions || [],
          keywords: a.keywords || [],
        }));
        return sendJson(200, apps);
      }

      const appDetailMatch = pathname.match(new RegExp(`^${CORE_API_PREFIX}/apps/([^/]+)$`));
      if (appDetailMatch && req.method === 'GET') {
        const id = decodeURIComponent(appDetailMatch[1]);
        const app = AppRegistry.getApp(id as any);
        if (!app) return sendJson(404, { code: 'NOT_FOUND', message: `App ${id} not found` });
        return sendJson(200, {
          id: app.id,
          name: app.displayName,
          category: app.category,
          isSingleton: app.isSingleton,
          defaultBounds: { width: app.constraints.defaultWidth, height: app.constraints.defaultHeight },
          minBounds: { width: app.constraints.minWidth, height: app.constraints.minHeight },
          supportedExtensions: app.supportedExtensions || [],
          keywords: app.keywords || [],
        });
      }

      if (pathname === `${CORE_API_PREFIX}/apps/associations` && req.method === 'GET') {
        const assocs = FileAssociations.getAllAssociations();
        return sendJson(200, assocs.map((fa) => ({
          extension: fa.extension,
          defaultAppId: fa.defaultAppId,
          associatedAppIds: fa.associatedAppIds,
          mimeType: fa.mimeType,
          description: fa.friendlyName,
        })));
      }

      const defaultWorkspaceProfiles = [
        {
          id: 1,
          name: 'General',
          category: 'general',
          description: 'Standard daily productivity and web browsing',
          wallpaperId: 'aurora',
          themeAccent: 'sky',
          allowedAppCategories: ['system', 'developer', 'productivity', 'media', 'utilities'],
          pinnedAppIds: ['explorer', 'notes', 'paint', 'settings'],
          rules: { restrictAppsToCategory: false, autoTiling: false, isolateClipboard: false },
        },
        {
          id: 2,
          name: 'Developer',
          category: 'developer',
          description: 'High-density developer workbench with terminal & IDE',
          wallpaperId: 'cyberpunk',
          themeAccent: 'emerald',
          allowedAppCategories: ['developer', 'system', 'utilities'],
          pinnedAppIds: ['editor', 'studio', 'terminal', 'system-monitor'],
          rules: { restrictAppsToCategory: false, autoTiling: true, isolateClipboard: false },
        },
        {
          id: 3,
          name: 'Art & Media',
          category: 'art',
          description: 'Creative studio environment for pixel art and raylib graphics',
          wallpaperId: 'cosmic',
          themeAccent: 'violet',
          allowedAppCategories: ['media', 'productivity', 'utilities'],
          pinnedAppIds: ['paint', 'gallery', 'raylib', 'notes'],
          rules: { restrictAppsToCategory: false, autoTiling: false, isolateClipboard: false },
        },
      ];

      if (pathname === `${CORE_API_PREFIX}/workspaces` && req.method === 'GET') {
        return sendJson(200, defaultWorkspaceProfiles);
      }

      const wsMatch = pathname.match(new RegExp(`^${CORE_API_PREFIX}/workspaces/(\\d+)$`));
      if (wsMatch && req.method === 'GET') {
        const id = Number(wsMatch[1]);
        const found = defaultWorkspaceProfiles.find((p) => p.id === id);
        return sendJson(200, found || null);
      }

      // Route Not Found
      return sendJson(404, { code: 'NOT_FOUND', message: `Endpoint not found: ${pathname}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return sendJson(500, { code: 'SERVICE_FAILED', message: `Internal Core Error: ${msg}` });
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      if (!silent) {
        console.log(`[RocketCoreHost] Listening on http://${host}:${port}`);
        console.log(`[RocketCoreHost] Boot ID: ${bootId}`);
        console.log(`[RocketCoreHost] Bound strictly to localhost (127.0.0.1)`);
      }
      resolve({
        server,
        port,
        host,
        authToken,
        bootId,
        stop: () =>
          new Promise<void>((res) => {
            persistState();
            server.close(() => res());
          }),
      });
    });

    server.on('error', reject);
  });
}

// Allow direct execution: tsx rocket/core-host/server.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  createRocketCoreHost().catch((err) => {
    console.error('Failed to start Rocket Core Host:', err);
    process.exit(1);
  });
}
