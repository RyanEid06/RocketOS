// ShellParser.ts
// Authoritative Shell Lexer & Parser for RocketOS rsh v2.0
// Implements rocket/shell/parser.rocket domain model

import { CommandChainNode, ParsedCommand, ShellEnvironment, ShellParseResult } from './types';

type RawTokenType =
  | 'WORD'
  | 'PIPE'
  | 'REDIRECT_OUT'
  | 'REDIRECT_APPEND'
  | 'REDIRECT_IN'
  | 'AND'
  | 'OR'
  | 'SEMICOLON';

interface RawToken {
  type: RawTokenType;
  value: string;
}

export class ShellParser {
  /**
   * Tokenize and parse a shell input string with quotes, escaping, variable expansion,
   * pipelines, redirection, and boolean logic.
   */
  public static parse(input: string, env: ShellEnvironment = {}): ShellParseResult {
    const trimmed = input.trim();
    if (!trimmed) {
      return { nodes: [], hasSyntaxError: false };
    }

    try {
      const tokens = this.tokenize(trimmed, env);
      const nodes = this.buildAST(tokens);
      return { nodes, hasSyntaxError: false };
    } catch (err: any) {
      return {
        nodes: [],
        hasSyntaxError: true,
        errorMessage: err?.message || 'Shell syntax error',
      };
    }
  }

  // =========================================================================
  // TOKENIZER
  // =========================================================================
  private static tokenize(input: string, env: ShellEnvironment): RawToken[] {
    const tokens: RawToken[] = [];
    let i = 0;
    const len = input.length;

    while (i < len) {
      const c = input[i];

      // Skip whitespace
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        i++;
        continue;
      }

      // Check multi-character operators
      if (c === '&' && i + 1 < len && input[i + 1] === '&') {
        tokens.push({ type: 'AND', value: '&&' });
        i += 2;
        continue;
      }

      if (c === '|' && i + 1 < len && input[i + 1] === '|') {
        tokens.push({ type: 'OR', value: '||' });
        i += 2;
        continue;
      }

      if (c === '>' && i + 1 < len && input[i + 1] === '>') {
        tokens.push({ type: 'REDIRECT_APPEND', value: '>>' });
        i += 2;
        continue;
      }

      // Check single-character operators
      if (c === '|') {
        tokens.push({ type: 'PIPE', value: '|' });
        i++;
        continue;
      }

      if (c === '>') {
        tokens.push({ type: 'REDIRECT_OUT', value: '>' });
        i++;
        continue;
      }

      if (c === '<') {
        tokens.push({ type: 'REDIRECT_IN', value: '<' });
        i++;
        continue;
      }

      if (c === ';') {
        tokens.push({ type: 'SEMICOLON', value: ';' });
        i++;
        continue;
      }

      // Word / Quoted token
      let wordBuffer = '';

      while (i < len) {
        const char = input[i];

        // Break on unquoted operators or whitespace
        if (
          char === ' ' ||
          char === '\t' ||
          char === '\n' ||
          char === '\r' ||
          char === '|' ||
          char === '>' ||
          char === '<' ||
          char === ';' ||
          (char === '&' && i + 1 < len && input[i + 1] === '&')
        ) {
          break;
        }

        // Single Quote (preserves content literally)
        if (char === "'") {
          i++;
          while (i < len && input[i] !== "'") {
            wordBuffer += input[i];
            i++;
          }
          if (i >= len) {
            throw new Error('Unterminated single quote');
          }
          i++; // skip closing quote
          continue;
        }

        // Double Quote (expands variables, supports backslash escape)
        if (char === '"') {
          i++;
          while (i < len && input[i] !== '"') {
            if (input[i] === '\\' && i + 1 < len) {
              const next = input[i + 1];
              if (next === '"' || next === '\\' || next === '$' || next === '`') {
                wordBuffer += next;
                i += 2;
                continue;
              }
            }
            if (input[i] === '$') {
              const { expanded, consumed } = this.extractAndExpandVariable(input, i, env);
              wordBuffer += expanded;
              i += consumed;
              continue;
            }
            wordBuffer += input[i];
            i++;
          }
          if (i >= len) {
            throw new Error('Unterminated double quote');
          }
          i++; // skip closing quote
          continue;
        }

        // Backslash escaping in normal word
        if (char === '\\' && i + 1 < len) {
          wordBuffer += input[i + 1];
          i += 2;
          continue;
        }

        // Variable expansion in unquoted word
        if (char === '$') {
          const { expanded, consumed } = this.extractAndExpandVariable(input, i, env);
          wordBuffer += expanded;
          i += consumed;
          continue;
        }

        // Tilde expansion at start of word
        if (char === '~' && wordBuffer === '' && (i + 1 >= len || input[i + 1] === '/' || input[i + 1] === ' ')) {
          const home = env['HOME'] || '/home/ryan';
          wordBuffer += home;
          i++;
          continue;
        }

        wordBuffer += char;
        i++;
      }

      tokens.push({ type: 'WORD', value: wordBuffer });
    }

    return tokens;
  }

  private static extractAndExpandVariable(
    str: string,
    startIndex: number,
    env: ShellEnvironment
  ): { expanded: string; consumed: number } {
    let i = startIndex + 1; // skip '$'
    if (i >= str.length) {
      return { expanded: '$', consumed: 1 };
    }

    // Handle ${VAR}
    if (str[i] === '{') {
      const closeIndex = str.indexOf('}', i);
      if (closeIndex === -1) {
        return { expanded: '${', consumed: 2 };
      }
      const varName = str.substring(i + 1, closeIndex);
      const val = env[varName] ?? '';
      return { expanded: val, consumed: closeIndex - startIndex + 1 };
    }

    // Handle $VAR
    let varName = '';
    while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
      varName += str[i];
      i++;
    }

    if (!varName) {
      return { expanded: '$', consumed: 1 };
    }

    const val = env[varName] ?? '';
    return { expanded: val, consumed: i - startIndex };
  }

  // =========================================================================
  // AST BUILDER
  // =========================================================================
  private static buildAST(tokens: RawToken[]): CommandChainNode[] {
    const nodes: CommandChainNode[] = [];
    let currentArgv: string[] = [];
    let redirectStdout: string | undefined;
    let appendStdout: boolean | undefined;
    let redirectStdin: string | undefined;

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === 'WORD') {
        currentArgv.push(token.value);
        i++;
        continue;
      }

      if (token.type === 'REDIRECT_OUT' || token.type === 'REDIRECT_APPEND') {
        const isAppend = token.type === 'REDIRECT_APPEND';
        i++;
        if (i >= tokens.length || tokens[i].type !== 'WORD') {
          throw new Error(`Syntax error near unexpected token '${token.value}'`);
        }
        redirectStdout = tokens[i].value;
        appendStdout = isAppend;
        i++;
        continue;
      }

      if (token.type === 'REDIRECT_IN') {
        i++;
        if (i >= tokens.length || tokens[i].type !== 'WORD') {
          throw new Error("Syntax error near unexpected token '<'");
        }
        redirectStdin = tokens[i].value;
        i++;
        continue;
      }

      // Combinator tokens
      if (
        token.type === 'PIPE' ||
        token.type === 'AND' ||
        token.type === 'OR' ||
        token.type === 'SEMICOLON'
      ) {
        if (currentArgv.length === 0) {
          throw new Error(`Syntax error near unexpected token '${token.value}'`);
        }

        const combinator =
          token.type === 'PIPE'
            ? 'PIPE'
            : token.type === 'AND'
            ? 'AND'
            : token.type === 'OR'
            ? 'OR'
            : 'SEQUENCE';

        nodes.push({
          command: {
            argv: [...currentArgv],
            redirectStdout,
            appendStdout,
            redirectStdin,
          },
          combinator,
        });

        currentArgv = [];
        redirectStdout = undefined;
        appendStdout = undefined;
        redirectStdin = undefined;
        i++;
        continue;
      }

      i++;
    }

    if (currentArgv.length > 0) {
      nodes.push({
        command: {
          argv: currentArgv,
          redirectStdout,
          appendStdout,
          redirectStdin,
        },
        combinator: 'NONE',
      });
    }

    return nodes;
  }
}
