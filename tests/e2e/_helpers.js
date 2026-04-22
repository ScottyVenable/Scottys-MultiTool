// Shared helpers for Electron E2E
const { _electron: electron } = require('@playwright/test')
const path = require('path')

/**
 * Launch the Scotty MacroBot Electron app in test mode.
 * Uses a throwaway userData directory per run to keep state isolated.
 * Automatically provisions a local test user + signs them in so the AuthGate
 * doesn't block subsequent test steps.
 */
async function launchApp(opts = {}) {
  const userData = path.join(__dirname, '..', '..', '.playwright-userdata-' + Date.now())
  const app = await electron.launch({
    args: [path.join(__dirname, '..', '..'), `--user-data-dir=${userData}`],
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, MACROBOT_TEST: '1' },
    timeout: 30_000,
  })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  if (opts.skipAuth !== true) {
    // Auto-register + login a test user so the auth gate steps aside.
    await win.waitForFunction(() => !!(window.api && window.api.auth), null, { timeout: 15_000 })
    const res = await win.evaluate(async () => {
      try {
        const users = await window.api.auth.listUsers()
        if (!users || users.length === 0) {
          const r = await window.api.auth.register({ username: 'tester', password: 'testtest', displayName: 'Tester' })
          if (!r?.success) return { ok: false, error: 'register: ' + r?.error }
        }
        const l = await window.api.auth.login({ username: 'tester', password: 'testtest', rememberMe: true })
        return { ok: !!l?.success, error: l?.error }
      } catch (e) { return { ok: false, error: String(e && e.message || e) } }
    })
    if (!res?.ok) throw new Error('auth bootstrap failed: ' + (res?.error || 'unknown'))
  }
  return { app, win, userData }
}

async function gotoPage(win, navId) {
  await win.locator(`.nav-item >> text=/${navId}/i`).first().click({ timeout: 5000 }).catch(() => {})
}

module.exports = { launchApp, gotoPage }
