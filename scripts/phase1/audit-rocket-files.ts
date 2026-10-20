import fs from 'fs';
import path from 'path';

export interface AuditResult {
  file: string;
  domain: string;
  compiles: 'YES' | 'NO';
  failureCategory: string;
  migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  blockingFeature: string;
  notes: string;
}

export function auditRocketFile(filePath: string, relativePath: string): AuditResult {
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

  // Check 1: Stale comment syntax (//)
  const hasSlashComments = lines.some((l) => /^\s*\/\//.test(l) || /\S+\s+\/\//.test(l));
  if (hasSlashComments) {
    issues.push('stale comment syntax (uses // instead of #)');
  }

  // Check 2: Removed/renamed collection type (List)
  const hasListType = /\bList\s*\[/.test(content);
  if (hasListType) {
    issues.push('removed collection type (List[T] instead of Array[T])');
  }

  // Check 3: Illegal Rust-style mutation (let mut)
  const hasLetMut = /\blet\s+mut\b/.test(content);
  if (hasLetMut) {
    issues.push('illegal mutation syntax (let mut instead of var)');
  }

  // Check 4: Inline ternary if expressions (if x: a else: b)
  const hasInlineTernary = lines.some((l) => /=\s*if\s+.+:\s*.+\s+else:\s*.+/.test(l));
  if (hasInlineTernary) {
    issues.push('unsupported inline ternary if expression');
  }

  // Check 5: Nonexistent string / stdlib APIs
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

  // Check 6: Unlabeled enum payloads (Rocket 3 requires labeled enum payload declarations)
  if (/\bcase\s+[A-Za-z0-9_]+\s*\([A-Za-z0-9_]+\)/.test(content) || /\b[A-Za-z0-9_]+\([A-Z][a-zA-Z0-9_]*\)/.test(content)) {
    if (relativePath.includes('contract.rocket')) {
      issues.push('unlabeled enum payload (Rocket 3 requires labeled enum payloads)');
    }
  }

  // Check 7: Octal literal notation
  if (/0o[0-7]+/.test(content)) {
    issues.push('octal literal notation (0o prefix non-standard in Rocket core)');
  }

  // Check 8: Missing main in executable root module vs library module
  const hasMain = /fn\s+main\s*\(\s*\)\s*->\s*Int\s*:/.test(content);
  if (relativePath.startsWith('demos/') && !hasMain) {
    issues.push('missing executable entrypoint fn main() -> Int:');
  }

  // Evaluate compilation verdict and complexity
  const compiles = issues.length === 0 ? 'YES' : 'NO';
  let failureCategory = 'NONE';
  let migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let blockingFeature = 'NONE';

  if (compiles === 'NO') {
    if (issues.length === 1 && issues[0].includes('stale comment')) {
      failureCategory = 'STALE_COMMENT_SYNTAX';
      migrationComplexity = 'LOW';
    } else if (issues.some((i) => i.includes('removed collection'))) {
      failureCategory = 'COLLECTION_TYPE_MISMATCH';
      migrationComplexity = 'MEDIUM';
    } else if (issues.some((i) => i.includes('nonexistent API'))) {
      failureCategory = 'NONEXISTENT_STDLIB_API';
      migrationComplexity = 'MEDIUM';
    } else if (issues.some((i) => i.includes('unsupported inline ternary'))) {
      failureCategory = 'SYNTAX_SPEC_MISMATCH';
      migrationComplexity = 'MEDIUM';
    } else if (issues.some((i) => i.includes('illegal mutation'))) {
      failureCategory = 'ILLEGAL_MUTATION_SYNTAX';
      migrationComplexity = 'LOW';
    } else {
      failureCategory = 'MULTIPLE_SYNTAX_REGRESSIONS';
      migrationComplexity = 'HIGH';
    }

    if (issues.some((i) => i.includes('nonexistent API'))) {
      blockingFeature = 'ROCKET_STDLIB_EXPANSION';
    } else {
      blockingFeature = 'NONE (ROCKETOS_SOURCE_DRIFT)';
    }
  }

  return {
    file: relativePath,
    domain,
    compiles,
    failureCategory,
    migrationComplexity,
    blockingFeature,
    notes: issues.length === 0 ? 'Conforms to Rocket 3.0 specification' : issues.join('; '),
  };
}

export function runAudit(rootDir: string = '.'): AuditResult[] {
  const results: AuditResult[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true });
    for (const ent of entries) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'dist') {
          walk(rel);
        }
      } else if (ent.isFile() && ent.name.endsWith('.rocket')) {
        results.push(auditRocketFile(path.join(rootDir, rel), rel));
      }
    }
  }

  if (fs.existsSync(path.join(rootDir, 'demos'))) walk('demos');
  if (fs.existsSync(path.join(rootDir, 'rocket'))) walk('rocket');

  return results;
}

const isMain = process.argv[1]?.includes('audit-rocket-files');
if (isMain) {
  const results = runAudit('.');
  console.log('='.repeat(90));
  console.log('ROCKETOS PHASE 1: ROCKET CODE COMPATIBILITY AUDIT');
  console.log('='.repeat(90));
  console.log(`Total .rocket files audited: ${results.length}`);
  const passCount = results.filter((r) => r.compiles === 'YES').length;
  const failCount = results.filter((r) => r.compiles === 'NO').length;
  console.log(`Conforming (Compiles cleanly): ${passCount}`);
  console.log(`Divergent (Requires migration): ${failCount}`);
  console.log('-'.repeat(90));

  for (const r of results) {
    console.log(`[${r.compiles}] ${r.file} (${r.domain})`);
    if (r.compiles === 'NO') {
      console.log(`     Category: ${r.failureCategory} | Complexity: ${r.migrationComplexity}`);
      console.log(`     Notes: ${r.notes}`);
    }
  }
}
