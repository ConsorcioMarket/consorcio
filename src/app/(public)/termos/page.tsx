'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header stripe */}
      <div className="bg-gradient-hero h-24" />

      <div className="container mx-auto px-4 py-8 -mt-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <Link href="/cadastro">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <h1 className="text-2xl font-bold mb-6">Termo de Consentimento de Dados Pessoais</h1>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
            <p className="text-sm text-muted-foreground">
              Última atualização: Dezembro de 2024
            </p>

            <h2 className="text-lg font-semibold mt-6">1. Introdução</h2>
            <p>
              O ConsórcioMarket (&quot;nós&quot;, &quot;nosso&quot; ou &quot;Plataforma&quot;) está comprometido com a proteção
              dos seus dados pessoais. Este Termo de Consentimento explica como coletamos, usamos,
              armazenamos e protegemos suas informações de acordo com a Lei Geral de Proteção de
              Dados (LGPD - Lei nº 13.709/2018).
            </p>

            <h2 className="text-lg font-semibold mt-6">2. Dados Coletados</h2>
            <p>Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>CPF</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone</li>
              <li>Endereço residencial (quando necessário)</li>
              <li>Dados bancários (para transações)</li>
              <li>Documentos de identificação</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">3. Finalidade do Tratamento</h2>
            <p>Seus dados são utilizados para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criar e gerenciar sua conta na plataforma</li>
              <li>Intermediar transações de compra e venda de cotas de consórcio</li>
              <li>Verificar sua identidade e prevenir fraudes</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Enviar comunicações relevantes sobre suas transações</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">4. Compartilhamento de Dados</h2>
            <p>
              Seus dados poderão ser compartilhados com:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Administradoras de consórcio (para verificação e transferência)</li>
              <li>Instituições financeiras (para processamento de pagamentos)</li>
              <li>Autoridades regulatórias (quando exigido por lei)</li>
              <li>Parceiros de custódia financeira</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">5. Segurança dos Dados</h2>
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controle de acesso restrito</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">6. Seus Direitos</h2>
            <p>De acordo com a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento de seus dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">7. Retenção de Dados</h2>
            <p>
              Seus dados serão mantidos pelo tempo necessário para cumprir as finalidades
              descritas neste termo, ou conforme exigido por lei. Após esse período, os
              dados serão anonimizados ou excluídos.
            </p>

            <h2 className="text-lg font-semibold mt-6">8. Contato</h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus
              dados, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
            </p>
            <ul className="list-none space-y-1">
              <li><strong>E-mail:</strong> privacidade@consorciomarket.com.br</li>
              <li><strong>Telefone:</strong> (13) 99105-3598</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">9. Consentimento</h2>
            <p>
              Ao marcar a caixa de consentimento durante o cadastro, você declara que leu,
              compreendeu e concorda com este Termo de Consentimento de Dados Pessoais.
            </p>

            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                ConsórcioMarket Intermediação Digital LTDA<br />
                CNPJ: 60.432.071/0001-95
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
