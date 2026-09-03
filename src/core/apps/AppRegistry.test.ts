import { describe, it, expect } from 'vitest';
import { AppRegistry } from './AppRegistry';

describe('AppRegistry', () => {
  it('registers and retrieves system apps', () => {
    const explorer = AppRegistry.getApp('explorer');
    expect(explorer).toBeDefined();
    expect(explorer.displayName).toBe('File Explorer');
    expect(explorer.isSystemApp).toBe(true);
    expect(explorer.constraints.defaultWidth).toBeGreaterThan(0);
  });

  it('provides default pinned app ids', () => {
    const pinned = AppRegistry.getDefaultPinnedAppIds();
    expect(pinned.length).toBeGreaterThan(0);
    expect(pinned).toContain('explorer');
    expect(pinned).toContain('terminal');
  });

  it('filters apps by category', () => {
    const devApps = AppRegistry.getAppsByCategory('developer');
    expect(devApps.some((a) => a.id === 'terminal')).toBe(true);
    expect(devApps.some((a) => a.id === 'rocket-studio')).toBe(true);
  });

  it('searches apps by query keywords', () => {
    const results = AppRegistry.searchApps('terminal');
    expect(results.some((a) => a.id === 'terminal')).toBe(true);

    const codeResults = AppRegistry.searchApps('code');
    expect(codeResults.length).toBeGreaterThan(0);
  });
});
