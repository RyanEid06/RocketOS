import { describe, it, expect } from 'vitest';
import { AppContract } from './AppContract';
import { AppSecurityManager } from './AppSecurityManager';
import { RocketDiagnosticEngine } from './RocketDiagnosticEngine';

describe('AppContract & Security & Diagnostics', () => {
  it('enforces capabilities across registered applications', () => {
    const sec = AppSecurityManager.getInstance();
    // System apps like taskmanager or settings have elevated capabilities
    expect(sec.checkCapability('taskmanager', 'process.manage')).toBe(true);
    expect(sec.checkCapability('paint', 'process.manage')).toBe(false);
  });

  it('validates filesystem access boundaries', () => {
    const sec = AppSecurityManager.getInstance();
    // User app accessing user documents
    const validAccess = sec.validateFilesystem('notes', '/home/ryan/Documents/memo.txt', true);
    expect(validAccess.type).toBe('GRANTED');

    // User app attempting to write to system core directory
    const restrictedAccess = sec.validateFilesystem('notes', '/etc/shadow', true);
    expect(['RESTRICTED', 'PATH_ESCAPE_ATTEMPT']).toContain(restrictedAccess.type);
  });

  it('diagnoses Rocket 2.1 syntax compliance', () => {
    const validCode = `# Valid Rocket 2.1
fn main() -> Int:
    let x = 42
    print(x)
    return 0
`;
    const summary = RocketDiagnosticEngine.analyze(validCode);
    expect(summary.isValid).toBe(true);
    expect(summary.errorCount).toBe(0);

    const invalidCode = `# Invalid tab and null
fn main() -> Int:
\tlet x = null
\treturn 0
`;
    const invalidSummary = RocketDiagnosticEngine.analyze(invalidCode);
    expect(invalidSummary.isValid).toBe(false);
    expect(invalidSummary.errorCount).toBeGreaterThan(0);
  });
});
