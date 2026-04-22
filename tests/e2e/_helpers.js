// Shared helpers for Electron E2E
const { _electron: electron } = require('@playwright/test')
const path = require('path')

/**
 * Launch the Scotty MacroBot Electron app in test mode.
 * Uses a throwaway userData directory per run to keep state isolated.
 */
async function launchApp() {
  const userData = path.join(__dirname, '..', '..', '.playwright-userdata-' + Date.now())
  const app = await electron.launch({
    args: [path.join(__dirname, '..', '..'), `--user-data-dir=${userData}`],
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, MACROBOT_TEST: '1' },
    timeout: 30_000,
  })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')
  return { app, win, userData }
}

async function gotoPage(win, navId) {
  await win.locator(`.nav-item >> text=/${navId}/i`).first().click({ timeout: 5000 }).catch(() => {})
}

module.exports = { launchApp, gotoPage }
