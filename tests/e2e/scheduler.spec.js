const { test, expect } = require('@playwright/test')
const { launchApp } = require('./_helpers')

test('navigate to Scheduler', async () => {
  const { app, win } = await launchApp()
  try {
    await win.locator('.nav-item', { hasText: 'Scheduler' }).first().click()
    await expect(win.locator('.topbar-title')).toContainText('Scheduler', { timeout: 5000 })
  } finally {
    await app.close()
  }
})
