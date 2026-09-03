// shell.ts
// Shell command execution and AST parsing types

export interface CoreShellExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
}

export type CoreCombinatorType = 'none' | 'pipe' | 'and' | 'or' | 'sequence';

export interface CoreParsedCommand {
  argv: string[];
  redirectStdout?: string;
  appendStdout?: boolean;
  redirectStdin?: string;
}

export interface CoreCommandChainNode {
  command: CoreParsedCommand;
  combinator: CoreCombinatorType;
}

export interface CoreShellAst {
  nodes: CoreCommandChainNode[];
  hasSyntaxError: boolean;
  errorMessage?: string;
}
