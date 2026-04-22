// Tests the local auth flow: register -> logout -> login
const { test, expect } = require('@playwright/test')
const { launchApp } = require('./_helpers')

test('auth: register, logout, and login round-trip', async () => {
  const { app, win } = await launchApp({ skipAuth: true })

  // Wait for auth surface
  await win.waitForFunction(() => !!(window.api && window.api.auth), null, { timeout: 15_000 })

  // First launch: no users → register screen should render
  await expect(win.locator('text=Create your local profile')).toBeVisible({ timeout: 10_000 })

  // Register via IPC (deterministic across UI markup changes)
  const r = await win.evaluate(async () => {
    return window.api.auth.register({ username: 'alice', password: 'alicepass1', displayName: 'Alice' })
  })
  expect(r.success).toBe(true)

  // Log in
  const l1 = await win.evaluate(() => window.api.auth.login({ username: 'alice', password: 'alicepass1', rememberMe: false }))
  expect(l1.success).toBe(true)

  // listUsers should return the one user
  const users = await win.evaluate(() => window.api.auth.listUsers())
  expect(users).toHaveLength(1)
  expect(users[0].username).toBe('alice')

  // Wrong password should fail
  await win.evaluate(() => window.api.auth.logout())
  const lBad = await win.evaluate(() => window.api.auth.login({ username: 'alice', password: 'wrongpass' }))
  expect(lBad.success).toBe(false)
  expect(String(lBad.error || '')).toMatch(/[Ii]nvalid/)

  // Right password still works
  const lGood = await win.evaluate(() => window.api.auth.login({ username: 'alice', password: 'alicepass1' }))
  expect(lGood.success).toBe(true)

  await app.close()
})
