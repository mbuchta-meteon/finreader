import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — Finance Analyzer' }

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', color: '#e2e8f0' }}>
      <a href="/" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none' }}>← Back to home</a>

      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 40 }}>Last updated: April 2026</p>

      <Section title="1. Who we are">
        Finance Analyzer ("we", "our", "us") is a personal finance analysis tool. We are operated by an individual developer. Contact: buchtosik@gmail.com
      </Section>

      <Section title="2. What data we collect">
        <b style={{ color: '#fff' }}>Anonymous users (free tier):</b>
        <ul style={ul}>
          <li>IP address and browser fingerprint (hashed, not stored in raw form) — used solely to enforce the one free analysis limit</li>
          <li>Account owner name extracted from your bank statement — used solely to prevent multiple free analyses</li>
          <li>We do NOT store the contents of your bank statement or transaction data</li>
        </ul>
        <b style={{ color: '#fff' }}>Registered users:</b>
        <ul style={ul}>
          <li>Name and email address provided via Google, GitHub, or magic link sign-in</li>
          <li>Profile photo URL (from OAuth providers)</li>
          <li>Subscription status</li>
          <li>Analysis results — ONLY if you explicitly opt in to storage in your account settings. Off by default.</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul style={ul}>
          <li>To provide the analysis service</li>
          <li>To enforce free tier limits and prevent abuse</li>
          <li>To manage your account and subscription</li>
          <li>We never sell your data to third parties</li>
          <li>We never use your financial data for advertising</li>
        </ul>
      </Section>

      <Section title="4. Data storage">
        All data is stored in a secure SQLite database. Bank statement contents are processed in memory and immediately discarded — they are never written to disk unless you explicitly opt in to analysis history.
      </Section>

      <Section title="5. Third-party services">
        <ul style={ul}>
          <li><b style={{ color: '#fff' }}>Google OAuth</b> — for sign-in. Subject to Google&apos;s Privacy Policy.</li>
          <li><b style={{ color: '#fff' }}>GitHub OAuth</b> — for sign-in. Subject to GitHub&apos;s Privacy Policy.</li>
          <li><b style={{ color: '#fff' }}>Anthropic / Google Gemini</b> — AI models that process your bank statement text. Data is sent securely via API and not retained by us beyond the API call.</li>
          <li><b style={{ color: '#fff' }}>Stripe</b> — for payment processing. We never see or store your card details.</li>
          <li><b style={{ color: '#fff' }}>Cloudflare Turnstile</b> — for bot protection. Privacy-friendly, no ad tracking.</li>
        </ul>
      </Section>

      <Section title="6. Your rights (GDPR)">
        If you are in the EU or Czech Republic, you have the right to:
        <ul style={ul}>
          <li><b style={{ color: '#fff' }}>Access</b> — request a copy of your personal data</li>
          <li><b style={{ color: '#fff' }}>Deletion</b> — delete your account and all associated data at any time from account settings</li>
          <li><b style={{ color: '#fff' }}>Portability</b> — export your saved analyses as JSON</li>
          <li><b style={{ color: '#fff' }}>Withdraw consent</b> — turn off analysis storage at any time</li>
        </ul>
        To exercise these rights, contact us at buchtosik@gmail.com
      </Section>

      <Section title="7. Cookies">
        We use session cookies for authentication only. No tracking cookies, no advertising cookies.
      </Section>

      <Section title="8. Data retention">
        Free tier usage records (IP fingerprint + account owner name) are retained for 12 months. Account data is retained until you delete your account. Saved analyses are deleted when you delete them or your account.
      </Section>

      <Section title="9. Changes">
        We may update this policy. We will notify registered users by email of material changes.
      </Section>

      <Section title="10. Contact">
        Questions? Email us at buchtosik@gmail.com
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 12 }}>{title}</h2>
      <div style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: 15 }}>{children}</div>
    </section>
  )
}

const ul: React.CSSProperties = { paddingLeft: 20, marginTop: 8, marginBottom: 8 }
