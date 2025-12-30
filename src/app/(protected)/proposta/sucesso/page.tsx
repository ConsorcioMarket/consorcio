'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function PropostaSucessoContent() {
  const searchParams = useSearchParams()
  const count = parseInt(searchParams.get('count') || '1')
  const isMultiCota = count > 1

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-hero text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {isMultiCota ? 'Propostas Enviadas!' : 'Proposta Enviada!'}
            </h1>
          </div>
        </div>
      </section>

      <section className="section-light py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-primary-darker mb-3">
                {isMultiCota
                  ? `${count} propostas enviadas com sucesso!`
                  : 'Sua proposta foi enviada com sucesso!'}
              </h2>

              <p className="text-muted-foreground mb-8">
                Nossa equipe ira analisar {isMultiCota ? 'suas propostas' : 'sua proposta'} e entrara em contato em breve.
                Voce pode acompanhar o status na pagina &quot;Minhas Propostas&quot;.
              </p>

              <div className="space-y-3">
                <Link href="/minhas-propostas">
                  <Button className="w-full">Ver Minhas Propostas</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    Voltar ao Inicio
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default function PropostaSucessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    }>
      <PropostaSucessoContent />
    </Suspense>
  )
}
