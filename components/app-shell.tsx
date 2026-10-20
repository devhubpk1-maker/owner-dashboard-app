'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isSessionValid, endSession } from '@/lib/auth'
import { BottomNav } from './bottom-nav'
import { DataProvider } from './data-provider'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (isSessionValid()) {
      setAuthorized(true)
    } else {
      endSession()
      router.replace('/login')
    }
  }, [pathname, router])

  if (!authorized) {
    return <div className="min-h-dvh bg-bg" aria-hidden="true" />
  }

  return (
    <DataProvider>
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-line bg-bg pb-20">
        <div key={pathname} className="animate-page-in">
          {children}
        </div>
        <BottomNav />
      </div>
    </DataProvider>
  )
}
