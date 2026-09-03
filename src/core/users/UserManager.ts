// UserManager.ts
// Authoritative TypeScript binding implementing rocket/users/user.rocket and rocket/admin/elevation.rocket

import { SystemGroup, SystemUser } from '../filesystem/types';

export class UserManager {
  private static instance: UserManager;

  public static readonly ROOT_USER: SystemUser = {
    uid: 0,
    username: 'root',
    displayName: 'System Administrator',
    homeDirectory: '/root',
    primaryGid: 0,
    supplementaryGids: [0, 10, 100],
    shell: '/usr/bin/rsh',
    isAdmin: true,
  };

  public static readonly NORMAL_USER: SystemUser = {
    uid: 1000,
    username: 'ryan',
    displayName: 'Ryan Eid',
    homeDirectory: '/home/ryan',
    primaryGid: 100,
    supplementaryGids: [100, 10, 29, 1000],
    shell: '/usr/bin/rsh',
    isAdmin: true,
  };

  public static readonly SYSTEM_GROUPS: SystemGroup[] = [
    { gid: 0, name: 'root', description: 'Superuser administrative group' },
    { gid: 10, name: 'admin', description: 'System elevation and sudo privileges' },
    { gid: 29, name: 'audio', description: 'Procedural sound engine direct access' },
    { gid: 100, name: 'users', description: 'Standard unprivileged interactive users' },
    { gid: 101, name: 'network', description: 'Network stack control' },
    { gid: 102, name: 'storage', description: 'Block storage and virtual NVMe operations' },
    { gid: 1000, name: 'developers', description: 'Rocket language toolchain and debug access' },
  ];

  private currentUser: SystemUser = UserManager.NORMAL_USER;
  private users: Map<number, SystemUser> = new Map();
  private groups: Map<number, SystemGroup> = new Map();
  private listeners: Set<(user: SystemUser) => void> = new Set();

  private constructor() {
    this.users.set(UserManager.ROOT_USER.uid, UserManager.ROOT_USER);
    this.users.set(UserManager.NORMAL_USER.uid, UserManager.NORMAL_USER);

    for (const g of UserManager.SYSTEM_GROUPS) {
      this.groups.set(g.gid, g);
    }
  }

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  public getCurrentUser(): SystemUser {
    return this.currentUser;
  }

  public isRoot(): boolean {
    return this.currentUser.uid === 0;
  }

  public getUser(uid: number): SystemUser | undefined {
    return this.users.get(uid);
  }

  public getUserByUsername(username: string): SystemUser | undefined {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return u;
      }
    }
    return undefined;
  }

  public getGroup(gid: number): SystemGroup | undefined {
    return this.groups.get(gid);
  }

  public getGroups(): SystemGroup[] {
    return Array.from(this.groups.values());
  }

  public canElevate(user = this.currentUser): boolean {
    if (user.uid === 0) return true;
    if (!user.isAdmin) return false;
    return user.supplementaryGids.includes(10); // admin group
  }

  public elevateToRoot(): boolean {
    if (this.canElevate(this.currentUser)) {
      this.currentUser = UserManager.ROOT_USER;
      this.notify();
      return true;
    }
    return false;
  }

  public dropToNormalUser(): void {
    this.currentUser = UserManager.NORMAL_USER;
    this.notify();
  }

  public switchUser(username: string): boolean {
    const target = this.getUserByUsername(username);
    if (!target) return false;
    this.currentUser = target;
    this.notify();
    return true;
  }

  public subscribe(fn: (user: SystemUser) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn(this.currentUser);
      } catch {}
    }
  }
}
