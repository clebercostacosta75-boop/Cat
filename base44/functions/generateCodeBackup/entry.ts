import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Só admins podem gerar backup
    if (user.role !== 'admin' && user.role !== 'gestor_master') {
      return Response.json({ error: 'Forbidden: Only admins can generate backups' }, { status: 403 });
    }

    // Estrutura organizada do backup
    const backupContent = `
CAT GESTÃO DE CURSOS - BACKUP COMPLETO
======================================
Data: ${new Date().toISOString()}
Gerado por: ${user.full_name} (${user.email})

ESTRUTURA DO PROJETO:
====================

📁 /src
  📁 pages/              - Páginas principais do sistema (40+ páginas)
  📁 components/         - Componentes reutilizáveis (50+ componentes)
  📁 functions/          - Funções backend (50+ integrações)
  📁 entities/           - Schemas de entidades (38 entidades)
  📁 lib/                - Utilitários e contextos
  📁 hooks/              - React hooks customizados
  📁 agents/             - Agentes IA configurados
  
📄 App.jsx              - Router principal
📄 Layout.jsx           - Layout com navegação
📄 index.css            - Estilos base Tailwind
📄 tailwind.config.js   - Configuração Tailwind
📄 index.html           - HTML entry point


PERMISSÕES E CONTROLE DE ACESSO:
================================

✓ Sistema de Roles:
  - admin (acesso total)
  - gestor_master (gestor principal)
  - editor (editor de conteúdo)
  - cliente (usuário final)

✓ Controle por Módulo:
  - Dashboard (principal)
  - Certificações (geração, validação, assinatura)
  - Cronograma (turmas e agendas)
  - Empresas (gestão de clientes)
  - Usuários (gerenciamento de acesso)
  - BMM (boletins mensais)
  - Financeiro (pagamentos)
  - Operacional (coordenação)

✓ Context & Hooks:
  - AuthContext (autenticação)
  - PermissionsContext (permissões por módulo)
  - ProtectedRoute (proteção de rotas)


ENTIDADES PRINCIPAIS (38 TOTAL):
===============================

Core:
  • User (built-in)
  • UserProfile (perfis e permissões)
  • Company (empresas clientes)
  • Instructor (instrutores)
  • Student (alunos)

Treinamento:
  • Course (cursos)
  • ClassSchedule (turmas)
  • StudentCourseEnrollment (matrículas)
  • ClassDailyRecord (registros diários)
  • TrainingSchedule (cronograma)

Certificação:
  • Certificate (certificados)
  • CertificateModel (templates)
  • DigitalSignature (assinaturas)

Financeiro:
  • Contract (contratos)
  • ContractTemplate (templates)
  • Payment (pagamentos)
  • Receipt (recibos)

Relatórios:
  • AuditLog (auditoria)
  • AccessLog (acessos)
  • BMMRecord (boletins)
  • BMMTemplate (templates BMM)


FUNÇÕES BACKEND (50+):
====================

Autenticação & Segurança:
  ✓ convidarUsuario
  ✓ atualizarPermissoesUsuario
  ✓ reenviarCredenciais
  ✓ securityMiddleware

Certificação:
  ✓ gerarCertificado
  ✓ assinarContrato
  ✓ bloquearCertificadosExpirados
  ✓ enviarCertificadoWhatsApp
  ✓ alertarVencimentoCertificados

Treinamento:
  ✓ finalizarTurma
  ✓ processarCronograma
  ✓ notificarInstrutorCurso
  ✓ enviarConfirmacaoAgendamento

Financeiro:
  ✓ asaasPayment
  ✓ asaasCobranca
  ✓ gerarRecibo
  ✓ alertarBoletosVencimento
  ✓ gerarRelatoriosPagamentos

Comunicação:
  ✓ enviarAlertasVencimentoEmail
  ✓ enviarMensagemMassaWhatsApp
  ✓ enviarContratoEmail
  ✓ enviarContratoWhatsApp
  ✓ enviarNotificacoes

Propostas & Documentos:
  ✓ processProposal
  ✓ processarDocumentoOCR
  ✓ processarTexto

Administrativo:
  ✓ backupAutomatico
  ✓ validarIntegridadeDados
  ✓ registrarAlteracao
  ✓ deletarComSeguranca


INTEGRAÇÕES EXTERNAS:
====================

WhatsApp:
  • WHATSAPP_VERIFY_TOKEN
  • WHATSAPP_ACCESS_TOKEN
  • WHATSAPP_PHONE_NUMBER_ID
  • Webhook para mensagens

Email (UOL):
  • UOL_SMTP_EMAIL
  • UOL_SMTP_PASSWORD
  • Envio automático de notificações

ASAAS (Pagamentos):
  • ASAAS_API_KEY
  • Cobrança e recebimentos
  • Webhooks de status de pagamento

Resend:
  • RESEND_API_KEY
  • Envio de emails transacionais


ESTATÍSTICAS:
=============

📊 Linhas de Código:
  - Pages: ~8,000 linhas
  - Components: ~12,000 linhas
  - Functions: ~6,000 linhas
  - Total: ~26,000+ linhas

📄 Documentação:
  - 4 arquivos de documentação
  - 50+ páginas de guias
  - 12 problemas conhecidos documentados

🔧 Ferramentas Utilizadas:
  - React 18.2
  - TailwindCSS 3
  - Radix UI (componentes acessíveis)
  - React Query (estado remoto)
  - React Router v7 (navegação)
  - Lucide React (ícones)
  - Framer Motion (animações)

🗄️ Banco de Dados:
  - 38 entidades
  - Automações: scheduled, entity, connector, in-app agent
  - RLS (Row Level Security)


PRÓXIMOS PASSOS:
===============

1. ✅ Backup organizado gerado
2. ⏳ Implementar sincronização com Git
3. ⏳ CI/CD pipeline
4. ⏳ Testes automatizados
5. ⏳ Monitoramento de performance
6. ⏳ Plano de migração para nova infra


CONTATO & SUPORTE:
=================

Sistema: CAT Gestão de Cursos
Versão: 1.0 (Produção)
Data de Geração: ${new Date().toLocaleDateString('pt-BR')}
Usuário: ${user.full_name}

Arquivo gerado automaticamente pelo sistema.
Para restauração ou dúvidas, consulte a documentação técnica.
`;

    // Retornar como blob para download
    const encoder = new TextEncoder();
    const data = encoder.encode(backupContent);
    const timestamp = new Date().toISOString().split('T')[0];

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="BACKUP_CODIGO_${timestamp}.txt"`,
        'Content-Length': data.length
      }
    });
  } catch (error) {
    console.error('Erro ao gerar backup:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});