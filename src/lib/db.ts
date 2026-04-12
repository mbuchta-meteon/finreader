/**
 * Database layer — Turso (libSQL) for production, local SQLite file for dev.
 *
 * Turso is SQLite-compatible so all SQL is identical.
 * In dev: set TURSO_DATABASE_URL=file:data/finance.db (local file, no token needed)
 * In prod: set TURSO_DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN=...
 */
import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

export function getDb(): Client {
  if (_client) return _client

  const url = process.env.TURSO_DATABASE_URL ?? 'file:data/finance.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  _client = createClient({ url, authToken })
  return _client
}

// ── Schema initialisation ──────────────────────────────────────────────────────
// Call once on startup (or let each function call it lazily via ensureSchema)
let _schemaReady = false

export async function ensureSchema() {
  if (_schemaReady) return
  const db = getDb()

  const statements = [
    // Users
    `CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      name             TEXT,
      email            TEXT UNIQUE,
      emailVerified    INTEGER,
      image            TEXT,
      role             TEXT NOT NULL DEFAULT 'free',
      storageOptIn     INTEGER NOT NULL DEFAULT 0,
      stripeCustomerId TEXT,
      stripeSubId      TEXT,
      subStatus        TEXT DEFAULT 'inactive',
      country          TEXT,
      createdAt        INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    // OAuth accounts
    `CREATE TABLE IF NOT EXISTS accounts (
      id                TEXT PRIMARY KEY,
      userId            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type              TEXT NOT NULL,
      provider          TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token     TEXT,
      access_token      TEXT,
      expires_at        INTEGER,
      token_type        TEXT,
      scope             TEXT,
      id_token          TEXT,
      session_state     TEXT,
      UNIQUE(provider, providerAccountId)
    )`,
    // Sessions
    `CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      sessionToken TEXT UNIQUE NOT NULL,
      userId       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires      INTEGER NOT NULL
    )`,
    // Magic link tokens
    `CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token      TEXT NOT NULL,
      expires    INTEGER NOT NULL,
      PRIMARY KEY (identifier, token)
    )`,
    // Free tier usage
    `CREATE TABLE IF NOT EXISTS free_usage (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint  TEXT NOT NULL UNIQUE,
      usedAt       INTEGER NOT NULL DEFAULT (unixepoch()),
      ip           TEXT,
      accountOwner TEXT
    )`,
    // Saved analyses (Pro + opt-in)
    `CREATE TABLE IF NOT EXISTS analyses (
      id        TEXT PRIMARY KEY,
      userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fileName  TEXT,
      result    TEXT NOT NULL,
      provider  TEXT,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    // Page views
    `CREATE TABLE IF NOT EXISTS page_views (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      path        TEXT NOT NULL,
      viewedAt    INTEGER NOT NULL DEFAULT (unixepoch()),
      date        TEXT NOT NULL
    )`,
    // AI API usage
    `CREATE TABLE IF NOT EXISTS api_usage (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      model  TEXT NOT NULL,
      tier   TEXT NOT NULL,
      usedAt INTEGER NOT NULL DEFAULT (unixepoch()),
      date   TEXT NOT NULL
    )`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_accounts_userId      ON accounts(userId)`,
    `CREATE INDEX IF NOT EXISTS idx_free_usage_fp        ON free_usage(fingerprint)`,
    `CREATE INDEX IF NOT EXISTS idx_free_usage_owner     ON free_usage(accountOwner)`,
    `CREATE INDEX IF NOT EXISTS idx_analyses_userId      ON analyses(userId)`,
    `CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_page_views_date      ON page_views(date)`,
    `CREATE INDEX IF NOT EXISTS idx_page_views_fp        ON page_views(fingerprint, date, path)`,
    `CREATE INDEX IF NOT EXISTS idx_api_usage_date       ON api_usage(date)`,
    `CREATE INDEX IF NOT EXISTS idx_api_usage_model      ON api_usage(model, date)`,
  ]

  for (const sql of statements) {
    await db.execute(sql)
  }

  // Migration: add country column to existing users tables (safe to run multiple times)
  try { await db.execute('ALTER TABLE users ADD COLUMN country TEXT') } catch {}

  _schemaReady = true
}

// ── Helper: run schema then query ─────────────────────────────────────────────
async function query(sql: string, args: (string | number | null | undefined)[] = []) {
  await ensureSchema()
  return getDb().execute({ sql, args: args as any[] })
}

// ── Free tier helpers ──────────────────────────────────────────────────────────

export async function hasUsedFreeTier(fingerprint: string): Promise<boolean> {
  const r = await query('SELECT id FROM free_usage WHERE fingerprint = ?', [fingerprint])
  return r.rows.length > 0
}

export async function hasOwnerUsedFreeTier(ownerName: string): Promise<boolean> {
  if (!ownerName || ownerName.trim().length < 3) return false
  const normalised = normaliseOwner(ownerName)
  const r = await query('SELECT id FROM free_usage WHERE accountOwner = ?', [normalised])
  return r.rows.length > 0
}

export async function recordFreeUsage(fingerprint: string, ip: string, accountOwner?: string) {
  const owner = accountOwner ? normaliseOwner(accountOwner) : null
  await query(
    'INSERT OR IGNORE INTO free_usage (fingerprint, ip, accountOwner) VALUES (?, ?, ?)',
    [fingerprint, ip, owner]
  )
  if (owner) {
    await query(
      'UPDATE free_usage SET accountOwner = ? WHERE fingerprint = ? AND accountOwner IS NULL',
      [owner, fingerprint]
    )
  }
}

function normaliseOwner(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// ── User helpers ───────────────────────────────────────────────────────────────

export async function updateUserCountry(userId: string, country: string) {
  await query('UPDATE users SET country = ? WHERE id = ? AND country IS NULL', [country, userId])
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const r = await query('SELECT * FROM users WHERE id = ?', [id])
  return (r.rows[0] as unknown as UserRow) ?? null
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const r = await query('SELECT * FROM users WHERE email = ?', [email])
  return (r.rows[0] as unknown as UserRow) ?? null
}

export async function updateStorageOptIn(userId: string, optIn: boolean) {
  await query('UPDATE users SET storageOptIn = ? WHERE id = ?', [optIn ? 1 : 0, userId])
}

export async function setUserPro(userId: string, stripeCustomerId: string, stripeSubId: string) {
  await query(
    'UPDATE users SET role = ?, stripeCustomerId = ?, stripeSubId = ?, subStatus = ? WHERE id = ?',
    ['pro', stripeCustomerId, stripeSubId, 'active', userId]
  )
}

export async function setUserFree(userId: string) {
  await query(
    'UPDATE users SET role = ?, subStatus = ? WHERE id = ?',
    ['free', 'inactive', userId]
  )
}

// ── Analysis helpers ───────────────────────────────────────────────────────────

export async function saveAnalysis(userId: string, fileName: string, result: object, provider: string): Promise<string> {
  const id = crypto.randomUUID()
  await query(
    'INSERT INTO analyses (id, userId, fileName, result, provider) VALUES (?, ?, ?, ?, ?)',
    [id, userId, fileName, JSON.stringify(result), provider]
  )
  return id
}

export async function getUserAnalyses(userId: string, limit = 20): Promise<AnalysisRow[]> {
  const r = await query(
    'SELECT id, fileName, provider, createdAt FROM analyses WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
    [userId, limit]
  )
  return r.rows as unknown as AnalysisRow[]
}

export async function getAnalysisById(id: string, userId: string): Promise<(Omit<FullAnalysisRow, 'result'> & { result: object }) | null> {
  const r = await query('SELECT * FROM analyses WHERE id = ? AND userId = ?', [id, userId])
  if (!r.rows[0]) return null
  const row = r.rows[0] as unknown as FullAnalysisRow
  return { ...row, result: JSON.parse(row.result) as object }
}

export async function deleteAnalysis(id: string, userId: string) {
  await query('DELETE FROM analyses WHERE id = ? AND userId = ?', [id, userId])
}

export async function deleteAllUserAnalyses(userId: string) {
  await query('DELETE FROM analyses WHERE userId = ?', [userId])
}

// ── Page view helpers ──────────────────────────────────────────────────────────

export async function recordPageView(fingerprint: string, path: string) {
  const date = new Date().toISOString().slice(0, 10)
  await query('INSERT INTO page_views (fingerprint, path, date) VALUES (?, ?, ?)', [fingerprint, path, date])
}

// ── API usage helpers ──────────────────────────────────────────────────────────

export async function recordApiUsage(model: string, tier: string) {
  const date = new Date().toISOString().slice(0, 10)
  await query('INSERT INTO api_usage (model, tier, date) VALUES (?, ?, ?)', [model, tier, date])
}

// ── Admin helpers ──────────────────────────────────────────────────────────────

export async function getAdminStats() {
  await ensureSchema()
  const db = getDb()

  const [
    totalUsersR, proUsersR, totalAnalysesR, freeUsedR,
    totalViewsR, uniqueVisitorsR, viewsTodayR, uniqueTodayR,
    viewsByDayR, apiByModelR, apiByModelTodayR, apiByDayR, recentUsersR,
  ] = await Promise.all([
    db.execute('SELECT COUNT(*) as n FROM users'),
    db.execute("SELECT COUNT(*) as n FROM users WHERE role = 'pro'"),
    db.execute('SELECT COUNT(*) as n FROM analyses'),
    db.execute('SELECT COUNT(*) as n FROM free_usage'),
    db.execute('SELECT COUNT(*) as n FROM page_views'),
    db.execute('SELECT COUNT(DISTINCT fingerprint) as n FROM page_views'),
    db.execute("SELECT COUNT(*) as n FROM page_views WHERE date = date('now')"),
    db.execute("SELECT COUNT(DISTINCT fingerprint) as n FROM page_views WHERE date = date('now')"),
    db.execute(`SELECT date, COUNT(*) as views, COUNT(DISTINCT fingerprint) as unique_visitors
                FROM page_views WHERE date >= date('now', '-6 days')
                GROUP BY date ORDER BY date ASC`),
    db.execute(`SELECT model, tier, COUNT(*) as calls FROM api_usage
                GROUP BY model, tier ORDER BY model, tier`),
    db.execute(`SELECT model, tier, COUNT(*) as calls FROM api_usage
                WHERE date = date('now') GROUP BY model, tier ORDER BY model, tier`),
    db.execute(`SELECT date, COUNT(*) as calls FROM api_usage
                WHERE date >= date('now', '-6 days') GROUP BY date ORDER BY date ASC`),
    db.execute('SELECT id, email, name, role, country, createdAt FROM users ORDER BY createdAt DESC LIMIT 10'),
  ])

  return {
    totalUsers:      (totalUsersR.rows[0] as any).n,
    proUsers:        (proUsersR.rows[0] as any).n,
    totalAnalyses:   (totalAnalysesR.rows[0] as any).n,
    freeUsed:        (freeUsedR.rows[0] as any).n,
    totalViews:      (totalViewsR.rows[0] as any).n,
    uniqueVisitors:  (uniqueVisitorsR.rows[0] as any).n,
    viewsToday:      (viewsTodayR.rows[0] as any).n,
    uniqueToday:     (uniqueTodayR.rows[0] as any).n,
    viewsByDay:      viewsByDayR.rows,
    apiByModel:      apiByModelR.rows,
    apiByModelToday: apiByModelTodayR.rows,
    apiByDay:        apiByDayR.rows,
    recentUsers:     recentUsersR.rows,
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string
  name: string | null
  email: string | null
  emailVerified: number | null
  image: string | null
  role: 'free' | 'pro' | 'admin'
  storageOptIn: number
  stripeCustomerId: string | null
  stripeSubId: string | null
  subStatus: string
  country: string | null
  createdAt: number
}

interface AnalysisRow {
  id: string
  fileName: string
  provider: string
  createdAt: number
}

interface FullAnalysisRow extends AnalysisRow {
  result: string
  userId: string
}
