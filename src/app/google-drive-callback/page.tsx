'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    console.log('OAuth Callback: Received params', { code: !!code, error, state })

    if (error) {
      console.error('OAuth Callback: Error received', error)
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error
        }, window.location.origin)
      }
      window.close()
      return
    }

    if (code) {
      console.log('OAuth Callback: Success, sending code to parent')
      // Send success with code to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          code: code,
          state: state
        }, window.location.origin)
      }
      window.close()
      return
    }

    // If no code or error, something went wrong
    console.error('OAuth Callback: No code or error received')
    if (window.opener) {
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'No authorization code received'
      }, window.location.origin)
    }
    window.close()
  }, [searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Completing Google Drive Authorization...</h1>
        <p className="text-muted-foreground">This window will close automatically.</p>
      </div>
    </div>
  )
}

export default function GoogleDriveOAuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
