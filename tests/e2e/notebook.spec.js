const { test, expect } = require('@playwright/test')
const { launchApp } = require('./_helpers')

test('navigate to Notebook', async () => {
  const { app, win } = await launchApp()
  try {
    await win.locator('.nav-item', { hasText: 'Notebook' }).first().click()
    await expect(win.locator('.topbar-title')).toContainText('Notebook', { timeout: 5000 })
  } finally {
    await app.close()
  }
})
