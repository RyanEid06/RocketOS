// users.ts
// User and group models for CoreProvider

export interface CoreUser {
  uid: number;
  username: string;
  displayName: string;
  homeDirectory: string;
  primaryGid: number;
  supplementaryGids: number[];
  shell: string;
  isAdministrator: boolean;
}

export interface CoreGroup {
  gid: number;
  name: string;
  description: string;
}
