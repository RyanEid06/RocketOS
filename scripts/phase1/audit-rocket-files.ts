import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export type StaticCompatibility = 'NO_OBVIOUS_DRIFT' | 'SOURCE_DRIFT_DETECTED';
export type ActualCompilation = 'PASS' | 'FAIL' | 'NOT_TESTED';

export const REPRESENTATIVE_FILES: string[] = [
  'demos/hello.rocket',
  'rocket/filesystem/path.rocket',
  'rocket/filesystem/permissions.rocket',
  'rocket/process/manager.rocket',
  'rocket/services/settings.rocket',
  'rocket/search/search_indexer.rocket',
  'rocket/notifications/notification_engine.rocket',
  'rocket/windowing/manager.rocket',
  'rocket/core-host/rocket_core_main.rocket',
];

export interface CompileExecutionResult {
  status: ActualCompilation;
  exitCode: number | null;
  diagnostic: string | null;
  rawOutput: string;
}

export interface AuditResult {
  file: string;
  domain: string;
  staticCompatibility: StaticCompatibility;
  actualCompilation: ActualCompilation;
  driftCategory: string;
  migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  blockingFeature: string;
  exitCode: number | null;
  diagnostic: string | null;
  notes: string;
}

export function executeRocketc(rocketcPath: string, filePath: string): CompileExecutionResult {
  if (!fs.existsSync(rocketcPath)) {
    return {
      status: 'NOT_TESTED',
      exitCode: null,
      diagnostic: `rocketc binary not found at ${rocketcPath}`,
      rawOutput: '',
    };
  }

  const run = spawnSync(rocketcPath, ['check', filePath], {
    encoding: 'utf-8',
    timeout: 15000,
  });

  const rawOutput = ((run.stdout || '') + '\n' + (run.stderr || '')).trim();
  const exitCode = run.status;

  if (exitCode === 0) {
    return {
      status: 'PASS',
      exitCode: 0,
      diagnostic: 'check succeeded',
      rawOutput,
    };
  }

  // Extract first informative error line
  const lines = rawOutput.split('\n').map((l) => l.trim()).filter(Boolean);
  const errorLine = lines.find((l) => l.includes('error[') || l.includes('error:')) || lines[0] || 'compilation failed';

  return {
    status: 'FAIL',
    exitCode: exitCode ?? 1,
    diagnostic: errorLine,
    rawOutput,
  };
}

export function auditRocketFile(
  filePath: string,
  relativePath: string,
  rocketcPath?: string | null
): AuditResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Domain extraction
  let domain = 'general';
  if (relativePath.startsWith('demos/')) domain = 'demo';
  else if (relativePath.startsWith('rocket/filesystem/')) domain = 'filesystem';
  else if (relativePath.startsWith('rocket/process/')) domain = 'process';
  else if (relativePath.startsWith('rocket/services/')) domain = 'services';
  else if (relativePath.startsWith('rocket/commands/')) domain = 'commands';
  else if (relativePath.startsWith('rocket/shell/')) domain = 'shell';
  else if (relativePath.startsWith('rocket/windowing/')) domain = 'windowing';
  else if (relativePath.startsWith('rocket/apps/')) domain = 'apps';
  else if (relativePath.startsWith('rocket/admin/')) domain = 'admin';
  else if (relativePath.startsWith('rocket/users/')) domain = 'users';
  else if (relativePath.startsWith('rocket/core-host/')) domain = 'core-host';
  else if (relativePath.startsWith('rocket/core/')) domain = 'core';
  else if (relativePath.startsWith('rocket/search/')) domain = 'search';
  else if (relativePath.startsWith('rocket/notifications/')) domain = 'notifications';
  else if (relativePath.startsWith('rocket/persistence/')) domain = 'persistence';
  else if (relativePath.startsWith('rocket/sessions/')) domain = 'sessions';
  else if (relativePath.startsWith('rocket/telemetry/')) domain = 'telemetry';

  const issues: string[] = [];

  // Static check 1: Stale comment syntax (//)
  const hasSlashComments = lines.some((l) => /^\s*\/\//.test(l) || /\S+\s+\/\//.test(l));
  if (hasSlashComments) {
    issues.push('stale comment syntax (uses // instead of #)');
  }

  // Static check 2: Removed/renamed collection type (List)
  const hasListType = /\bList\s*\[/.test(content);
  if (hasListType) {
    issues.push('removed collection type (List[T] instead of Array[T])');
  }

  // Static check 3: Illegal Rust-style mutation (let mut)
  const hasLetMut = /\blet\s+mut\b/.test(content);
  if (hasLetMut) {
    issues.push('illegal mutation syntax (let mut instead of var)');
  }

  // Static check 4: Inline ternary if expressions (if x: a else: b)
  const hasInlineTernary = lines.some((l) => /=\s*if\s+.+:\s*.+\s+else:\s*.+/.test(l));
  if (hasInlineTernary) {
    issues.push('unsupported inline ternary if expression');
  }

  // Static check 5: Nonexistent string / stdlib APIs
  if (content.includes('string.from_bool')) {
    issues.push('nonexistent API: std.string has no from_bool');
  }
  if (content.includes('time.now_iso')) {
    issues.push('nonexistent API: std.time has no now_iso (use std.datetime)');
  }
  if (content.includes('time.timestamp_ms')) {
    issues.push('nonexistent API: std.time has no timestamp_ms (use time.monotonic_milliseconds)');
  }
  if (content.includes('map.new()')) {
    issues.push('nonexistent API: map.new() (use std.collections)');
  }

  // Static check 6: Unlabeled enum payloads (Rocket 3 requires labeled enum payload declarations)
  if (
    /\bcase\s+[A-Za-z0-9_]+\s*\([A-Za-z0-9_]+\)/.test(content) ||
    /\b[A-Za-z0-9_]+\([A-Z][a-zA-Z0-9_]*\)/.test(content)
  ) {
    if (relativePath.includes('contract.rocket')) {
      issues.push('unlabeled enum payload (Rocket 3 requires labeled enum payloads)');
    }
  }

  // Static check 7: Octal literal notation
  if (/0o[0-7]+/.test(content)) {
    issues.push('octal literal notation (0o prefix non-standard in Rocket core)');
  }

  // Static check 8: Missing main in executable root module vs library module
  const hasMain = /fn\s+main\s*\(\s*\)\s*->\s*Int\s*:/.test(content);
  if (relativePath.startsWith('demos/') && !hasMain) {
    issues.push('missing executable entrypoint fn main() -> Int:');
  }

  const staticCompatibility: StaticCompatibility =
    issues.length === 0 ? 'NO_OBVIOUS_DRIFT' : 'SOURCE_DRIFT_DETECTED';

  let driftCategory = 'NONE';
  let migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let blockingFeature = 'NONE';

  if (staticCompatibility === 'SOURCE_DRIFT_DETECTED') {
    if (issues.length === 1 && issues[0].includes('stale comment')) {
      driftCategory = 'STALE_COMMENT_SYNTAX';
      migrationComplexity = 'LOW';
    } else if (issues.some((i) => i.includes('removed collection'))) {
      driftCategory = 'COLLECTION_TYPE_MISMATCH';
      migrationComplexity = 'MEDIUM';
    } else if (issues.some((i) => i.includes('nonexistent API'))) {
      driftCategory = 'NONEXISTENT_STDLIB_API';
      migrationComplexity = 'MEDIUM';
    } else if (issues.some((i) => i.includes('unsupported inline ternary'))) {
      driftCategory = 'SYNTAX_SPEC_MISMATCH';
      migrationComplexity = 'MEDIUM';
    } else if (issues.some((i) => i.includes('illegal mutation'))) {
      driftCategory = 'ILLEGAL_MUTATION_SYNTAX';
      migrationComplexity = 'LOW';
    } else {
      driftCategory = 'MULTIPLE_SYNTAX_REGRESSIONS';
      migrationComplexity = 'HIGH';
    }

    if (issues.some((i) => i.includes('nonexistent API'))) {
      blockingFeature = 'ROCKET_STDLIB_EXPANSION';
    } else {
      blockingFeature = 'NONE (ROCKETOS_SOURCE_DRIFT)';
    }
  }

  // Actual rocketc compilation check if rocketc is available and file is representative (or requested)
  let actualCompilation: ActualCompilation = 'NOT_TESTED';
  let exitCode: number | null = null;
  let diagnostic: string | null = null;

  if (rocketcPath && fs.existsSync(rocketcPath)) {
    const isRepresentative = REPRESENTATIVE_FILES.includes(relativePath);
    if (isRepresentative) {
      const execResult = executeRocketc(rocketcPath, filePath);
      actualCompilation = execResult.status;
      exitCode = execResult.exitCode;
      diagnostic = execResult.diagnostic;
    }
  }

  return {
    file: relativePath,
    domain,
    staticCompatibility,
    actualCompilation,
    driftCategory,
    migrationComplexity,
    blockingFeature,
    exitCode,
    diagnostic,
    notes:
      issues.length === 0
        ? 'No obvious syntax or stdlib pattern drift detected'
        : issues.join('; '),
  };
}

export function resolveRocketcPath(): string | null {
  if (process.env.ROCKETC && fs.existsSync(process.env.ROCKETC)) {
    return process.env.ROCKETC;
  }
  const defaultLocations = [
    '/tmp/rocket-pinned/build/rocketc',
    '/tmp/rocketc',
    path.join(process.cwd(), 'build/rocketc'),
  ];
  for (const loc of defaultLocations) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

export function runAudit(rootDir: string = '.', rocketcPath?: string | null): AuditResult[] {
  const results: AuditResult[] = [];
  const compiler = rocketcPath !== undefined ? rocketcPath : resolveRocketcPath();

  function walk(dir: string) {
    const entries = fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true });
    for (const ent of entries) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'dist') {
          walk(rel);
        }
      } else if (ent.isFile() && ent.name.endsWith('.rocket')) {
        results.push(auditRocketFile(path.join(rootDir, rel), rel, compiler));
      }
    }
  }

  if (fs.existsSync(path.join(rootDir, 'demos'))) walk('demos');
  if (fs.existsSync(path.join(rootDir, 'rocket'))) walk('rocket');

  return results;
}

const isMain = process.argv[1]?.includes('audit-rocket-files');
if (isMain) {
  const compiler = resolveRocketcPath();
  const results = runAudit('.', compiler);

  console.log('='.repeat(92));
  console.log('ROCKETOS PHASE 1: ROCKET CODE COMPATIBILITY & STATIC DRIFT AUDIT');
  console.log('='.repeat(92));
  console.log(`Total .rocket files audited: ${results.length}`);
  const noDriftCount = results.filter((r) => r.staticCompatibility === 'NO_OBVIOUS_DRIFT').length;
  const driftCount = results.filter((r) => r.staticCompatibility === 'SOURCE_DRIFT_DETECTED').length;
  console.log(`Static Analysis (Pattern Drift):`);
  console.log(`  - NO_OBVIOUS_DRIFT:       ${noDriftCount}`);
  console.log(`  - SOURCE_DRIFT_DETECTED:  ${driftCount}`);

  const passCount = results.filter((r) => r.actualCompilation === 'PASS').length;
  const failCount = results.filter((r) => r.actualCompilation === 'FAIL').length;
  const notTestedCount = results.filter((r) => r.actualCompilation === 'NOT_TESTED').length;
  console.log(`Actual rocketc Compilation (Pinned commit 3d62e54):`);
  console.log(`  - PASS:                   ${passCount}`);
  console.log(`  - FAIL:                   ${failCount}`);
  console.log(`  - NOT_TESTED:             ${notTestedCount}`);
  if (compiler) {
    console.log(`  - Compiler Binary:        ${compiler}`);
  } else {
    console.log(`  - Compiler Binary:        NONE (rocketc not found in environment; actual compilation NOT_TESTED)`);
  }
  console.log('-'.repeat(92));

  for (const r of results) {
    const staticTag = `STATIC: ${r.staticCompatibility}`;
    const actualTag =
      r.actualCompilation === 'NOT_TESTED'
        ? 'ACTUAL: NOT_TESTED'
        : `ACTUAL: ${r.actualCompilation} (exit ${r.exitCode})`;

    console.log(`[${staticTag} | ${actualTag}] ${r.file} (${r.domain})`);
    if (r.staticCompatibility === 'SOURCE_DRIFT_DETECTED') {
      console.log(`     Drift Category: ${r.driftCategory} | Complexity: ${r.migrationComplexity}`);
      console.log(`     Drift Notes:    ${r.notes}`);
    }
    if (r.diagnostic) {
      console.log(`     Compiler Output: ${r.diagnostic}`);
    }
  }

  // Verify representative files requirement
  console.log('='.repeat(92));
  console.log('REPRESENTATIVE MODULES COMPILATION MATRIX:');
  console.log('='.repeat(92));
  const representativeResults = results.filter((r) => REPRESENTATIVE_FILES.includes(r.file));
  for (const rep of representativeResults) {
    console.log(
      `  * ${rep.file.padEnd(48)}: ${rep.actualCompilation.padEnd(10)} (exit ${String(rep.exitCode).padEnd(4)}) -> ${rep.diagnostic || 'N/A'}`
    );
  }
  console.log('-'.repeat(92));
}
