import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ConfirmationProvider } from './components/ui/ConfirmationProvider'
import { installFrenchFormValidation } from './utils/formValidation'
import './index.css'

installFrenchFormValidation()

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error)
      }
    }
  },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

import { Toaster } from 'sonner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfirmationProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </ConfirmationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
