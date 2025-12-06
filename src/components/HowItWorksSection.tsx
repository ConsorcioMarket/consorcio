'use client'

import { Search, FileCheck, Shield, CheckCircle } from 'lucide-react'

const steps = [
  {
    icon: Search,
    title: 'Encontre sua cota',
    description:
      'Navegue pelas cotas disponíveis, compare taxas e encontre a melhor opção para você.',
  },
  {
    icon: FileCheck,
    title: 'Envie sua proposta',
    description:
      'Demonstre interesse, envie seus documentos e aguarde a análise da sua proposta.',
  },
  {
    icon: Shield,
    title: 'Pagamento seguro',
    description:
      'Seu pagamento fica em custódia até a transferência ser concluída com segurança.',
  },
  {
    icon: CheckCircle,
    title: 'Cota transferida',
    description:
      'Após a aprovação, a cota é transferida e você pode usar seu crédito imediatamente.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[hsl(var(--primary-darker))] mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprar uma cota de consórcio contemplada é simples e seguro. Veja como
            funciona em 4 passos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {/* Step Number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>

              {/* Icon */}
              <div className="mt-4 mb-4 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-[hsl(var(--primary))]" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>

              {/* Connector Line (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
