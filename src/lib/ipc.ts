import type { AppError } from './types'

// Thin, dependency-free bridge over Tauri's internal IPC.
// We intentionally do NOT depend on `@tauri-apps/api` so the frontend builds
// offline and the backend contract lives in exactly one typed place (see
// `src/lib/types.ts` and the mirrored Rust `AppError`).
declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
    }
  }
}

export function backendAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
}

function normalizeError(reason: unknown): AppError {
  if (reason && typeof reason === 'object') {
    const r = reason as Partial<AppError>
    if (typeof r.kind === 'string' && typeof r.message === 'string') {
      return {
        kind: r.kind,
        message: r.message,
        detail: r.detail,
        retryable: r.retryable ?? false,
      }
    }
  }
  if (typeof reason === 'string') {
    try {
      const parsed = JSON.parse(reason) as Partial<AppError>
      if (typeof parsed.kind === 'string' && typeof parsed.message === 'string') {
        return {
          kind: parsed.kind,
          message: parsed.message,
          detail: parsed.detail,
          retryable: parsed.retryable ?? false,
        }
      }
    } catch {
      // fall through
    }
    return { kind: 'backend', message: reason, retryable: false }
  }
  return { kind: 'unknown', message: String(reason), retryable: false }
}

/**
 * Invoke a Tauri command. Rejects with a normalized AppError.
 * In plain-browser dev (no backend) it rejects with kind `no-backend`.
 */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!backendAvailable()) {
    throw {
      kind: 'no-backend',
      message: 'MirrorDeck backend is not running. Launch the desktop application.',
      retryable: false,
    } satisfies AppError
  }
  try {
    return (await window.__TAURI_INTERNALS__!.invoke(cmd, args)) as T
  } catch (reason) {
    throw normalizeError(reason)
  }
}

/** Wrap a command into the `InvokeResult` shape for callers that prefer values over throws. */
export async function tryInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: AppError }> {
  try {
    const data = await invoke<T>(cmd, args)
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: normalizeError(err) }
  }
}
