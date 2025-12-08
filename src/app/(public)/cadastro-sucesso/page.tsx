import Link from 'next/link'
import { CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function CadastroSucessoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Conta criada!
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Falta apenas um passo para começar
            </p>
          </div>
        </div>
      </section>

      {/* Success Content */}
      <section className="section-light py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-lg mx-auto bg-white shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-primary-darker mb-3">
                Cadastro realizado com sucesso!
              </h2>

              <p className="text-muted-foreground mb-8 leading-relaxed">
                Enviamos um email de confirmação para o endereço informado.
                Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <div className="flex items-center justify-center gap-3 text-blue-700">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Verifique também sua pasta de spam
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/login" className="block">
                  <Button className="w-full h-12 text-base font-semibold">
                    Ir para o login
                  </Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="outline" className="w-full h-12 text-base">
                    Voltar para a página inicial
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
