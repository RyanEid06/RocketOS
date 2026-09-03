// CoreError.ts
// Standardized error representation across Rocket Core and TypeScript presentation layer

export type CoreErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'INVALID_PATH'
  | 'INVALID_ARGUMENT'
  | 'UNSUPPORTED'
  | 'CORE_UNAVAILABLE'
  | 'PROTOCOL_MISMATCH'
  | 'SERVICE_FAILED'
  | 'PROCESS_NOT_FOUND'
  | 'READ_ONLY'
  | 'CONFLICT';

export class CoreError extends Error {
  public readonly code: CoreErrorCode;
  public readonly details?: unknown;

  constructor(code: CoreErrorCode, message: string, details?: unknown) {
    super(`[${code}] ${message}`);
    this.name = 'CoreError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, CoreError.prototype);
  }

  public static notFound(pathOrTarget: string): CoreError {
    return new CoreError('NOT_FOUND', `Target '${pathOrTarget}' was not found`);
  }

  public static alreadyExists(target: string): CoreError {
    return new CoreError('ALREADY_EXISTS', `Target '${target}' already exists`);
  }

  public static permissionDenied(operation: string, path?: string): CoreError {
    return new CoreError(
      'PERMISSION_DENIED',
      `Permission denied for operation '${operation}'${path ? ` on '${path}'` : ''}`
    );
  }

  public static invalidPath(path: string, reason?: string): CoreError {
    return new CoreError('INVALID_PATH', `Invalid path '${path}'${reason ? `: ${reason}` : ''}`);
  }

  public static invalidArgument(param: string, reason: string): CoreError {
    return new CoreError('INVALID_ARGUMENT', `Invalid argument '${param}': ${reason}`);
  }

  public static unsupported(feature: string): CoreError {
    return new CoreError('UNSUPPORTED', `Operation '${feature}' is unsupported on this provider`);
  }

  public static coreUnavailable(reason: string): CoreError {
    return new CoreError('CORE_UNAVAILABLE', `Rocket Core host is unavailable: ${reason}`);
  }

  public static protocolMismatch(expected: number, received: number): CoreError {
    return new CoreError(
      'PROTOCOL_MISMATCH',
      `Protocol mismatch: expected protocol v${expected}, host returned v${received}`
    );
  }

  public static serviceFailed(service: string, reason: string): CoreError {
    return new CoreError('SERVICE_FAILED', `Service '${service}' failed: ${reason}`);
  }

  public static processNotFound(pid: number): CoreError {
    return new CoreError('PROCESS_NOT_FOUND', `Process PID ${pid} was not found`);
  }

  public static readOnly(path: string): CoreError {
    return new CoreError('READ_ONLY', `Path '${path}' is read-only`);
  }

  public static conflict(reason: string): CoreError {
    return new CoreError('CONFLICT', `Operation conflicted with existing state: ${reason}`);
  }
}
