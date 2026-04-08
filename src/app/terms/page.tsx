import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — Finance Analyzer' }

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', color: '#e2e8f0' }}>
      <a href="/" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none' }}>← Back to home</a>

      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginTop: 32, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 40 }}>Last updated: April 2026</p>

      <Section title="1. Acceptance">
        By using Finance Analyzer, you agree to these Terms. If you do not agree, do not use the service.
      </Section>

      <Section title="2. The service">
        Finance Analyzer is an AI-powered tool that analyzes bank statements you upload and provides spending insights, subscription detection, and financial summaries. It is provided for informational purposes only and does not constitute financial advice.
      </Section>

      <Section title="3. Free tier">
        <ul style={ul}>
          <li>One free analysis per person</li>
          <li>Limited to a single file (max 2MB)</li>
          <li>Powered by Standard AI model</li>
          <li>Abuse of the free tier (e.g. using multiple accounts, VPNs to bypass limits) is prohibited</li>
        </ul>
      </Section>

      <Section title="4. Pro subscription">
        <ul style={ul}>
          <li>€5.00 per month, billed monthly</li>
          <li>Unlimited analyses, multi-file upload, access to Better AI model</li>
          <li>Cancel any time — access continues until end of billing period</li>
          <li>No refunds for partial months</li>
          <li>We reserve the right to change pricing with 30 days notice</li>
        </ul>
      </Section>

      <Section title="5. Your data">
        <ul style={ul}>
          <li>You retain ownership of all data you upload</li>
          <li>We process your bank statements only to provide the analysis service</li>
          <li>We do not sell, share, or use your financial data for any other purpose</li>
          <li>By uploading a bank statement, you confirm you have the right to do so</li>
        </ul>
      </Section>

      <Section title="6. Acceptable use">
        You agree not to:
        <ul style={ul}>
          <li>Upload documents you do not have permission to share</li>
          <li>Attempt to bypass security measures or free tier limits</li>
          <li>Use the service for illegal purposes</li>
          <li>Reverse engineer or scrape the service</li>
          <li>Upload malicious files</li>
        </ul>
      </Section>

      <Section title="7. Disclaimer">
        Finance Analyzer provides informational analysis only. It is not a licensed financial advisor. Results may contain errors. Do not make important financial decisions based solely on our analysis. We are not liable for financial losses arising from use of the service.
      </Section>

      <Section title="8. Limitation of liability">
        To the maximum extent permitted by law, Finance Analyzer shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the last 12 months.
      </Section>

      <Section title="9. Termination">
        We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from account settings.
      </Section>

      <Section title="10. Governing law">
        These terms are governed by the laws of the Czech Republic. Any disputes shall be resolved in the courts of the Czech Republic.
      </Section>

      <Section title="11. Contact">
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
