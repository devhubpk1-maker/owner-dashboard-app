'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'
import { APP_PASSWORD, isSessionValid, startSession } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  useEffect(() => {
    if (isSessionValid()) router.replace('/dashboard')
  }, [router])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (APP_PASSWORD && password === APP_PASSWORD) {
      startSession()
      router.replace('/dashboard')
      return
    }
    setError(true)
    setShakeKey((k) => k + 1)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-brand">
            <Store className="size-8 text-bg" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Deal Heaven POS</h1>
            <p className="mt-1 text-sm text-muted">Owner dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3" noValidate>
          <div key={shakeKey} className={cn(error && 'animate-shake')}>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              placeholder="Enter password"
              aria-invalid={error}
              aria-describedby={error ? 'password-error' : undefined}
              className={cn(
                'h-12 w-full rounded-xl border bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2',
                error ? 'border-danger focus:ring-danger/40' : 'border-line focus:border-brand focus:ring-brand/40',
              )}
            />
          </div>

          {error && (
            <p id="password-error" role="alert" className="text-sm text-danger">
              {APP_PASSWORD ? 'Wrong password. Try again.' : 'App password is not configured (NEXT_PUBLIC_APP_PASSWORD).'}
            </p>
          )}

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-brand text-base font-semibold text-white active:opacity-80"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  )
}
