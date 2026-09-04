// IPCChannelManager.ts
// Authoritative Inter-Process Communication (IPC) subsystem for RocketOS
// Supports message ports, pub/sub topics, direct RPC, and channel inspection

export interface IPCMessage<T = any> {
  id: string;
  senderPid: number;
  channel: string;
  topic?: string;
  payload: T;
  timestampEpochMs: number;
  replyToMessageId?: string;
}

export interface IPCResponse<T = any> {
  success: boolean;
  messageId: string;
  payload?: T;
  error?: string;
}

export type IPCMessageHandler = (message: IPCMessage) => void | Promise<void>;
export type IPCRpcHandler = (params: any, callerPid: number) => any | Promise<any>;

export interface IPCChannelInfo {
  name: string;
  ownerPid: number;
  subscribersCount: number;
  totalMessagesSent: number;
  createdAt: number;
  lastActiveAt: number;
}

export class IPCChannelManager {
  private static instance: IPCChannelManager | null = null;

  // Channels and subscribers
  private channels: Map<string, { ownerPid: number; createdAt: number; messageCount: number; lastActive: number }> = new Map();
  private topicSubscribers: Map<string, Set<IPCMessageHandler>> = new Map();
  private rpcHandlers: Map<string, IPCRpcHandler> = new Map();
  private messageLog: IPCMessage[] = [];
  private readonly MAX_LOG = 100;
  private changeListeners: Set<() => void> = new Set();

  private constructor() {
    this.initDefaultChannels();
  }

  public static getInstance(): IPCChannelManager {
    if (!IPCChannelManager.instance) {
      IPCChannelManager.instance = new IPCChannelManager();
    }
    return IPCChannelManager.instance;
  }

  private initDefaultChannels(): void {
    // Core kernel & desktop message channels
    this.createChannel('system:notifications', 1);
    this.createChannel('system:clipboard', 1);
    this.createChannel('system:power', 1);
    this.createChannel('app:lifecycle', 1);
    this.createChannel('fs:watch', 1);

    // Register basic system RPCs
    this.registerRpc('system.ping', async () => ({ pong: true, timestamp: Date.now() }));
    this.registerRpc('system.version', async () => ({
      name: 'RocketOS',
      version: '2.1.0',
      abi: 'ABI v1 (Frozen 2.0)',
    }));
  }

  public createChannel(channelName: string, ownerPid: number = 1): boolean {
    if (this.channels.has(channelName)) return false;
    this.channels.set(channelName, {
      ownerPid,
      createdAt: Date.now(),
      messageCount: 0,
      lastActive: Date.now(),
    });
    this.notify();
    return true;
  }

  public listChannels(): IPCChannelInfo[] {
    const list: IPCChannelInfo[] = [];
    for (const [name, meta] of this.channels.entries()) {
      const subs = this.topicSubscribers.get(name)?.size || 0;
      list.push({
        name,
        ownerPid: meta.ownerPid,
        subscribersCount: subs,
        totalMessagesSent: meta.messageCount,
        createdAt: meta.createdAt,
        lastActiveAt: meta.lastActive,
      });
    }
    return list;
  }

  public subscribe(channelOrTopic: string, handler: IPCMessageHandler): () => void {
    if (!this.topicSubscribers.has(channelOrTopic)) {
      this.topicSubscribers.set(channelOrTopic, new Set());
    }
    this.topicSubscribers.get(channelOrTopic)!.add(handler);
    this.notify();

    return () => {
      const subs = this.topicSubscribers.get(channelOrTopic);
      if (subs) {
        subs.delete(handler);
        if (subs.size === 0) {
          this.topicSubscribers.delete(channelOrTopic);
        }
        this.notify();
      }
    };
  }

  public broadcast<T = any>(
    channelOrTopic: string,
    payload: T,
    senderPid: number = 1
  ): IPCMessage<T> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const msg: IPCMessage<T> = {
      id: messageId,
      senderPid,
      channel: channelOrTopic,
      topic: channelOrTopic,
      payload,
      timestampEpochMs: Date.now(),
    };

    // Update channel stats if known channel
    const chan = this.channels.get(channelOrTopic);
    if (chan) {
      chan.messageCount++;
      chan.lastActive = Date.now();
    }

    // Append to message log
    this.messageLog.unshift(msg);
    if (this.messageLog.length > this.MAX_LOG) {
      this.messageLog.pop();
    }

    // Deliver to subscribers
    const handlers = this.topicSubscribers.get(channelOrTopic);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(msg);
        } catch (err) {
          console.error(`IPC error on topic ${channelOrTopic}:`, err);
        }
      });
    }

    this.notify();
    return msg;
  }

  public registerRpc(method: string, handler: IPCRpcHandler): void {
    this.rpcHandlers.set(method, handler);
  }

  public async callRpc<T = any, R = any>(
    method: string,
    params: T,
    callerPid: number = 1
  ): Promise<IPCResponse<R>> {
    const handler = this.rpcHandlers.get(method);
    if (!handler) {
      return {
        success: false,
        messageId: `rpc-${Date.now()}`,
        error: `RPC Method '${method}' is not registered on RocketOS IPC bus.`,
      };
    }

    try {
      const result = await handler(params, callerPid);
      return {
        success: true,
        messageId: `rpc-${Date.now()}`,
        payload: result,
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: `rpc-${Date.now()}`,
        error: err?.message || String(err),
      };
    }
  }

  public getRecentMessages(): IPCMessage[] {
    return [...this.messageLog];
  }

  public subscribeChanges(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  private notify(): void {
    this.changeListeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }
}

export const ipcManager = IPCChannelManager.getInstance();
