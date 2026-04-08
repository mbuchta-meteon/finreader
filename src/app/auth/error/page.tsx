'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERRORS: Record<string, string> = {
  OAuthSignin:        'Could not start sign-in. Please try again.',
  OAuthCallback:      'Sign-in failed. Please try again.',
  OAuthCreateAccount: 'Could not create account. The email may already be in use.',
  EmailCreateAccount: 'Could not create account.',
  Callback:           'Sign-in callback error.',
  Default:            'An unexpected error occurred.',
}

function ErrorContent() {
  const params = useSearchParams()
  const error  = params.get('error') ?? 'Default'
  const msg    = ERRORS[error] ?? ERRORS.Default

  return (
    <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:56, marginBottom:24 }}>⚠️</div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#fff', marginBottom:12 }}>Sign-in error</h1>
        <p style={{ color:'#94a3b8' }}>{msg}</p>
        <a href="/auth/signin" style={{ display:'inline-block', marginTop:32, padding:'12px 24px', background:'#6366f1', color:'#fff', borderRadius:10, fontSize:14, textDecoration:'none' }}>
          Try again
        </a>
      </div>
    </main>
  )
}

export default function AuthErrorPage() {
  return <Suspense><ErrorContent /></Suspense>
}
