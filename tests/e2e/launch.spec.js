const { test, expect } = require('@playwright/test')
const { launchApp } = require('./_helpers')

test('app launches and sidebar renders', async () => {
  const { app, win } = await launchApp()
  try {
    await expect(win.locator('.sidebar-logo-text')).toHaveText('Multitool', { timeout: 15_000 })
    const navCount = await win.locator('.nav-item').count()
    expect(navCount).toBeGreaterThan(10)
    await expect(win.locator('.topbar-title')).toContainText(/dashboard/i)
  } finally {
    await app.close()
  }
})
