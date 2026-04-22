const { test, expect } = require('@playwright/test')
const { launchApp } = require('./_helpers')

test('Ctrl+K opens the command palette and navigates', async () => {
  const { app, win } = await launchApp()
  try {
    await win.keyboard.press('Control+K')
    await expect(win.locator('.cmdp')).toBeVisible({ timeout: 5000 })
    await win.locator('.cmdp-input').fill('macros')
    await win.keyboard.press('Enter')
    await expect(win.locator('.cmdp')).toBeHidden({ timeout: 3000 })
    await expect(win.locator('.topbar-title')).toContainText('Macros', { timeout: 5000 })
  } finally {
    await app.close()
  }
})
