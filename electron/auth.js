// ─── Local Auth Module ────────────────────────────────────────────────────────
// Pure-local, zero-network authentication backed by scrypt. All data is
// persisted in the app's JSON store. This is NOT network security — it protects
// the local installation only.

const crypto = require('crypto')

// Per-user private store keys. When the active user changes, the UI reads from
// `store.userData[activeUserId][key]` for these, not the top-level store.
const PRIVATE_KEYS = ['journal', 'reminders', 'chores', 'choreProfile', 'bookmarks', 'notes', 'mediaLibrary']

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 }
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days when rememberMe
const LOGIN_LOCKOUT_MS = 30_000
const LOGIN_MAX_ATTEMPTS = 5

// In-memory attempt counters (deliberately not persisted).
const attemptMap = new Map() // username -> { fails, firstFailAt }

function normaliseUsername(u) {
  return String(u || '').trim().toLowerCase()
}

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16)
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS)
  return { salt: salt.toString('hex'), hash: derived.toString('hex') }
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.salt) return false
  try {
    const { hash } = hashPassword(password, user.salt)
    const a = Buffer.from(hash, 'hex')
    const b = Buffer.from(user.passwordHash, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch { return false }
}

function generateId() {
  return 'u-' + crypto.randomBytes(6).toString('hex')
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

function generateRecoveryCode() {
  // xxxx-xxxx-xxxx-xxxx format, uppercase
  const raw = crypto.randomBytes(8).toString('hex').toUpperCase()
  return raw.replace(/(.{4})(?=.)/g, '$1-')
}

function ensureShape(store) {
  if (!Array.isArray(store.accounts)) store.accounts = []
  if (!store.session) store.session = { activeUserId: null, rememberMe: false, expiresAt: 0, sessionToken: null }
  if (!store.userData) store.userData = {}
}

// One-time migration: if the existing store has data but no accounts, create a
// default user and move private slices into store.userData[defaultUserId].
function migrateIfNeeded(store, saveStore) {
  ensureShape(store)
  if (store.accounts.length > 0) return false

  const hasLegacyData = PRIVATE_KEYS.some(k => {
    const v = store[k]
    // Only consider populated arrays as legacy data — the default empty objects
    // (like `choreProfile: { xp:0, level:0, achievements:[], history:[] }`) should
    // not trigger migration.
    return Array.isArray(v) && v.length > 0
  })
  if (!hasLegacyData) return false

  const id = generateId()
  const bucket = {}
  for (const k of PRIVATE_KEYS) {
    if (store[k] !== undefined) {
      bucket[k] = store[k]
      delete store[k]
    }
  }
  store.userData[id] = bucket
  store.accounts.push({
    id,
    username: 'default',
    displayName: 'Default User',
    avatarDataUrl: '',
    email: '',
    bio: '',
    bannerColor: '#6366f1',
    passwordHash: null, // migrated user: no password until set via changePassword
    salt: null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    migrated: true,
    preferences: {},
  })
  saveStore(store)
  return true
}

function redactUser(u) {
  if (!u) return null
  const { passwordHash, salt, recoveryCodeHash, recoveryCodeSalt, ...safe } = u
  return safe
}

function isSessionValid(store) {
  ensureShape(store)
  const s = store.session
  if (!s.activeUserId || !s.sessionToken) return false
  if (s.expiresAt && s.expiresAt < Date.now()) return false
  if (!store.accounts.find(u => u.id === s.activeUserId)) return false
  return true
}

function recordFailure(username) {
  const key = normaliseUsername(username)
  const rec = attemptMap.get(key) || { fails: 0, firstFailAt: Date.now() }
  // Reset if lockout window elapsed
  if (Date.now() - rec.firstFailAt > LOGIN_LOCKOUT_MS) { rec.fails = 0; rec.firstFailAt = Date.now() }
  rec.fails += 1
  attemptMap.set(key, rec)
  return rec
}

function isLockedOut(username) {
  const rec = attemptMap.get(normaliseUsername(username))
  if (!rec) return { locked: false }
  if (rec.fails >= LOGIN_MAX_ATTEMPTS && Date.now() - rec.firstFailAt < LOGIN_LOCKOUT_MS) {
    return { locked: true, retryMs: LOGIN_LOCKOUT_MS - (Date.now() - rec.firstFailAt) }
  }
  return { locked: false }
}

function clearFailures(username) {
  attemptMap.delete(normaliseUsername(username))
}

function validateUsername(u) {
  if (!u || typeof u !== 'string') return 'Username is required'
  const t = u.trim()
  if (t.length < 2) return 'Username must be at least 2 characters'
  if (t.length > 32) return 'Username must be 32 characters or fewer'
  if (!/^[a-zA-Z0-9_.\-]+$/.test(t)) return 'Only letters, digits, _ . - allowed'
  return null
}

function validatePassword(p) {
  if (!p || typeof p !== 'string') return 'Password is required'
  if (p.length < 6) return 'Password must be at least 6 characters'
  if (p.length > 256) return 'Password is too long'
  return null
}

module.exports = {
  PRIVATE_KEYS,
  normaliseUsername,
  hashPassword,
  verifyPassword,
  generateId,
  generateSessionToken,
  generateRecoveryCode,
  ensureShape,
  migrateIfNeeded,
  redactUser,
  isSessionValid,
  recordFailure,
  isLockedOut,
  clearFailures,
  validateUsername,
  validatePassword,
  SESSION_TTL_MS,
}
