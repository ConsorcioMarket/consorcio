'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Algo deu errado
        </h1>
        <p className="text-gray-600 mb-6">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">
            Código do erro: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
