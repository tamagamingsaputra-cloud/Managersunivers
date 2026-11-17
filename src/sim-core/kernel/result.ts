export interface DomainError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err(
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Result<never, DomainError> {
  const error: DomainError = details === undefined ? { code, message } : { code, message, details };
  return { ok: false, error };
}
