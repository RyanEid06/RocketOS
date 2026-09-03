// RocketDiagnosticEngine.ts
// TypeScript bridge implementing rocket/apps/diagnostics.rocket
// Performs real syntax, keyword, and rule verification for Rocket 2.1 code

export interface DiagnosticItem {
  ruleId: string;
  lineNumber: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DiagnosticSummary {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isValid: boolean;
  diagnostics: DiagnosticItem[];
}

export class RocketDiagnosticEngine {
  /**
   * Analyzes raw Rocket code against authentic syntax rules:
   * - R1001: Missing 'fn main() -> Int:'
   * - R1002: Tabs forbidden (must use 4 spaces)
   * - R1003: 'null' forbidden (use Option[T])
   * - R1004: Exceptions forbidden (use Result[T, E])
   * - R1005: Obsolete Rust/C types (i32/u32 -> Int)
   * - R1006: Colon missing on block declaration
   * - R1007: Forbidden runtime dlopen/dlsym
   */
  public static analyze(source: string): DiagnosticSummary {
    const lines = source.split('\n');
    const items: DiagnosticItem[] = [];
    let errorCount = 0;
    let warningCount = 0;

    // Check R1001: Entry point
    if (!source.includes('fn main() -> Int:')) {
      warningCount++;
      items.push({
        ruleId: 'R1001',
        lineNumber: 1,
        column: 1,
        message: "Missing canonical entry point 'fn main() -> Int:'",
        severity: 'warning',
      });
    }

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Skip empty lines or full comments
      if (!trimmed || trimmed.startsWith('#')) return;

      // R1002: Tabs check
      if (line.includes('\t')) {
        errorCount++;
        items.push({
          ruleId: 'R1002',
          lineNumber: lineNum,
          column: 1,
          message: 'Tabs are not allowed in Rocket; use 4 spaces for indentation',
          severity: 'error',
        });
      }

      // R1003: null check
      if (/\bnull\b/.test(line)) {
        errorCount++;
        items.push({
          ruleId: 'R1003',
          lineNumber: lineNum,
          column: line.indexOf('null') + 1,
          message: "'null' is not supported in Rocket; use Option[T] (Some / None)",
          severity: 'error',
        });
      }

      // R1004: Exception check
      if (/\b(throw|catch|try)\b/.test(line)) {
        errorCount++;
        items.push({
          ruleId: 'R1004',
          lineNumber: lineNum,
          column: 1,
          message: 'Exceptions are not supported in Rocket; use Result[T, E] (Ok / Err)',
          severity: 'error',
        });
      }

      // R1005: Old C/Rust integer types
      if (/\b(i32|u32|i64|u64|usize)\b/.test(line)) {
        warningCount++;
        items.push({
          ruleId: 'R1005',
          lineNumber: lineNum,
          column: 1,
          message: "Rocket 2.1 uses 'Int' (signed 64-bit) as primary integer type",
          severity: 'warning',
        });
      }

      // R1006: Missing colon on block headers
      if (
        (trimmed.startsWith('fn ') ||
          trimmed.startsWith('if ') ||
          trimmed.startsWith('else if ') ||
          trimmed === 'else' ||
          trimmed.startsWith('while ') ||
          trimmed.startsWith('for ') ||
          trimmed.startsWith('struct ') ||
          trimmed.startsWith('enum ') ||
          trimmed.startsWith('match ') ||
          trimmed.startsWith('case ')) &&
        !trimmed.endsWith(':')
      ) {
        errorCount++;
        items.push({
          ruleId: 'R1006',
          lineNumber: lineNum,
          column: line.length,
          message: "Block statement must terminate with a colon ':'",
          severity: 'error',
        });
      }

      // R1007: dlopen / dynamic symbol checks
      if (trimmed.includes('dlopen') || trimmed.includes('dlsym')) {
        errorCount++;
        items.push({
          ruleId: 'R1007',
          lineNumber: lineNum,
          column: 1,
          message: 'Dynamic symbol resolution (dlopen/dlsym) is forbidden in Rocket; use unsafe: extern fn',
          severity: 'error',
        });
      }
    });

    return {
      errorCount,
      warningCount,
      infoCount: 0,
      isValid: errorCount === 0,
      diagnostics: items,
    };
  }
}
