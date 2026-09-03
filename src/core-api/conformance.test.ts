// src/core-api/conformance.test.ts
// Cross-Provider Conformance Test Suite
// Verifies identical deterministic behavior across Rocket Core rules and Browser Fallback

import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserFallbackCoreProvider } from './BrowserFallbackCoreProvider';
import { PathEngine } from '../core/filesystem/PathEngine';
import { PermissionEngine } from '../core/filesystem/PermissionsEngine';
import conformanceData from './fixtures/conformance-data.json';

describe('Dual-Provider Conformance Test Suite', () => {
  let provider: BrowserFallbackCoreProvider;

  beforeEach(() => {
    provider = new BrowserFallbackCoreProvider();
  });

  describe('Path Canonicalization Conformance', () => {
    it.each(conformanceData.pathTests)('conforms on path "$input" -> "$expected"', ({ input, expected }) => {
      const canonical = PathEngine.canonicalize(input);
      expect(canonical).toBe(expected);
    });
  });

  describe('POSIX Permission Checking Conformance', () => {
    it.each(conformanceData.permissionTests)(
      'conforms for mode $mode caller $callerUid requesting $req',
      ({ fileUid, fileGid, mode, callerUid, callerGid, groups, req, expected }) => {
        const modeFlag = req === 'read' ? 'r' : req === 'write' ? 'w' : 'x';
        const allowed = PermissionEngine.checkPermission(
          fileUid,
          fileGid,
          mode,
          callerUid,
          callerGid,
          groups,
          modeFlag
        );
        expect(allowed).toBe(expected);
      }
    );
  });

  describe('Workspace Profile Conformance', () => {
    it('returns standardized workspace definitions with identical schema and ordering', async () => {
      const workspaces = await provider.workspaces.list();
      expect(workspaces.length).toBe(conformanceData.workspaceProfiles.length);

      for (let i = 0; i < conformanceData.workspaceProfiles.length; i++) {
        const fixture = conformanceData.workspaceProfiles[i];
        const actual = workspaces[i];
        expect(actual.id).toBe(fixture.id);
        expect(actual.name).toBe(fixture.name);
        expect(actual.themeAccent).toBe(fixture.themeAccent);
      }
    });
  });

  describe('File Associations Conformance', () => {
    it('maps standard file extensions to authoritative application IDs', async () => {
      const associations = await provider.apps.fileAssociations();

      for (const fixture of conformanceData.fileAssociations) {
        const match = associations.find((a) => a.extension === fixture.extension);
        expect(match).toBeDefined();
        expect(match?.defaultAppId).toBe(fixture.defaultAppId);
      }
    });
  });

  describe('Shell Pipeline Parsing Conformance', () => {
    it.each(conformanceData.shellParsing)(
      'tokenizes "$commandLine" into $expectedNodes AST nodes',
      async ({ commandLine, expectedNodes, firstCommand }) => {
        const ast = await provider.shell.parse(commandLine);
        expect(ast.hasSyntaxError).toBe(false);
        expect(ast.nodes.length).toBe(expectedNodes);
        expect(ast.nodes[0].command.argv[0]).toBe(firstCommand);
      }
    );
  });
});
