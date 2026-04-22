// Simple renderer-side error logger. Persists to localStorage, surfaces via Toast.
const KEY = 'macrobot:errors'
const MAX = 50

export function logError(where, error, toast) {
  const msg = String(error?.message || error || 'Unknown error')
  try {
    const log = JSON.parse(localStorage.getItem(KEY) || '[]')
    log.push({ when: new Date().toISOString(), where, msg, stack: String(error?.stack || '').slice(0, 500) })
    localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX)))
  } catch {}
  if (toast?.show) toast.show({ type: 'error', title: where || 'Error', message: msg })
  else console.error('[' + (where || 'error') + ']', error)
}

export function getErrorLog() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function clearErrorLog() {
  try { localStorage.removeItem(KEY) } catch {}
}

/**
 * Wrap a promise-returning function so errors become toasts automatically.
 *   const safeList = safeCall(() => window.api.media.list(), { where: 'media.list', toast })
 */
export async function safeCall(fn, { where, toast, fallback } = {}) {
  try { return await fn() } catch (e) { logError(where || 'api', e, toast); return fallback }
}
