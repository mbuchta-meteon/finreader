import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Resend from 'next-auth/providers/resend'
import { getDb, ensureSchema } from '@/lib/db'

// ── Async SQLite adapter for NextAuth v5 using libSQL ─────────────────────────
function SqliteAdapter() {
  const db = () => getDb()

  return {
    async createUser(user: any) {
      await ensureSchema()
      const id = crypto.randomUUID()
      await db().execute({
        sql: 'INSERT INTO users (id, name, email, emailVerified, image) VALUES (?, ?, ?, ?, ?)',
        args: [id, user.name ?? null, user.email ?? null, user.emailVerified ? 1 : null, user.image ?? null],
      })
      return { ...user, id }
    },
    async getUser(id: string) {
      await ensureSchema()
      const r = await db().execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] })
      return r.rows[0] ?? null
    },
    async getUserByEmail(email: string) {
      await ensureSchema()
      const r = await db().execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] })
      return r.rows[0] ?? null
    },
    async getUserByAccount({ provider, providerAccountId }: any) {
      await ensureSchema()
      const acc = await db().execute({
        sql: 'SELECT userId FROM accounts WHERE provider = ? AND providerAccountId = ?',
        args: [provider, providerAccountId],
      })
      if (!acc.rows[0]) return null
      const userId = (acc.rows[0] as any).userId
      const user = await db().execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] })
      return user.rows[0] ?? null
    },
    async updateUser(user: any) {
      await db().execute({
        sql: 'UPDATE users SET name = ?, email = ?, emailVerified = ?, image = ? WHERE id = ?',
        args: [user.name ?? null, user.email ?? null, user.emailVerified ? 1 : null, user.image ?? null, user.id],
      })
      return user
    },
    async linkAccount(account: any) {
      const id = crypto.randomUUID()
      await db().execute({
        sql: `INSERT OR REPLACE INTO accounts
              (id, userId, type, provider, providerAccountId, refresh_token, access_token,
               expires_at, token_type, scope, id_token, session_state)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, account.userId, account.type, account.provider, account.providerAccountId,
          account.refresh_token ?? null, account.access_token ?? null, account.expires_at ?? null,
          account.token_type ?? null, account.scope ?? null, account.id_token ?? null, account.session_state ?? null,
        ],
      })
    },
    async createSession(session: any) {
      const id = crypto.randomUUID()
      await db().execute({
        sql: 'INSERT INTO sessions (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)',
        args: [id, session.sessionToken, session.userId, new Date(session.expires).getTime() / 1000],
      })
      return session
    },
    async getSessionAndUser(sessionToken: string) {
      const s = await db().execute({ sql: 'SELECT * FROM sessions WHERE sessionToken = ?', args: [sessionToken] })
      if (!s.rows[0]) return null
      const session = s.rows[0] as any
      const u = await db().execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [session.userId] })
      if (!u.rows[0]) return null
      return {
        session: { ...session, expires: new Date(session.expires * 1000) },
        user: u.rows[0],
      }
    },
    async updateSession(session: any) {
      await db().execute({
        sql: 'UPDATE sessions SET expires = ? WHERE sessionToken = ?',
        args: [new Date(session.expires).getTime() / 1000, session.sessionToken],
      })
      return session
    },
    async deleteSession(sessionToken: string) {
      await db().execute({ sql: 'DELETE FROM sessions WHERE sessionToken = ?', args: [sessionToken] })
    },
    async createVerificationToken(token: any) {
      await db().execute({
        sql: 'INSERT OR REPLACE INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)',
        args: [token.identifier, token.token, new Date(token.expires).getTime() / 1000],
      })
      return token
    },
    async useVerificationToken({ identifier, token }: any) {
      const r = await db().execute({
        sql: 'SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?',
        args: [identifier, token],
      })
      if (!r.rows[0]) return null
      await db().execute({
        sql: 'DELETE FROM verification_tokens WHERE identifier = ? AND token = ?',
        args: [identifier, token],
      })
      const row = r.rows[0] as any
      return { ...row, expires: new Date(row.expires * 1000) }
    },
  }
}

const providers = [
  Google({
    clientId:     process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [
    GitHub({
      clientId:     process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ] : []),
  ...(process.env.RESEND_API_KEY ? [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from:   process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
    }),
  ] : []),
]

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SqliteAdapter() as any,
  providers,
  pages: {
    signIn:  '/auth/signin',
    signOut: '/auth/signout',
    error:   '/auth/error',
    verifyRequest: '/auth/verify',
  },
  callbacks: {
    async session({ session, user }: any) {
      if (session.user && user) {
        session.user.id           = user.id
        session.user.role         = user.role ?? 'free'
        session.user.storageOptIn = !!user.storageOptIn
      }
      return session
    },
  },
})
