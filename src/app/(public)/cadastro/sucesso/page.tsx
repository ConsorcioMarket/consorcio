'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function Logo() {
  return (
    <div className="flex items-center justify-center mb-6">
      <Image
        src="/logo.png"
        alt="Consorcio Market"
        width={120}
        height={30}
        className="h-8 w-auto object-contain"
        priority
      />
    </div>
  )
}

export default function CadastroSucessoPage() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full mx-auto bg-white shadow-xl border-0 rounded-xl">
        <CardContent className="p-8 text-center">
          <Logo />

          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-primary-darker mb-3">
            Cadastro realizado com sucesso!
          </h2>

          <p className="text-muted-foreground mb-8">
            Sua conta foi criada. Agora voce pode fazer login para acessar a plataforma.
          </p>

          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full h-11 text-base font-medium bg-primary hover:bg-primary-darker rounded-lg">
                Fazer Login
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full h-11">
                Voltar ao Inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
