'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Wallet, Eye, ChevronDown, ChevronUp, Phone, Mail, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

// Feature cards data
const features = [
  {
    icon: Shield,
    title: 'Segurança',
    description: 'Pagamento em custódia até a confirmação oficial da transferência.',
  },
  {
    icon: Wallet,
    title: 'Economia',
    description: 'Sem intermediários, comissões ou taxas ocultas. Clareza e custos finais mais baixos.',
  },
  {
    icon: Eye,
    title: 'Transparência',
    description: 'Extratos conferidos, dados atualizados e cartas padronizadas para comparação justa.',
  },
]

// Step by step accordion data
const steps = [
  {
    number: 1,
    title: 'Compare e escolha suas cotas',
    content: 'Encontre as melhores oportunidades e componha o crédito que você precisa. Se quiser ajuda, nosso time te atende pelo WhatsApp.',
  },
  {
    number: 2,
    title: 'Envie seus documentos',
    content: 'Faça o upload dos documentos necessários para análise. O processo é simples e seguro.',
  },
  {
    number: 3,
    title: 'Auditamos a cota do vendedor',
    content: 'Nossa equipe verifica todos os dados da cota junto à administradora para garantir a veracidade das informações.',
  },
  {
    number: 4,
    title: 'Pague via custódia',
    content: 'Seu pagamento fica protegido em conta custodiada até a confirmação da transferência pela administradora.',
  },
  {
    number: 5,
    title: 'Carta liberada para uso',
    content: 'Após a confirmação da transferência, sua carta de crédito está liberada para usar como quiser.',
  },
]

// Fraud protection steps
const protectionSteps = [
  'O comprador deposita o valor na conta de custódia.',
  'O dinheiro fica retido e protegido por contrato.',
  'A administradora confirma a transferência da carta.',
  'Somente então o valor é liberado ao vendedor.',
]

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [openStep, setOpenStep] = useState<number | null>(0)

  const toggleStep = (index: number) => {
    setOpenStep(openStep === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight italic">
              O jeito mais seguro e barato de comprar e vender cotas contempladas
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto">
              O primeiro marketplace de consórcio contemplado com <strong>negociação direta entre comprador e vendedor</strong>.
              Cartas auditadas e <strong>pagamento protegido</strong> contra golpes. Crédito barato pronto para usar.{' '}
              <strong>Sem sorteio, sem intermediários e sem surpresas</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="text-base bg-primary text-white hover:bg-primary-darker rounded-full px-8"
                onClick={() => router.push('/cotas')}
              >
                Explorar cartas disponíveis
              </Button>
              <Button
                size="lg"
                className="text-base bg-secondary text-white hover:bg-secondary-darker rounded-full px-8"
                onClick={() => router.push(user ? '/publicar-cota' : '/cadastro')}
              >
                Quero vender minha cota
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - "O que oferecemos" */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            O que oferecemos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Step by Step Section - "Passo a Passo da compra" */}
      <section className="bg-gradient-hero text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Passo a Passo da compra
          </h2>
          <div className="max-w-3xl mx-auto space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center text-sm font-medium">
                      {step.number}
                    </span>
                    <span className="font-medium">{step.title}</span>
                  </div>
                  {openStep === index ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {openStep === index && (
                  <div className="px-4 pb-4 pl-16">
                    <p className="text-white/80 text-sm">{step.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-white/80">
            Leia nosso{' '}
            <Link href="/guia" className="underline hover:text-white">
              Guia do Consórcio Contemplado
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Comparison Section - "Muito mais barato que financiamento" */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold italic mb-2">
              Muito mais barato que financiamento
            </h2>
            <p className="text-muted-foreground">
              Economia real: veja a diferença entre financiar um imóvel e usar uma cota contemplada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Financing Card */}
            <Card className="p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Financiamento bancário</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imóvel</span>
                  <span className="font-medium">R$ 1.000.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-medium">R$ 200.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo</span>
                  <span className="font-medium">35 anos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcela aprox.</span>
                  <span className="font-medium">R$ 8.300</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="font-bold">~R$ 3,7 milhões</span>
                </div>
              </div>
            </Card>

            {/* Consortium Card */}
            <Card className="p-6 border-2 border-primary">
              <h3 className="text-lg font-semibold mb-4">Consórcio contemplado</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imóvel</span>
                  <span className="font-medium">R$ 1.000.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-medium">R$ 400.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo</span>
                  <span className="font-medium">15 anos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcela aprox.</span>
                  <span className="font-medium">R$ 5.300</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">Custo total</span>
                  <span className="font-bold text-primary">~R$ 1,4 milhão</span>
                </div>
              </div>
            </Card>
          </div>

          <p className="text-center mt-8 text-lg font-semibold text-primary">
            Mais de R$ 2 milhões de economia: praticamente um segundo imóvel.
          </p>
          <p className="text-center mt-2 text-xs text-muted-foreground max-w-2xl mx-auto">
            Nota: Os valores acima são exemplos com base em juros bancários médios de 13% a.a. e preços praticados no mercado de cotas contempladas.
          </p>
        </div>
      </section>

      {/* Fraud Protection Section */}
      <section className="bg-navy text-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Proteção contra golpes
            </h2>
            <p className="text-white/80 mb-8">
              Pagamento seguro feito em conta de custódia financeira regulada pelo Banco Central (BACEN).
            </p>
            <ul className="space-y-4">
              {protectionSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full border border-white/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-white/50"></span>
                  </span>
                  <span className="text-white/90">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section - "Pronto para começar?" */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Pronto para começar?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base bg-primary text-white hover:bg-primary-darker rounded-full px-8"
              onClick={() => router.push('/cotas')}
            >
              Comprar cotas
            </Button>
            <Button
              size="lg"
              className="text-base bg-secondary text-white hover:bg-secondary/90 rounded-full px-8"
              onClick={() => router.push(user ? '/publicar-cota' : '/cadastro')}
            >
              Vender minha cota
            </Button>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-navy text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="font-bold mb-4">ConsorcioMarket</h3>
              <p className="text-gray-400 text-sm">CNPJ: 60.432.071/0001-95</p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold mb-4">Contatos</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  (13) 99105-3598
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  admin@consorciomarket.com.br
                </p>
                <p className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  @consorciomarket
                </p>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/termos" className="hover:text-white transition-colors">
                    Termo de Uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacidade" className="hover:text-white transition-colors">
                    Política de Privacidade (LGPD)
                  </Link>
                </li>
                <li>
                  <Link href="/guia" className="hover:text-white transition-colors">
                    Guia Completo
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8">
            <p className="text-center text-xs text-gray-500">
              O ConsorcioMarket é uma plataforma de intermediação digital de cotas de consórcio contempladas. Não somos administradora de consórcios.
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              © {new Date().getFullYear()} ConsórcioMarket. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
