export type DataErrorKind = 'setup' | 'config' | 'network' | 'unknown'

export class DataError extends Error {
  constructor(
    message: string,
    public kind: DataErrorKind,
  ) {
    super(message)
    this.name = 'DataError'
  }
}

const SETUP_CODES = new Set(['PGRST205', 'PGRST202', '42P01', '42883'])

export function toDataError(error: { message?: string; code?: string } | null | undefined): DataError {
  const message = error?.message ?? 'Unknown error'
  const code = error?.code ?? ''
  if (SETUP_CODES.has(code) || /schema cache|does not exist|could not find the (table|function)/i.test(message)) {
    return new DataError(message, 'setup')
  }
  if (/invalid api key|jwt|no api key|placeholder/i.test(message) || code === 'PGRST301') {
    return new DataError(message, 'config')
  }
  if (/fetch|network|timeout|failed to load/i.test(message)) {
    return new DataError(message, 'network')
  }
  return new DataError(message, 'unknown')
}

export function errorKind(error: unknown): DataErrorKind {
  return error instanceof DataError ? error.kind : 'unknown'
}
