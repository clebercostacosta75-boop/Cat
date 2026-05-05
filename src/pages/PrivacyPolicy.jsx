import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
            <p className="text-sm text-gray-500">CAT Cursos e Treinamentos — Versão 1.0 — Maio/2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Introdução</h2>
            <p>A <strong>CAT Cursos e Treinamentos</strong> está comprometida com a proteção dos dados pessoais de seus colaboradores, clientes, alunos e parceiros, em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Quais Dados Coletamos</h2>
            <p>Para a operação do sistema de gestão de treinamentos, coletamos os seguintes dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dados de identificação:</strong> Nome completo, CPF, RG, data de nascimento, sexo.</li>
              <li><strong>Dados de contato:</strong> E-mail, telefone/WhatsApp, endereço completo.</li>
              <li><strong>Dados profissionais:</strong> Empresa vinculada, cargo, função.</li>
              <li><strong>Dados de acesso:</strong> E-mail de login, endereço IP, data e hora de acesso.</li>
              <li><strong>Dados de certificação:</strong> Cursos realizados, datas de treinamento, validade de certificados.</li>
              <li><strong>Dados financeiros:</strong> Informações de pagamento de cursos (sem dados de cartão de crédito).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Finalidade do Tratamento</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gestão de matrículas e certificações de treinamentos obrigatórios (NRs).</li>
              <li>Emissão e controle de certificados de capacitação profissional.</li>
              <li>Envio de notificações sobre vencimento de certificados.</li>
              <li>Controle de frequência e registro de presença em treinamentos.</li>
              <li>Cumprimento de obrigações legais e regulatórias.</li>
              <li>Comunicação institucional e operacional.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Base Legal para o Tratamento</h2>
            <p>O tratamento dos seus dados pessoais está fundamentado nas seguintes bases legais previstas na LGPD:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Consentimento (Art. 7º, I):</strong> Para envio de comunicações e notificações.</li>
              <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> Para emissão de certificados exigidos por normas regulamentadoras.</li>
              <li><strong>Execução de contrato (Art. 7º, V):</strong> Para prestação dos serviços de treinamento contratados.</li>
              <li><strong>Legítimo interesse (Art. 7º, IX):</strong> Para melhorias do sistema e segurança das informações.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Compartilhamento de Dados</h2>
            <p>Seus dados <strong>não são comercializados ou compartilhados com terceiros</strong> para fins publicitários. O compartilhamento ocorre apenas nas seguintes situações:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Com empresas contratantes dos treinamentos (apenas dados dos alunos vinculados).</li>
              <li>Com instrutores responsáveis pelos cursos (apenas dados necessários para o treinamento).</li>
              <li>Com autoridades governamentais, quando exigido por lei.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Armazenamento e Segurança</h2>
            <p>Os dados são armazenados em servidores seguros com acesso restrito, criptografia em trânsito (HTTPS) e controles de acesso baseados em perfis de usuário. Aplicamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou destruição.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Prazo de Retenção</h2>
            <p>Os dados são mantidos pelo período necessário para cumprir as finalidades descritas nesta política, ou conforme exigido por lei. Certificados e registros de treinamentos obrigatórios podem ser mantidos por até <strong>5 (cinco) anos</strong> após o vencimento, conforme exigência das Normas Regulamentadoras.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Direitos do Titular</h2>
            <p>Nos termos da LGPD, você tem os seguintes direitos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Acesso:</strong> Solicitar confirmação e acesso aos seus dados pessoais.</li>
              <li><strong>Correção:</strong> Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong>Eliminação:</strong> Solicitar a exclusão dos dados tratados com base em consentimento.</li>
              <li><strong>Portabilidade:</strong> Solicitar a portabilidade dos dados a outro fornecedor.</li>
              <li><strong>Revogação do consentimento:</strong> Retirar o consentimento a qualquer momento.</li>
              <li><strong>Informação:</strong> Ser informado sobre o compartilhamento dos dados.</li>
            </ul>
            <p className="mt-2">Para exercer seus direitos, entre em contato pelo e-mail: <strong>privacidade@catcursos.com.br</strong></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Encarregado de Dados (DPO)</h2>
            <p>O Encarregado de Proteção de Dados (DPO) da CAT Cursos pode ser contatado pelo e-mail: <strong>dpo@catcursos.com.br</strong></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Alterações nesta Política</h2>
            <p>Esta Política de Privacidade pode ser atualizada periodicamente. Quando isso ocorrer, você será notificado por e-mail e/ou pela própria plataforma, sendo solicitado a aceitar a nova versão.</p>
          </section>

          <div className="border-t border-gray-200 pt-4 mt-6">
            <p className="text-xs text-gray-400 text-center">Última atualização: Maio de 2026 — CAT Cursos e Treinamentos</p>
          </div>
        </div>

        <div className="mt-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}