'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header stripe */}
      <div className="bg-gradient-hero h-24" />

      <div className="container mx-auto px-4 py-8 -mt-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>

          <h1 className="text-2xl font-bold mb-6">Política de Privacidade (LGPD)</h1>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
            <p className="text-sm text-muted-foreground">
              Última atualização: Dezembro de 2024
            </p>

            <h2 className="text-lg font-semibold mt-6">1. Sobre Esta Política</h2>
            <p>
              Esta Política de Privacidade descreve como o ConsórcioMarket coleta, usa, armazena
              e protege seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados
              (LGPD - Lei nº 13.709/2018).
            </p>

            <h2 className="text-lg font-semibold mt-6">2. Controlador dos Dados</h2>
            <p>
              O controlador dos dados pessoais é:<br />
              <strong>ConsórcioMarket Intermediação Digital LTDA</strong><br />
              CNPJ: 60.432.071/0001-95<br />
              E-mail: privacidade@consorciomarket.com.br
            </p>

            <h2 className="text-lg font-semibold mt-6">3. Dados Pessoais Coletados</h2>
            <p>Coletamos as seguintes categorias de dados:</p>

            <h3 className="text-base font-medium mt-4">3.1 Dados de Identificação</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>CPF/CNPJ</li>
              <li>RG</li>
              <li>Data de nascimento</li>
            </ul>

            <h3 className="text-base font-medium mt-4">3.2 Dados de Contato</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço de e-mail</li>
              <li>Número de telefone</li>
              <li>Endereço residencial/comercial</li>
            </ul>

            <h3 className="text-base font-medium mt-4">3.3 Dados Financeiros</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Informações bancárias para pagamento</li>
              <li>Histórico de transações na plataforma</li>
            </ul>

            <h3 className="text-base font-medium mt-4">3.4 Dados de Navegação</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço IP</li>
              <li>Cookies e tecnologias similares</li>
              <li>Dados de uso da plataforma</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">4. Base Legal para Tratamento</h2>
            <p>O tratamento dos seus dados é realizado com base em:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Consentimento:</strong> Para finalidades específicas autorizadas por você</li>
              <li><strong>Execução de contrato:</strong> Para prestação dos nossos serviços</li>
              <li><strong>Obrigação legal:</strong> Para cumprimento de exigências legais</li>
              <li><strong>Interesse legítimo:</strong> Para melhoria dos serviços e prevenção de fraudes</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">5. Cookies</h2>
            <p>
              Utilizamos cookies para melhorar sua experiência. Você pode gerenciar suas
              preferências de cookies através das configurações do seu navegador.
            </p>

            <h2 className="text-lg font-semibold mt-6">6. Compartilhamento de Dados</h2>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Administradoras de consórcio parceiras</li>
              <li>Instituições financeiras e de pagamento</li>
              <li>Prestadores de serviços (hospedagem, análise, suporte)</li>
              <li>Autoridades governamentais quando exigido por lei</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">7. Transferência Internacional</h2>
            <p>
              Alguns de nossos prestadores de serviços podem estar localizados fora do Brasil.
              Nesses casos, garantimos que a transferência ocorra em conformidade com a LGPD.
            </p>

            <h2 className="text-lg font-semibold mt-6">8. Seus Direitos</h2>
            <p>Você tem os seguintes direitos garantidos pela LGPD:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmação e acesso aos dados</li>
              <li>Correção de dados incompletos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação</li>
              <li>Portabilidade dos dados</li>
              <li>Informação sobre compartilhamento</li>
              <li>Revogação do consentimento</li>
              <li>Oposição ao tratamento</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6">9. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra
              acesso não autorizado, perda ou destruição, incluindo criptografia, controle
              de acesso e monitoramento de segurança.
            </p>

            <h2 className="text-lg font-semibold mt-6">10. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para as finalidades descritas ou
              conforme exigido por lei. Dados de transações são mantidos por 5 anos após
              o encerramento da relação contratual.
            </p>

            <h2 className="text-lg font-semibold mt-6">11. Alterações</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos você sobre
              alterações significativas através do e-mail cadastrado.
            </p>

            <h2 className="text-lg font-semibold mt-6">12. Contato</h2>
            <p>
              Para dúvidas, solicitações ou exercício de direitos:
            </p>
            <ul className="list-none space-y-1">
              <li><strong>E-mail:</strong> privacidade@consorciomarket.com.br</li>
              <li><strong>Telefone:</strong> (13) 99105-3598</li>
            </ul>

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
