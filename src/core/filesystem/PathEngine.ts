// PathEngine.ts
// Authoritative TypeScript binding implementing rocket/filesystem/path.rocket

export class PathEngine {
  public static readonly DEFAULT_HOME = '/home/ryan';

  public static isValidPath(rawPath: string): boolean {
    if (!rawPath || typeof rawPath !== 'string') return false;
    if (rawPath.length === 0) return false;
    if (rawPath.includes('\0')) return false;

    // Reject control characters
    for (let i = 0; i < rawPath.length; i++) {
      const code = rawPath.charCodeAt(i);
      if (code < 32 && code !== 9) return false;
    }
    return true;
  }

  public static expandHome(pathStr: string, homeDir = PathEngine.DEFAULT_HOME): string {
    const trimmed = pathStr.trim();
    if (trimmed === '~') return homeDir;
    if (trimmed.startsWith('~/')) return homeDir + trimmed.slice(1);
    if (trimmed === '~root') return '/root';
    if (trimmed.startsWith('~root/')) return '/root' + trimmed.slice(5);
    return trimmed;
  }

  /**
   * Canonicalizes a path:
   * - Expands home directory
   * - Normalizes redundant and duplicate slashes
   * - Resolves '.' and '..'
   * - Root '/' cannot be traversed above by '..'
   * - Strips trailing slash unless root '/'
   */
  public static canonicalize(rawPath: string, homeDir = PathEngine.DEFAULT_HOME): string {
    if (!this.isValidPath(rawPath)) {
      throw new Error('INVALID_PATH: Malformed or unresolvable path');
    }

    let path = this.expandHome(rawPath, homeDir);

    // Replace duplicate slashes
    while (path.includes('//')) {
      path = path.replace(/\/\//g, '/');
    }

    const segments = path.split('/');
    const resolved: string[] = [];

    for (const seg of segments) {
      const s = seg.trim();
      if (!s || s === '.') continue;
      if (s === '..') {
        if (resolved.length > 0) {
          resolved.pop();
        }
        // At root, '..' is safely ignored
      } else {
        resolved.push(s);
      }
    }

    if (resolved.length === 0) {
      return '/';
    }

    return '/' + resolved.join('/');
  }

  /**
   * Resolves a target path relative to current working directory (cwd).
   */
  public static resolve(targetPath: string, cwd = PathEngine.DEFAULT_HOME, homeDir = PathEngine.DEFAULT_HOME): string {
    if (!this.isValidPath(targetPath)) {
      throw new Error('INVALID_PATH: Malformed or unresolvable path');
    }

    const trimmed = targetPath.trim();
    if (trimmed.startsWith('/') || trimmed.startsWith('~')) {
      return this.canonicalize(trimmed, homeDir);
    }

    const base = cwd.endsWith('/') ? cwd : cwd + '/';
    return this.canonicalize(base + trimmed, homeDir);
  }

  public static getParentPath(pathStr: string): string {
    try {
      const canonical = this.canonicalize(pathStr);
      if (canonical === '/' || canonical === '/ThisPC' || canonical === '/Trash') {
        return '/';
      }
      const lastSlash = canonical.lastIndexOf('/');
      if (lastSlash <= 0) return '/';
      return canonical.slice(0, lastSlash);
    } catch {
      return '/';
    }
  }

  public static getBasename(pathStr: string): string {
    try {
      const canonical = this.canonicalize(pathStr);
      if (canonical === '/') return '/';
      const lastSlash = canonical.lastIndexOf('/');
      if (lastSlash < 0) return canonical;
      return canonical.slice(lastSlash + 1);
    } catch {
      return pathStr;
    }
  }

  public static getExtension(nameOrPath: string): string {
    const base = this.getBasename(nameOrPath);
    const lastDot = base.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === base.length - 1) return '';
    return base.slice(lastDot).toLowerCase();
  }

  public static joinPaths(...parts: string[]): string {
    const validParts = parts.filter((p) => p && typeof p === 'string' && p.trim().length > 0);
    if (validParts.length === 0) return '/';
    const joined = validParts.join('/');
    return this.canonicalize(joined);
  }

  public static splitPath(pathStr: string): string[] {
    const canonical = this.canonicalize(pathStr);
    if (canonical === '/') return [];
    return canonical.slice(1).split('/');
  }

  public static isChildOf(parentPath: string, childPath: string): boolean {
    try {
      const p = this.canonicalize(parentPath);
      const c = this.canonicalize(childPath);
      if (p === '/') return c !== '/' && c.startsWith('/');
      return c.startsWith(p + '/');
    } catch {
      return false;
    }
  }
}
