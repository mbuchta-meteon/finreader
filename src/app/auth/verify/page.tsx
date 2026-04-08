export default function VerifyPage() {
  return (
    <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:56, marginBottom:24 }}>✉️</div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#fff', marginBottom:12 }}>Check your email</h1>
        <p style={{ color:'#94a3b8', lineHeight:1.6 }}>
          A sign-in link has been sent to your email address. Click it to sign in — no password needed.
        </p>
        <p style={{ color:'#64748b', fontSize:13, marginTop:16 }}>
          The link expires in 10 minutes. Check your spam folder if you don't see it.
        </p>
        <a href="/" style={{ display:'inline-block', marginTop:32, color:'#6366f1', fontSize:14 }}>
          ← Back to home
        </a>
      </div>
    </main>
  )
}
