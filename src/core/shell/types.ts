// Shell types matching rocket/shell/parser.rocket

export type CombinatorType = 'NONE' | 'PIPE' | 'AND' | 'OR' | 'SEQUENCE';

export interface ParsedCommand {
  argv: string[];
  redirectStdout?: string;
  appendStdout?: boolean;
  redirectStdin?: string;
}

export interface CommandChainNode {
  command: ParsedCommand;
  combinator: CombinatorType;
}

export interface ShellParseResult {
  nodes: CommandChainNode[];
  hasSyntaxError: boolean;
  errorMessage?: string;
}

export interface ShellEnvironment {
  [key: string]: string;
}

export interface ShellExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface TerminalTabSession {
  id: string;
  title: string;
  cwd: string;
  env: ShellEnvironment;
  history: string[];
  historyIndex: number;
  outputLines: Array<{ id: string; type: 'input' | 'stdout' | 'stderr' | 'system'; text: string; prompt?: string }>;
}
