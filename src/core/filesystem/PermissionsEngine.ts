// PermissionsEngine.ts
// Authoritative TypeScript binding implementing rocket/filesystem/permissions.rocket

import { Permissions, SystemUser } from './types';

export class PermissionsEngine {
  public static readonly DEFAULT_FILE_MODE = 0o644; // rw-r--r--
  public static readonly DEFAULT_DIR_MODE = 0o755;  // rwxr-xr-x
  public static readonly ROOT_DIR_MODE = 0o700;     // rwx------
  public static readonly USER_DIR_MODE = 0o755;     // rwxr-xr-x

  public static modeFromOctal(octal: number): Permissions {
    return {
      ownerRead: (octal & 0o400) !== 0,
      ownerWrite: (octal & 0o200) !== 0,
      ownerExec: (octal & 0o100) !== 0,
      groupRead: (octal & 0o040) !== 0,
      groupWrite: (octal & 0o020) !== 0,
      groupExec: (octal & 0o010) !== 0,
      otherRead: (octal & 0o004) !== 0,
      otherWrite: (octal & 0o002) !== 0,
      otherExec: (octal & 0o001) !== 0,
      rawMode: octal,
    };
  }

  public static formatMode(octal: number, isDir: boolean): string {
    const p = this.modeFromOctal(octal);
    const prefix = isDir ? 'd' : '-';
    const ur = p.ownerRead ? 'r' : '-';
    const uw = p.ownerWrite ? 'w' : '-';
    const ux = p.ownerExec ? 'x' : '-';
    const gr = p.groupRead ? 'r' : '-';
    const gw = p.groupWrite ? 'w' : '-';
    const gx = p.groupExec ? 'x' : '-';
    const or = p.otherRead ? 'r' : '-';
    const ow = p.otherWrite ? 'w' : '-';
    const ox = p.otherExec ? 'x' : '-';
    return `${prefix}${ur}${uw}${ux}${gr}${gw}${gx}${or}${ow}${ox}`;
  }

  public static parseMode(modeStr: string): number {
    let mode = 0;
    const clean = modeStr.length === 10 ? modeStr.slice(1) : modeStr;
    if (clean.length !== 9) return this.DEFAULT_FILE_MODE;

    if (clean[0] === 'r') mode |= 0o400;
    if (clean[1] === 'w') mode |= 0o200;
    if (clean[2] === 'x') mode |= 0o100;
    if (clean[3] === 'r') mode |= 0o040;
    if (clean[4] === 'w') mode |= 0o020;
    if (clean[5] === 'x') mode |= 0o010;
    if (clean[6] === 'r') mode |= 0o004;
    if (clean[7] === 'w') mode |= 0o002;
    if (clean[8] === 'x') mode |= 0o001;

    return mode;
  }

  /**
   * Evaluates if a given user has permission to access an inode.
   * Root (UID 0) always has access.
   * Otherwise checks owner -> group -> other bits.
   *
   * @param inode Target inode metadata
   * @param user Active session user
   * @param requiredMode 4 for read, 2 for write, 1 for execute
   */
  public static checkAccess(
    inode: { uid: number; gid: number; mode: number },
    user: SystemUser,
    requiredMode: number
  ): boolean {
    // Superuser root bypasses permission checks
    if (user.uid === 0) {
      return true;
    }

    const perms = this.modeFromOctal(inode.mode);
    const needRead = (requiredMode & 4) !== 0;
    const needWrite = (requiredMode & 2) !== 0;
    const needExec = (requiredMode & 1) !== 0;

    // 1. Owner matching
    if (user.uid === inode.uid) {
      if (needRead && !perms.ownerRead) return false;
      if (needWrite && !perms.ownerWrite) return false;
      if (needExec && !perms.ownerExec) return false;
      return true;
    }

    // 2. Group matching
    const inGroup =
      user.primaryGid === inode.gid ||
      user.supplementaryGids.includes(inode.gid);

    if (inGroup) {
      if (needRead && !perms.groupRead) return false;
      if (needWrite && !perms.groupWrite) return false;
      if (needExec && !perms.groupExec) return false;
      return true;
    }

    // 3. Other matching
    if (needRead && !perms.otherRead) return false;
    if (needWrite && !perms.otherWrite) return false;
    if (needExec && !perms.otherExec) return false;

    return true;
  }
}
