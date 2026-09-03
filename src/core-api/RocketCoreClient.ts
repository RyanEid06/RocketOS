// RocketCoreClient.ts
// Thin TypeScript client communicating with the real Rocket Core Host over HTTP / JSON IPC

import {
  ICoreProvider,
  ICoreSystemAPI,
  ICoreFileSystemAPI,
  ICoreUsersAPI,
  ICoreProcessesAPI,
  ICoreServicesAPI,
  ICoreShellAPI,
  ICoreSearchAPI,
  ICoreAppsAPI,
  ICoreWorkspacesAPI,
} from './CoreProvider';
import { CoreError, CoreErrorCode } from './errors/CoreError';
import {
  ROCKET_CORE_PROTOCOL,
  DEFAULT_ROCKET_CORE_HOST,
  DEFAULT_ROCKET_CORE_PORT,
  CORE_API_PREFIX,
  ProtocolHandshake,
} from './protocol/constants';
import { SystemManifestInfo, PlatformCapabilities, SystemStatusInfo } from './types/system';
import {
  CoreFileStat,
  CoreDirEntry,
  CoreSearchOptions,
  CoreSearchResult,
  CoreFileAssociation,
} from './types/fs';
import { CoreUser, CoreGroup } from './types/users';
import { CoreProcess } from './types/processes';
import { CoreService } from './types/services';
import { CoreShellExecutionResult, CoreShellAst } from './types/shell';
import { CoreAppMetadata } from './types/apps';
import { CoreWorkspaceProfile } from './types/workspaces';
import { CoreDiagnostics } from './types/diagnostics';

export interface RocketCoreClientConfig {
  baseUrl?: string;
  authToken?: string;
  timeoutMs?: number;
}

export class RocketCoreClient implements ICoreProvider {
  public readonly providerType = 'rocket-core' as const;
  public readonly providerName = 'Rocket Core Host (Native)';

  private baseUrl: string;
  private authToken: string;
  private timeoutMs: number;
  private handshakeData: ProtocolHandshake | null = null;
  private _isConnected = false;

  public readonly system: ICoreSystemAPI;
  public readonly fs: ICoreFileSystemAPI;
  public readonly users: ICoreUsersAPI;
  public readonly processes: ICoreProcessesAPI;
  public readonly services: ICoreServicesAPI;
  public readonly shell: ICoreShellAPI;
  public readonly search: ICoreSearchAPI;
  public readonly apps: ICoreAppsAPI;
  public readonly workspaces: ICoreWorkspacesAPI;

  constructor(config?: RocketCoreClientConfig) {
    const host = DEFAULT_ROCKET_CORE_HOST;
    const port = DEFAULT_ROCKET_CORE_PORT;
    this.baseUrl = config?.baseUrl || `http://${host}:${port}`;
    this.authToken = config?.authToken || '';
    this.timeoutMs = config?.timeoutMs || 5000;

    this.system = this.createSystemAPI();
    this.fs = this.createFileSystemAPI();
    this.users = this.createUsersAPI();
    this.processes = this.createProcessesAPI();
    this.services = this.createServicesAPI();
    this.shell = this.createShellAPI();
    this.search = this.createSearchAPI();
    this.apps = this.createAppsAPI();
    this.workspaces = this.createWorkspacesAPI();
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  public async connect(): Promise<ProtocolHandshake> {
    try {
      const handshake = await this.request<ProtocolHandshake>('GET', `${CORE_API_PREFIX}/ping`);
      if (handshake.protocolVersion !== ROCKET_CORE_PROTOCOL) {
        throw CoreError.protocolMismatch(ROCKET_CORE_PROTOCOL, handshake.protocolVersion);
      }
      this.handshakeData = handshake;
      this._isConnected = true;
      return handshake;
    } catch (err: unknown) {
      this._isConnected = false;
      if (err instanceof CoreError) throw err;
      throw CoreError.coreUnavailable(err instanceof Error ? err.message : String(err));
    }
  }

  public async getDiagnostics(): Promise<CoreDiagnostics> {
    return this.request<CoreDiagnostics>('GET', `${CORE_API_PREFIX}/diagnostics`);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      headers['X-Rocket-Token'] = this.authToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        let errData: { code?: string; message?: string; details?: unknown } = {};
        try {
          errData = await res.json();
        } catch {
          // ignore non-json error body
        }

        const msg = errData.message || `HTTP ${res.status}: ${res.statusText}`;
        const code = (errData.code as CoreErrorCode) || this.httpStatusToErrorCode(res.status);
        throw new CoreError(code, msg, errData.details);
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof CoreError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw CoreError.coreUnavailable(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw CoreError.coreUnavailable(err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private httpStatusToErrorCode(status: number): CoreErrorCode {
    switch (status) {
      case 400:
        return 'INVALID_ARGUMENT';
      case 401:
      case 403:
        return 'PERMISSION_DENIED';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'ALREADY_EXISTS';
      case 501:
        return 'UNSUPPORTED';
      case 503:
        return 'CORE_UNAVAILABLE';
      default:
        return 'SERVICE_FAILED';
    }
  }

  private createSystemAPI(): ICoreSystemAPI {
    return {
      getManifest: () => this.request<SystemManifestInfo>('GET', `${CORE_API_PREFIX}/manifest`),
      getCapabilities: () => this.request<PlatformCapabilities>('GET', `${CORE_API_PREFIX}/capabilities`),
      getStatus: () => this.request<SystemStatusInfo>('GET', `${CORE_API_PREFIX}/status`),
    };
  }

  private createFileSystemAPI(): ICoreFileSystemAPI {
    return {
      stat: (path: string) => this.request<CoreFileStat>('GET', `${CORE_API_PREFIX}/fs/stat`, undefined, { path }),
      list: (path: string) => this.request<CoreDirEntry[]>('GET', `${CORE_API_PREFIX}/fs/list`, undefined, { path }),
      read: async (path: string) => {
        const res = await this.request<{ content: string }>('GET', `${CORE_API_PREFIX}/fs/read`, undefined, { path });
        return res.content;
      },
      write: async (path: string, content: string) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/write`, { path, content });
      },
      createFile: async (path: string, content = '') => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/create-file`, { path, content });
      },
      createDirectory: async (path: string) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/mkdir`, { path });
      },
      rename: async (oldPath: string, newPath: string) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/rename`, { oldPath, newPath });
      },
      copy: async (srcPath: string, dstPath: string) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/copy`, { srcPath, dstPath });
      },
      move: async (srcPath: string, dstPath: string) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/move`, { srcPath, dstPath });
      },
      remove: async (path: string, recursive = true) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/remove`, { path, recursive });
      },
      trash: async (path: string) => {
        const res = await this.request<{ trashId: string }>('POST', `${CORE_API_PREFIX}/fs/trash`, { path });
        return res.trashId;
      },
      restore: async (trashId: string) => {
        await this.request<void>('POST', `${CORE_API_PREFIX}/fs/restore`, { trashId });
      },
      search: (query: string, options?: CoreSearchOptions) =>
        this.request<CoreSearchResult[]>('GET', `${CORE_API_PREFIX}/fs/search`, undefined, {
          q: query,
          recursive: options?.recursive,
          maxResults: options?.maxResults,
          type: options?.typeFilter,
          targetDirectory: options?.targetDirectory,
        }),
    };
  }

  private createUsersAPI(): ICoreUsersAPI {
    return {
      current: () => this.request<CoreUser>('GET', `${CORE_API_PREFIX}/users/current`),
      list: () => this.request<CoreUser[]>('GET', `${CORE_API_PREFIX}/users/list`),
      groups: () => this.request<CoreGroup[]>('GET', `${CORE_API_PREFIX}/users/groups`),
      checkPermission: async (path: string, mode: 'read' | 'write' | 'execute') => {
        const res = await this.request<{ allowed: boolean }>('GET', `${CORE_API_PREFIX}/users/check-permission`, undefined, {
          path,
          mode,
        });
        return res.allowed;
      },
    };
  }

  private createProcessesAPI(): ICoreProcessesAPI {
    return {
      list: () => this.request<CoreProcess[]>('GET', `${CORE_API_PREFIX}/processes`),
      get: (pid: number) => this.request<CoreProcess | null>('GET', `${CORE_API_PREFIX}/processes/${pid}`),
      launch: (appId: string, name?: string, commandLine?: string) =>
        this.request<CoreProcess>('POST', `${CORE_API_PREFIX}/processes/launch`, {
          appId,
          name,
          commandLine,
        }),
      terminate: async (pid: number) => {
        const res = await this.request<{ success: boolean }>('POST', `${CORE_API_PREFIX}/processes/${pid}/terminate`);
        return res.success;
      },
    };
  }

  private createServicesAPI(): ICoreServicesAPI {
    return {
      list: () => this.request<CoreService[]>('GET', `${CORE_API_PREFIX}/services`),
      status: (name: string) => this.request<CoreService | null>('GET', `${CORE_API_PREFIX}/services/${encodeURIComponent(name)}`),
      start: async (name: string) => {
        const res = await this.request<{ success: boolean }>('POST', `${CORE_API_PREFIX}/services/${encodeURIComponent(name)}/start`);
        return res.success;
      },
      stop: async (name: string) => {
        const res = await this.request<{ success: boolean }>('POST', `${CORE_API_PREFIX}/services/${encodeURIComponent(name)}/stop`);
        return res.success;
      },
      restart: async (name: string) => {
        const res = await this.request<{ success: boolean }>('POST', `${CORE_API_PREFIX}/services/${encodeURIComponent(name)}/restart`);
        return res.success;
      },
    };
  }

  private createShellAPI(): ICoreShellAPI {
    return {
      execute: (commandLine: string, env?: Record<string, string>) =>
        this.request<CoreShellExecutionResult>('POST', `${CORE_API_PREFIX}/shell/execute`, { commandLine, env }),
      complete: (line: string) =>
        this.request<string[]>('GET', `${CORE_API_PREFIX}/shell/complete`, undefined, { line }),
      parse: (commandLine: string) =>
        this.request<CoreShellAst>('POST', `${CORE_API_PREFIX}/shell/parse`, { commandLine }),
    };
  }

  private createSearchAPI(): ICoreSearchAPI {
    return {
      query: (keyword: string) =>
        this.request<CoreSearchResult[]>('GET', `${CORE_API_PREFIX}/search`, undefined, { q: keyword }),
    };
  }

  private createAppsAPI(): ICoreAppsAPI {
    return {
      list: () => this.request<CoreAppMetadata[]>('GET', `${CORE_API_PREFIX}/apps`),
      get: (id: string) => this.request<CoreAppMetadata | null>('GET', `${CORE_API_PREFIX}/apps/${encodeURIComponent(id)}`),
      fileAssociations: () => this.request<CoreFileAssociation[]>('GET', `${CORE_API_PREFIX}/apps/associations`),
    };
  }

  private createWorkspacesAPI(): ICoreWorkspacesAPI {
    return {
      list: () => this.request<CoreWorkspaceProfile[]>('GET', `${CORE_API_PREFIX}/workspaces`),
      getProfile: (id: number) => this.request<CoreWorkspaceProfile | null>('GET', `${CORE_API_PREFIX}/workspaces/${id}`),
    };
  }
}
