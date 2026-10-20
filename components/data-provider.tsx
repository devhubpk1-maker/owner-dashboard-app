'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { SWRConfig, useSWRConfig } from 'swr'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { errorKind } from '@/lib/errors'

export type LiveStatus = 'connecting' | 'live' | 'offline'

const LiveStatusContext = createContext<LiveStatus>('connecting')

export const useLiveStatus = () => useContext(LiveStatusContext)

const TABLES = ['shops', 'products', 'customers', 'sales', 'sale_items', 'customer_payments']

function RealtimeSync({ onStatus }: { onStatus: (s: LiveStatus) => void }) {
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      onStatus('offline')
      return
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    // A single sale writes several rows; batch them into one refresh.
    const revalidateAll = () => {
      clearTimeout(timer)
      timer = setTimeout(() => mutate(() => true), 300)
    }

    const channel = supabase.channel('dashboard-sync')
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, revalidateAll)
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus('live')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('offline')
    })

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [mutate, onStatus])

  return null
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const live = status === 'live'

  return (
    <SWRConfig
      value={{
        keepPreviousData: true,
        dedupingInterval: 4000,
        focusThrottleInterval: 10_000,
        revalidateOnReconnect: true,
        // Realtime pushes changes instantly; polling is only a safety net.
        refreshInterval: live ? 5 * 60_000 : 30_000,
        errorRetryCount: 3,
        onErrorRetry: (error, _key, config, revalidate, { retryCount }) => {
          const kind = errorKind(error)
          if (kind === 'setup' || kind === 'config') return
          if (retryCount >= (config.errorRetryCount ?? 3)) return
          setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 8000))
        },
      }}
    >
      <LiveStatusContext.Provider value={status}>
        <RealtimeSync onStatus={setStatus} />
        {children}
      </LiveStatusContext.Provider>
    </SWRConfig>
  )
}
