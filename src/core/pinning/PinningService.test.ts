import { describe, it, expect, beforeEach } from 'vitest';
import { PinningService } from './PinningService';

describe('PinningService', () => {
  let ps: PinningService;

  beforeEach(() => {
    ps = PinningService.getInstance();
    ps.setPinned(['explorer', 'terminal']);
  });

  it('reports pinned status accurately', () => {
    expect(ps.isPinned('explorer')).toBe(true);
    expect(ps.isPinned('terminal')).toBe(true);
    expect(ps.isPinned('notes')).toBe(false);
  });

  it('pins an unpinned app', () => {
    ps.pinApp('notes');
    expect(ps.isPinned('notes')).toBe(true);
    expect(ps.getPinned()).toContain('notes');
  });

  it('unpins an app', () => {
    ps.unpinApp('terminal');
    expect(ps.isPinned('terminal')).toBe(false);
    expect(ps.getPinned()).not.toContain('terminal');
  });

  it('toggles pin status back and forth', () => {
    ps.togglePin('paint');
    expect(ps.isPinned('paint')).toBe(true);
    ps.togglePin('paint');
    expect(ps.isPinned('paint')).toBe(false);
  });

  it('reorders pinned apps', () => {
    ps.reorderPinned(['terminal', 'explorer']);
    expect(ps.getPinned()).toEqual(['terminal', 'explorer']);
  });
});
