// NotificationService.ts
// Real system notification engine supporting event dispatch, action handlers, read/unread states

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface SystemNotification {
  id: string;
  sourceAppId: string;
  title: string;
  body: string;
  timestamp: string;
  severity: NotificationSeverity;
  isRead: boolean;
  action?: NotificationAction;
}

export class NotificationService {
  private static instance: NotificationService | null = null;
  private notifications: SystemNotification[] = [
    {
      id: 'notif-boot-1',
      sourceAppId: 'kernel',
      title: 'Operating System Ready',
      body: 'Liquid Glass compositor active at 60 FPS',
      timestamp: 'Just now',
      severity: 'success',
      isRead: false,
    },
    {
      id: 'notif-boot-2',
      sourceAppId: 'explorer',
      title: 'Storage Mounted',
      body: 'Virtual NVMe disk and Recycle Bin mounted',
      timestamp: '1m ago',
      severity: 'info',
      isRead: false,
    },
  ];
  private listeners: Set<(items: SystemNotification[]) => void> = new Set();

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public send(notification: {
    sourceAppId: string;
    title: string;
    body: string;
    severity?: NotificationSeverity;
    action?: NotificationAction;
  }): string {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNotif: SystemNotification = {
      id,
      sourceAppId: notification.sourceAppId,
      title: notification.title,
      body: notification.body,
      timestamp: 'Just now',
      severity: notification.severity || 'info',
      isRead: false,
      action: notification.action,
    };

    this.notifications = [newNotif, ...this.notifications.slice(0, 49)];
    this.dispatchListeners();
    return id;
  }

  public notify(
    titleOrOptions:
      | string
      | {
          title: string;
          message?: string;
          body?: string;
          type?: NotificationSeverity;
          severity?: NotificationSeverity;
          appId?: string;
          sourceAppId?: string;
          action?: NotificationAction;
        },
    body?: string,
    severity: NotificationSeverity = 'info',
    sourceAppId: string = 'system'
  ): string {
    if (typeof titleOrOptions === 'object') {
      return this.sendNotification({
        title: titleOrOptions.title,
        message: titleOrOptions.message,
        body: titleOrOptions.body,
        type: titleOrOptions.type || titleOrOptions.severity,
        sourceAppId: titleOrOptions.appId || titleOrOptions.sourceAppId || 'system',
        action: titleOrOptions.action,
      });
    }
    return this.send({ sourceAppId, title: titleOrOptions, body: body || '', severity });
  }

  public sendNotification(options: {
    title: string;
    message?: string;
    body?: string;
    type?: NotificationSeverity;
    severity?: NotificationSeverity;
    sourceAppId?: string;
    action?: NotificationAction;
  }): string {
    const title = options.title;
    const body = options.message || options.body || '';
    const severity = options.type || options.severity || 'info';
    return this.send({
      sourceAppId: options.sourceAppId || 'system',
      title,
      body,
      severity,
      action: options.action,
    });
  }

  public getNotifications(): SystemNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  public markAsRead(id: string): void {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.dispatchListeners();
  }

  public markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.dispatchListeners();
  }

  public dismiss(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.dispatchListeners();
  }

  public clear(): void {
    this.notifications = [];
    this.dispatchListeners();
  }

  public subscribe(listener: (items: SystemNotification[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.notifications);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private dispatchListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.notifications);
      } catch {}
    }
  }
}

export const notificationService = NotificationService.getInstance();
