'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from '@/contexts/SessionContext'
import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { setQueryClient } from '@/lib/react-query/queryClient'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
      // Register query client globally for WebSocket access
      setQueryClient(client)
      return client
    }
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </SessionProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}
