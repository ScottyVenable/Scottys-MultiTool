const { test, expect } = require('@playwright/test')
const { launchApp } = require('./_helpers')

test('navigate to File Manager', async () => {
  const { app, win } = await launchApp()
  try {
    await win.locator('.nav-item', { hasText: 'File Manager' }).first().click()
    await expect(win.locator('.topbar-title')).toContainText('File Manager', { timeout: 5000 })
  } finally {
    await app.close()
  }
})
