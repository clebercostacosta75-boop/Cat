# 📋 Documentação Técnica Completa
## Sistema CAT Gestão Cursos

**Versão:** 1.0  
**Data:** 02 de junho de 2026  
**Ambiente:** Production (Base44)  
**Status:** Diagnóstico - Sem Modificações Realizadas

---

## 📑 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Módulos Existentes](#módulos-existentes)
4. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
5. [Regras de Permissão](#regras-de-permissão)
6. [Fluxos Operacionais](#fluxos-operacionais)
7. [Regras de Cálculo e Precificação](#regras-de-cálculo-e-precificação)
8. [Regras de Assinatura Digital](#regras-de-assinatura-digital)
9. [Integrações Externas](#integrações-externas)
10. [Problemas Identificados](#problemas-identificados)
11. [Riscos Técnicos](#riscos-técnicos)
12. [Recomendações para Migração](#recomendações-para-migração)

---

## 1. Visão Geral do Sistema

### 1.1 Propósito
O **CAT Gestão Cursos** é um sistema completo de gestão de treinamentos, certificações e faturamento para empresas especializadas em educação continuada. Gerencia:

- **Empresas Clientes** com múltiplas unidades
- **Cursos e Treinamentos** com configurações de preço
- **Turmas** com agendamento, instrutores e alunos
- **Matrículas e Certificados** digitais com assinatura
- **Contratos** entre alunos/responsáveis e empresa
- **Faturas Mensais (BMM)** com detalhamento de serviços
- **Propostas Comerciais** com processamento por IA
- **Usuários e Permissões** granulares por módulo

### 1.2 Público-Alvo
- **Gestores Master:** Acesso total (administração completa)
- **Editores:** Acesso a operação, financeiro e relatorios
- **Clientes:** Acesso restrito a dados de suas empresas
- **Personalizados:** Acesso granular por módulo

### 1.3 Tecnologia Stack
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Deno Deploy (serverless)
- **Database:** Base44 Entity Storage (NoSQL)
- **UI Components:** Shadcn/ui
- **State Management:** React Query (TanStack Query)
- **Auth:** Base44 Auth Provider

---

## 2. Arquitetura Técnica

### 2.1 Fluxo de Dados

```
Frontend (React)
    ↓
Base44 SDK (@/api/base44Client)
    ↓
Backend Functions (Deno)
    ↓
Entity Operations (CRUD)
    ↓
External APIs (Asaas, WhatsApp, Email, IA)
    ↓
Audit Logging (AuditLog Entity)
```

### 2.2 Componentes Críticos

| Componente | Localização | Responsabilidade |
|-----------|------------|-------------------|
| **PermissionsContext** | `lib/PermissionsContext.jsx` | Gerencia acesso por módulo e role |
| **AuthContext** | `lib/AuthContext.jsx` | Valida autenticação e redireciona |
| **ProtectedRoute** | `components/ProtectedRoute.jsx` | Protege rotas por permissão |
| **BMMGenerator** | `pages/BMMGenerator.jsx` | Calcula e gera BMM mensal |
| **ProposalEntry** | `pages/ProposalEntry.jsx` | Entrada de propostas com IA |
| **registrarAlteracao** | `functions/registrarAlteracao.js` | Auditoria automática de mudanças |

### 2.3 Padrão de Requisições

```javascript
// Frontend
const { data } = await base44.entities.Company.list();
const created = await base44.entities.Company.create(data);
const invoked = await base44.functions.invoke('functionName', payload);

// Backend (Deno)
const base44 = createClientFromRequest(req);
const user = await base44.auth.me();
await base44.asServiceRole.entities.AuditLog.create(data);
```

---

## 3. Módulos Existentes

### 3.1 Módulos Administrativos

| Módulo | Rota | Permissão | Função |
|--------|------|-----------|--------|
| **Dashboard Central** | `/` | Dashboard | Hub principal com abas por especialidade |
| **Usuários** | `/Users` | Usuários | Gestão de perfis e convites |
| **Log de Auditoria** | `/AuditLog` | Log de Auditoria | Histórico de alterações |
| **Log de Acesso** | `/AccessLog` | Log de Acesso | Histórico de logins e acessos negados |
| **Auditoria Completa** | `/AuditoriaCompleta` | Auditoria Completa | Relatório completo de integridade |
| **Alertas** | `/AlertasConfig` | Alertas de Vencimento | Configuração de notificações |

### 3.2 Módulos Operacionais

| Módulo | Rota | Permissão | Função |
|--------|------|-----------|--------|
| **Cronograma** | `/Schedule` | Cronograma | Agendamento de turmas |
| **Chamada Presencial** | `/AttendanceCall` | Chamada Presencial | Registro de presença |
| **Agenda de Treinamentos** | `/AgendaTreinamentos` | Agenda de Treinamentos | Visualização de agenda |
| **Cursos** | `/Courses` | Cursos | Catálogo e configuração de cursos |
| **Instrutores** | `/Instructors` | Instrutores | Gestão de instrutores |
| **Empresas** | `/Companies` | Empresas | Gestão de clientes |
| **Contratadas** | `/Contractors` | Contratadas | Gestão de fornecedores |

### 3.3 Módulos Financeiros

| Módulo | Rota | Permissão | Função |
|--------|------|-----------|--------|
| **Dashboard Financeiro** | `/DashboardFinanceiro` | Dashboard Financeiro | Visão financeira executiva |
| **Gestão de BMM** | `/GestaoBMM` | Gestão de BMM | Faturamento mensal |
| **Gestão de Contratos** | `/GestaoContratos` | Gestão de Contratos | Contratos com alunos |
| **Entrada de Propostas** | `/ProposalEntry` | Entrada de Propostas | Processamento de propostas |

### 3.4 Módulos de Certificação

| Módulo | Rota | Permissão | Função |
|--------|------|-----------|--------|
| **Certificações** | `/Certificacoes` | Certificações | Emissão de certificados |
| **Designer de Certificados** | `/CertDesigner` | Designer de Certificados | Customização de template |
| **Auditoria de Certificados** | `/CertificateAuditPanel` | Auditoria de Certificados | Rastreamento de certs |
| **Assinaturas Digitais** | `/DigitalSignatures` | Assinaturas Digitais | Gestão de assinaturas |

### 3.5 Módulos Comerciais

| Módulo | Rota | Permissão | Função |
|--------|------|-----------|--------|
| **Dashboard Comercial** | `/DashboardComercial` | Dashboard Comercial | Visão comercial |
| **Gestão de Leads** | `/GestaoLeads` | Dashboard Comercial | Gerenciamento de oportunidades |
| **Base de Conhecimento** | `/BaseConhecimento` | Dashboard Comercial | Wiki interno |

### 3.6 Módulos de Suporte

| Módulo | Rota | Permissão | Função |
|--------|------|-----------|--------|
| **Central de Comunicação** | `/CommunicationCenter` | Central de Comunicação | Mensagens e agentes IA |
| **Analytics/Relatórios** | `/Analytics` | Dashboard de Relatórios | Dashboards analíticos |

### 3.7 Módulos Públicos (Sem Layout)

| Módulo | Rota | Acesso | Função |
|--------|------|--------|--------|
| **Assinatura de Certificado** | `/CertificateSign` | Público | Aluno assina certificado digitalmente |
| **Validação de Certificado** | `/CertificateValidate` | Público | Empresa valida código do certificado |
| **Assinatura de Contrato** | `/ContractSign` | Público | Aluno assina contrato de matrícula |
| **Portal do Aluno** | `/StudentPortal` | Autenticado | Acesso do aluno a dados pessoais |
| **Portal da Empresa** | `/CompanyPortal` | Autenticado | Acesso da empresa a turmas e dados |
| **Auto-Cadastro de Alunos** | `/AutoCadastroAluno` | Público | Aluno se cadastra automaticamente |

---

## 4. Estrutura do Banco de Dados

### 4.1 Entidades Principais

#### 4.1.1 Company (Empresas Clientes)

```javascript
{
  razao_social: string          // Razão Social (obrigatório)
  nome_fantasia: string         // Nome Fantasia (obrigatório)
  cnpj: string                  // CNPJ (obrigatório)
  status: enum                  // "Ativo" | "Inativo" (default: "Ativo")
  logo_url: string              // URL da logo
  email_faturamento: string     // Email para envio de BMM
  
  // Configuração de Serviços Adicionais
  additional_services: {
    coffee_break_morning_enabled: boolean
    coffee_break_morning_unit_value: number
    coffee_break_afternoon_enabled: boolean
    coffee_break_afternoon_unit_value: number
    lunch_enabled: boolean
    lunch_unit_value: number
  }
  
  // Unidades/Filiais
  units: [
    {
      name: string
      address: {
        street, number, complement, neighborhood, city, state, zip_code
      }
    }
  ]
  
  // Contatos
  contacts: [
    {
      name: string
      role: string
      unit_name: string
      phone: string
      is_whatsapp: boolean
      email: string
    }
  ]
  
  // Cursos Personalizados (com preço específico)
  company_courses: [
    {
      course_id: string
      course_name: string
      billing_type: "per_student" | "per_closed_class"
      specific_price: number        // Preço por aluno
      class_fixed_value: number     // Valor turma fechada
      included_students_limit: number // Quantos alunos cabem em 1 turma fechada
      workload_hours: number
      modality: enum
    }
  ]
  
  // Contratos da Empresa
  company_contracts: [
    {
      contract_number: string
      amendment_number: string
      start_date: date
      end_date: date
      description: string
      status: "Ativo" | "Vencido" | "Cancelado"
    }
  ]
  
  // Config Exclusiva UNITAPAJÓS
  bmm_editor_config: {
    title: string
    bmm_number: string
    contract_number: string
    fiscal_name: string
    contract_manager_name: string
    sap_config: { ... }
  }
}
```

#### 4.1.2 ClassSchedule (Turmas)

```javascript
{
  training_name: string         // Nome do curso (obrigatório)
  training_id: string           // ID do curso
  company_name: string          // Nome da empresa (obrigatório)
  company_id: string            // ID da empresa
  location: string              // Local (ex: Tailândia, Belém)
  students_count: number        // Número de alunos
  status: enum                  // "Agendado" | "Em Andamento" | "Concluído" | "Cancelado" | "Pendente" | "Aguardando"
  
  realization_dates: [date]     // Datas específicas de realização (ex: [25/01/2026, 27/01/2026])
  specific_days: string         // Descrição textual dos dias
  training_schedule: string     // Horário (ex: 07:00 às 12:00)
  
  instructor_name: string       // Nome do instrutor
  instructor_id: string         // ID do instrutor
  
  payment_status: enum          // "Pendente" | "Parcialmente Pago" | "Pago"
  modality: enum                // "Formação" | "Periódico"
  category: enum                // "Presencial" | "Híbrido" | "Online"
  duration_hours: number        // Carga horária (preenchida do curso)
  month: string                 // Mês (ex: "Janeiro/2025")
  
  unit_value: number            // Valor unitário do curso
  total_value: number           // Valor total (unit_value * students_count)
  instructor_payment_value: number  // Valor a pagar ao instrutor
  
  payment_installments: [       // Até 2 parcelas
    {
      installment_number: number
      amount: number
      due_date: date
      status: "Pendente" | "Pago" | "Atrasado"
      paid_date: date
      proof_of_payment_url: string
      notes: string
    }
  ]
  
  notes: string                 // Observações gerais
}
```

#### 4.1.3 Certificate (Certificados)

```javascript
{
  certificate_code: string      // CAT-2025-XXXXXXXX (único)
  
  student_id: string
  student_name: string          // (obrigatório)
  student_cpf: string           // (obrigatório)
  student_email: string
  student_phone: string
  
  course_id: string
  course_name: string           // (obrigatório)
  course_duration: string       // Carga horária
  course_modality: string
  
  programmatic_content: [       // Módulos + horas
    { module: string, hours: string }
  ]
  
  start_date: date
  end_date: date
  valid_until: date             // Data de vencimento
  
  client_id: string             // ID da empresa
  client_name: string
  instructor_name: string
  technical_responsibles: [     // Responsáveis técnicos
    { name: string, title: string, registration: string }
  ]
  
  status: enum                  // "pending_signature" | "signed" | "active" | "revoked" | "expired"
  
  signature_url: string         // URL da assinatura digital
  signed_at: datetime
  signed_ip: string
  signed_device: string
  
  is_blocked: boolean           // Bloqueado após deadline ou expiração
  download_deadline: datetime   // Prazo para download
  downloaded_at: datetime       // Quando foi baixado
  
  version: number               // Para reemissões
  reissued_from_id: string      // ID do cert original
  
  revocation_reason: string
  revoked_at: datetime
  revoked_by: string            // Email de quem revogou
  
  signature_reminder_sent_at: datetime  // Reenvio automático 48h
  
  recipient_type: enum          // "aluno" (30 dias) | "empresa" (45 dias)
}
```

#### 4.1.4 Contract (Contratos)

```javascript
{
  contract_number: string       // CAT-2026-0001
  template_id: string
  template_name: string
  
  student_id: string
  student_name: string          // (obrigatório)
  student_cpf: string           // (obrigatório)
  student_email: string
  student_phone: string
  student_data_nascimento: string
  is_minor: boolean
  
  enrollment_id: string
  course_name: string
  course_duration: string
  course_value: number
  
  desconto_percentual: number
  valor_entrada: number
  num_parcelas: number
  valor_parcela: number
  primeiro_vencimento: date
  payment_method: string
  
  course_start_date: date
  course_end_date: date
  
  status: enum                  // 16 status diferentes
  
  html_content_filled: string   // HTML com variáveis preenchidas
  pdf_url: string               // PDF assinado
  auth_code: string             // Código único de autenticação
  
  sent_at: datetime
  sent_via: enum                // "whatsapp" | "email" | "manual"
  
  // Assinaturas
  student_signed_at: datetime
  student_signature_url: string
  student_signed_ip: string
  
  resp_legal_nome: string       // Para menores
  resp_legal_signed_at: datetime
  
  resp_financeiro_nome: string
  resp_financeiro_signed_at: datetime
  
  manager_signed_at: datetime   // CAT
  manager_signed_by: string
  
  student_lgpd_accepted_at: datetime
  
  valid_until: date
  renewal_alert_sent: boolean
  notes: string
}
```

#### 4.1.5 BMMRecord (Faturamento Mensal)

```javascript
{
  company_id: string
  company_name: string
  period: string                // "Janeiro/2025"
  template_id: string
  template_name: string
  
  pdf_url: string
  status: enum                  // "Rascunho" | "Pendente" | "Aprovado" | "Rejeitado" | "Gerado" | "Enviado" | "Confirmado"
  
  sent_to: string               // Email de envio
  sent_at: datetime
  
  total_value: number
  total_classes: number
  total_students: number
  
  content_snapshot: string      // JSON stringificado
  
  notes: string
  rejection_reason: string      // Se rejeitado
  
  approved_by: string           // Email de quem aprovou
  approved_at: datetime
  
  history: [
    {
      action: enum              // "Gerado" | "Enviado" | "Aprovado" | "Rejeitado" | "Atualizado"
      timestamp: datetime
      user_email: string
      details: string
    }
  ]
}
```

#### 4.1.6 UserProfile (Usuários do Sistema)

```javascript
{
  user_id: string               // ID do User (Base44)
  user_email: string            // (obrigatório)
  user_name: string             // (obrigatório)
  
  role: enum                    // "gestor_master" | "editor" | "cliente" | "personalizado"
  
  permissions: [string]         // Lista de módulos permitidos
  
  company_permissions: [        // Acesso por empresa
    {
      company_id: string
      company_name: string
      permissions: ["view" | "edit" | "manage_users"]
    }
  ]
  
  status: enum                  // "active" | "blocked" | "pending_password_change"
  
  password_changed: boolean
  last_login: datetime
  
  credentials_sent_at: datetime
  credentials_sent_via: enum    // "whatsapp" | "email" | "manual"
  credentials_sent_by: string
  
  phone: string
  
  consent_accepted_at: datetime // LGPD
  consent_ip_address: string
  consent_term_version: string
}
```

#### 4.1.7 AuditLog (Auditoria)

```javascript
{
  user_email: string
  user_name: string
  action: enum                  // "login" | "logout" | "create" | "update" | "delete" | "view" | "export" | "send_credentials" | "block_user" | "change_password" | "sign" | "send_whatsapp"
  entity_type: string           // Certificate | User | Contract | etc
  entity_id: string
  entity_name: string           // Nome/descrição da entidade
  details: string               // Detalhes com mudanças
  ip_address: string
  company_id: string
  company_name: string
}
```

#### 4.1.8 Proposal (Propostas)

```javascript
{
  file_name: string
  file_url: string
  status: enum                  // "Processando" | "Aguardando Revisão" | "Revisado" | "Aprovada" | "Rejeitada"
  
  company_name: string
  company_cnpj: string
  company_id: string
  
  total_value: number
  
  courses: [
    {
      course_name: string
      workload_hours: number
      students_count: number
      modality: enum            // "Presencial" | "Online" | "Híbrido"
      unit_value: number
      total_value: number
      num_turmas: number        // Quantidade de turmas
    }
  ]
  
  notes: string
  
  class_schedule_ids: [string]  // IDs das turmas criadas
}
```

#### 4.1.9 Outras Entidades

| Entidade | Descrição |
|----------|-----------|
| **Course** | Catálogo de cursos com horários padrão |
| **Instructor** | Instrutores com dados bancários e histórico |
| **Student** | Alunos com documentos e histórico |
| **StudentCourseEnrollment** | Matrículas de alunos em cursos |
| **CertificateModel** | Templates customizáveis de certificados |
| **BMMTemplate** | Templates de BMM com configuração de colunas |
| **ContractTemplate** | Templates de contratos |
| **Contractor** | Empresas fornecedoras (subcontratadas) |
| **AccessLog** | Histórico de logins e acessos negados |
| **ConfigNotificacoes** | Configuração de textos de notificação |
| **AgendaTreinamento** | Agenda de eventos de treinamento |
| **Conversation** | Mensagens de IA e leads |

### 4.2 Relacionamentos entre Entidades

```
Company ←→ ClassSchedule (1:N)
         ↓
ClassSchedule ←→ StudentCourseEnrollment (1:N)
             ↓
             StudentCourseEnrollment ←→ Certificate (1:1)
                                    ↓
                                    Certificate ←→ CertificateModel (N:1)

UserProfile ←→ Company (N:N via company_permissions)

Proposal →→ ClassSchedule (1:N via class_schedule_ids)
         →→ Company (N:1)

BMMRecord ←→ Company (1:N)
          ←→ BMMTemplate (N:1)
```

### 4.3 Campos Built-in (Automáticos)

Todas as entidades possuem automaticamente:

```javascript
{
  id: string              // UUID único
  created_date: datetime  // Data de criação
  updated_date: datetime  // Última atualização
  created_by_id: string   // ID do usuário que criou
}
```

---

## 5. Regras de Permissão

### 5.1 Modelo de Permissão Híbrido

O sistema utiliza **Role + Chaves de Módulo**:

```javascript
// Cada usuário tem:
{
  role: "gestor_master" | "editor" | "cliente" | "personalizado",
  permissions: [
    "Dashboard",
    "Cronograma",
    "Cursos",
    "Certificações",
    "Log de Auditoria",
    ...
  ]
}
```

### 5.2 Perfis Pré-definidos

#### 5.2.1 Gestor Master
- **Role:** `gestor_master`
- **allowedKeys:** `null` (acesso total irrestrito)
- **Acesso:** Todos os módulos sem restrição
- **Função:** Administrador máximo do sistema

#### 5.2.2 Editor
- **Role:** `editor`
- **allowedKeys:** Lista completa exceto módulos de admin
- **Módulos Permitidos:**
  - Dashboard
  - Cronograma
  - Chamada Presencial
  - Entrada de Propostas
  - Gestão de BMM
  - Instrutores
  - Empresas
  - Contratadas
  - Cursos
  - Alunos Individuais
  - Gestão de Contratos
  - Certificações
  - Alertas
  - Designer de Certificados
  - Assinaturas Digitais
  - Auditoria de Certificados
  - Central de Comunicação
  - Dashboard Comercial
  - Dashboard Operacional
  - Analytics/Relatórios

#### 5.2.3 Cliente
- **Role:** `cliente`
- **allowedKeys:** Apenas módulos básicos
- **Módulos Permitidos:**
  - Dashboard
  - Certificações
  - Alertas de Vencimento
- **Restrição:** Visualização apenas de dados relacionados à sua empresa

#### 5.2.4 Personalizado
- **Role:** `personalizado`
- **allowedKeys:** Array customizado definido manualmente
- **Uso:** Casos especiais e granularidade específica

### 5.3 Lógica de PermissionsContext

```javascript
// Fluxo de validação em lib/PermissionsContext.jsx

1. Carregar usuário autenticado via base44.auth.me()

2. Se role === "admin" (Base44 admin)
   → allowedKeys = null (acesso total)

3. Se role === "gestor_master"
   → allowedKeys = null (acesso total)

4. Se role === "editor"
   → allowedKeys = EDITOR_MODULES (pré-definido)

5. Se role === "cliente"
   → allowedKeys = CLIENT_MODULES (pré-definido)

6. Se role === "personalizado"
   → allowedKeys = profile.permissions (customizado)

7. Polling a cada 30 segundos para sincronizar mudanças
   + Cache local com TTL de 5 minutos
```

### 5.4 Proteção de Rotas

```javascript
// Em ProtectedRoute.jsx

<Route path="/Certificacoes" element={
  <ProtectedRoute pageKey="Certificações">
    <Certificacoes />
  </ProtectedRoute>
} />
```

Se o usuário não tem `"Certificações"` em `allowedKeys`:
- ✅ Redireciona para `/Dashboard`
- ✅ Exibe toast: "Acesso negado a este módulo"
- ✅ Registra em `AccessLog` com `event_type: "not_registered"`

### 5.5 Módulo → Chave de Permissão (Mapping)

| Rota | Chave de Permissão | Requerido para |
|------|-------------------|----------------|
| `/Schedule` | `Cronograma` | Agendar turmas |
| `/Instructors` | `Instrutores` | Gerenciar instrutores |
| `/Companies` | `Empresas` | Gerenciar clientes |
| `/Courses` | `Cursos` | Gerenciar catálogo |
| `/Certificacoes` | `Certificações` | Emitir certificados |
| `/DigitalSignatures` | `Assinaturas Digitais` | Gerenciar assinaturas |
| `/CertificateAlerts` | `Alertas de Vencimento` | Configurar alertas |
| `/CertDesigner` | `Designer de Certificados` | Customizar templates |
| `/AuditLog` | `Log de Auditoria` | Visualizar auditoria |
| `/Users` | `Usuários` | Gerenciar usuários |
| `/ProposalEntry` | `Entrada de Propostas` | Processar propostas |
| `/GestaoBMM` | `Gestão de BMM` | Gerenciar faturamento |
| `/GestaoContratos` | `Gestão de Contratos` | Gerenciar contratos |

### 5.6 Security Headers & Validação

```javascript
// Função registrarAlteracao dispara automaticamente em:
- base44.entities.Company.create(...)
- base44.entities.Certificate.update(...)
- base44.entities.Contract.delete(...)

// Log armazena:
{
  user_email: "admin@cat.com",
  action: "update",
  entity_type: "Certificate",
  entity_id: "cert-123",
  details: "Campos alterados: status | Mudanças: { status: { antes: 'pending_signature', depois: 'signed' } }",
  ip_address: "entity-automation"
}
```

---

## 6. Fluxos Operacionais

### 6.1 Fluxo de Cadastro de Empresas

```
1. ENTRADA: Gerente acessa /Companies
   ├─ Verifica permissão "Empresas"
   └─ Se negado → Acesso negado

2. CRIAÇÃO:
   ├─ Clica em "+ Nova Empresa"
   ├─ Preenche formulário (Company Form)
   │  ├─ Razão Social (obrigatório)
   │  ├─ Nome Fantasia (obrigatório)
   │  ├─ CNPJ (obrigatório)
   │  ├─ Email de Faturamento
   │  ├─ Unidades (array)
   │  ├─ Contatos (array)
   │  └─ Logo (upload)
   ├─ Submete: base44.entities.Company.create(data)
   └─ Automações disparadas:
      └─ registrarAlteracao() → cria AuditLog

3. EDIÇÃO:
   ├─ Clica em "Editar" em card existente
   ├─ Abre modal com dados pré-preenchidos
   ├─ Modifica cursos, unidades, contatos
   ├─ Salva: base44.entities.Company.update(id, data)
   └─ Automações:
      ├─ registrarAlteracao() → log detalhado de mudanças
      └─ [Pode disparar recálculo de BMM se houver]

4. DELEÇÃO:
   ├─ Clica em ícone X (trash)
   ├─ Confirm modal
   ├─ base44.entities.Company.delete(id)
   └─ registrarAlteracao() → marca como deletado

5. SAÍDA: Dashboard atualizado com React Query
```

### 6.2 Fluxo de Cadastro de Alunos

```
1. ENTRADA - AUTO-CADASTRO (Público):
   ├─ Usuário acessa /AutoCadastroAluno (sem autenticação)
   ├─ Preenche dados pessoais:
   │  ├─ Nome completo
   │  ├─ CPF
   │  ├─ Email
   │  ├─ Telefone/WhatsApp
   │  ├─ Data de nascimento
   │  └─ Empresa/Contato
   ├─ Submete: base44.entities.Student.create(data)
   ├─ Automação: executarCadastro() → sincroniza dados
   └─ Email de confirmação enviado

2. ENTRADA - ADMIN (Gestores):
   ├─ Acessa /GestaoAlunosIndividuais
   ├─ Busca aluno existente ou cria novo
   ├─ Associa a Curso via StudentCourseEnrollment
   │  ├─ enrollment_id criado
   │  ├─ status = "Ativo"
   │  ├─ data_inscricao = agora
   │  └─ progress = 0%
   └─ Salva: base44.entities.StudentCourseEnrollment.create(data)

3. CONTRATO:
   ├─ Após matrícula, gera Contract automaticamente
   ├─ Template + variáveis preenchidas
   ├─ Envia para assinatura (email/WhatsApp)
   ├─ Aluno assina em /ContractSign (público)
   └─ Status atualiza: "Assinado_Todas_Partes"

4. CERTIFICADO:
   ├─ Quando turma conclui (status = "Concluído")
   ├─ Sistema dispara gerador de Certificate
   ├─ Envia link de assinatura para aluno
   ├─ Aluno assina em /CertificateSign (público)
   ├─ Certificado ativado (status = "active")
   └─ Notificação enviada para aluno + empresa
```

### 6.3 Fluxo de Cursos

```
1. CADASTRO:
   ├─ Admin acessa /Courses
   ├─ Cria novo Course com:
   │  ├─ Nome (obrigatório)
   │  ├─ Descrição
   │  ├─ Validade (ex: "12 meses")
   │  └─ Horários padrão (manhã, tarde, noite)
   ├─ Salva: base44.entities.Course.create(data)
   └─ registrarAlteracao()

2. PERSONALIZAÇÃO POR EMPRESA:
   ├─ Em Company, adiciona array company_courses:
   │  ├─ course_id referencia
   │  ├─ billing_type: "per_student" ou "per_closed_class"
   │  ├─ specific_price (per aluno)
   │  ├─ class_fixed_value (turma inteira)
   │  └─ included_students_limit (limite para turma fechada)
   ├─ Salva em: base44.entities.Company.update(id, {...})
   └─ Próximas turmas usarão este preço

3. AGENDAMENTO:
   ├─ Admin acessa /Schedule (Cronograma)
   ├─ Cria ClassSchedule com:
   │  ├─ training_id (referencia Course)
   │  ├─ company_id
   │  ├─ students_count
   │  ├─ realization_dates
   │  ├─ instructor_id
   │  ├─ location
   │  └─ status: "Agendado"
   ├─ Salva: base44.entities.ClassSchedule.create(data)
   └─ Cálculos automáticos:
      ├─ totalValue = calculateCourseBilling(course, students_count)
      └─ registrarAlteracao()

4. EXECUÇÃO:
   ├─ Status muda para "Em Andamento"
   ├─ Usa /AttendanceCall para chamada presencial
   ├─ Registra presença de cada aluno
   ├─ Calcula ausências
   └─ Armazena em ClassDailyRecord

5. CONCLUSÃO:
   ├─ Admin marca turma como "Concluído"
   ├─ Dispara geração de Certificates automaticamente
   ├─ Calcula nota final e emite certificado
   ├─ Se falhou: status "Reprovado"
   └─ Notificações enviadas para alunos
```

### 6.4 Fluxo de Propostas

```
1. UPLOAD:
   ├─ Comercial acessa /ProposalEntry
   ├─ Arrasta ou seleciona PDF
   ├─ Arquivo enviado: base44.integrations.Core.UploadFile({ file })
   ├─ base44.entities.Proposal.create({ file_name, file_url, status: "Processando" })
   └─ Automação dispara: base44.functions.invoke('processProposal', { file_url, proposal_id })

2. PROCESSAMENTO COM IA:
   ├─ Função processProposal extrai:
   │  ├─ Nome da empresa
   │  ├─ CNPJ
   │  ├─ Cursos solicitados
   │  ├─ Quantidade de alunos
   │  ├─ Carga horária
   │  ├─ Modalidades
   │  └─ Valor total
   ├─ Atualiza: base44.entities.Proposal.update(id, { status: "Aguardando Revisão", courses: [...] })
   └─ Toast: "Extração concluída! Aguardando revisão."

3. REVISÃO MANUAL:
   ├─ Comercial abre modal "Revisão"
   ├─ Pode editar:
   │  ├─ Nome da empresa
   │  ├─ CNPJ
   │  ├─ Cada curso (nome, carga, alunos, valor, modalidade)
   │  ├─ Quantidade de turmas por curso
   │  └─ Observações
   ├─ Salva rascunho: base44.entities.Proposal.update(id, { status: "Revisado" })
   └─ Ou aprova direto

4. APROVAÇÃO:
   ├─ Clica "Aprovar e Criar Turmas"
   ├─ Sincroniza Company se necessário:
   │  ├─ Se existe: usa existing company_id
   │  └─ Se não existe: cria Company automaticamente
   ├─ Para cada curso, cria ClassSchedule:
   │  ├─ training_name, company_id, students_count
   │  ├─ status: "Aguardando"
   │  ├─ Sem datas/instrutor/local ainda
   │  └─ Notes: "📋 Proposta: [nome-do-arquivo]"
   ├─ Salva Proposal: status = "Aprovada", class_schedule_ids = [...]
   └─ Toast: "✅ Proposta aprovada! X turma(s) criada(s) no Cronograma. Complete datas e instrutor lá."

5. COMPLEMENTAÇÃO:
   ├─ Admin vai para /Schedule (Cronograma)
   ├─ Encontra turmas com status "Aguardando"
   ├─ Preenche:
   │  ├─ Datas específicas (realization_dates)
   │  ├─ Instrutor
   │  ├─ Local
   │  └─ Horários
   ├─ Muda status para "Agendado"
   └─ Turma pronta para executar
```

### 6.5 Fluxo Financeiro

#### 6.5.1 Cálculo de Cobrança (Precificação)

```javascript
// Aplicado em BMMGenerator.jsx, linhas 122-165

função calcularCobranca(turma, empresa) {
  
  const studentsCount = turma.students_count || 1
  const companyCourse = empresa.company_courses.find(
    cc => cc.course_id === turma.training_id
  )
  
  if (companyCourse) {
    
    if (companyCourse.billing_type === "per_closed_class") {
      // TIPO 1: Turma Fechada (valor fixo)
      unit_value = companyCourse.class_fixed_value
      total_value = companyCourse.class_fixed_value
      // Neste tipo, número de alunos não afeta o valor
      
    } else {
      // TIPO 2: Por Aluno
      unit_value = companyCourse.specific_price
      total_value = companyCourse.specific_price * studentsCount
    }
    
  } else {
    // Sem configuração específica: usa valor da turma
    unit_value = turma.unit_value || 0
    total_value = unit_value * studentsCount
  }
  
  return { unit_value, total_value, billing_type }
}
```

#### 6.5.2 Cálculo de Excedentes

```javascript
// Se turma fechada e alunos > limit

para cada turma (turma.billing_type === "per_closed_class"):
  
  excedente = max(0, studentsCount - companyCourse.included_students_limit)
  
  if (excedente > 0):
    
    valor_unitario_excedente = class_fixed_value / included_students_limit
    
    linha_excedente = {
      description: "Participantes Excedentes — [NomeCurso]"
      unit_value: valor_unitario_excedente
      quantity: excedente
      total_value: valor_unitario_excedente * excedente
    }
    
    // Serviços adicionais APENAS sobre os excedentes
    para cada servico (coffee_break_morning, lunch, etc):
      if (servico.enabled):
        linha_servico = {
          description: "[Serviço] Excedente — [NomeCurso]"
          unit_value: servico.unit_value
          quantity: excedente
          total_value: servico.unit_value * excedente
        }
```

#### 6.5.3 Fluxo de BMM (Faturamento Mensal)

```
1. GERAÇÃO:
   ├─ Admin acessa /GestaoBMM
   ├─ Seleciona:
   │  ├─ Empresa Cliente
   │  ├─ Período (ex: "Janeiro/2025")
   │  └─ Template BMM
   ├─ Clica "Gerar BMM"
   └─ BMMGenerator.handleGenerate() dispara:
      ├─ Busca all ClassSchedule para empresa + período
      ├─ Calcula cobrança por turma (per_student vs per_closed_class)
      ├─ Calcula excedentes
      ├─ Calcula serviços adicionais (coffee break, lunch)
      ├─ Total final = turmas + excedentes + adicionais
      └─ Exibe pré-visualização

2. EDIÇÃO:
   ├─ Gerente pode editar dados no BMM:
   │  ├─ Título, BMM Number, Contract Number (UNITAPAJÓS only)
   │  ├─ Fiscal, Gestor do Contrato
   │  └─ Observações
   ├─ BMMEditor permite customização visual
   └─ Mudanças salvas em Company.bmm_editor_config (UNITAPAJÓS)

3. ASSINATURA:
   ├─ Se UNITAPAJÓS: exibe campos para assinatura digital
   ├─ Admin assina digitalmente
   └─ Registra signed_at + signed_ip

4. EXPORTAÇÃO:
   ├─ Clica "Exportar PDF"
   ├─ Função exportBMMPDF() gera documento final
   ├─ Salva BMMRecord no histórico:
   │  ├─ status = "Gerado"
   │  ├─ content_snapshot = stringify(generatedContent)
   │  ├─ total_value, total_classes, total_students
   │  └─ history[0] = { action: "Gerado", timestamp, user_email }
   └─ React Query invalida cache

5. ENVIO:
   ├─ Clica "Enviar por E-mail"
   ├─ BMMEmailSender renderiza modal
   ├─ Preenche email(s) destinatário
   ├─ Invoca: base44.functions.invoke('sendBMMEmailUOL', payload)
   ├─ Email enviado via UOL SMTP (secret: UOL_SMTP_EMAIL)
   ├─ Atualiza BMMRecord: status = "Enviado", sent_to, sent_at
   └─ Toast: "BMM enviado com sucesso!"

6. APROVAÇÃO (Opcional):
   ├─ Empresa cliente revisa BMM
   ├─ Envia confirmação (pode ser manual)
   ├─ Status atualiza para "Confirmado"
   └─ Gera receita contábil
```

#### 6.5.4 Gestão de Pagamento de Instrutores

```
ClassSchedule.payment_installments = [
  {
    installment_number: 1,
    amount: 500.00,
    due_date: "2026-02-15",
    status: "Pendente",
    notes: ""
  },
  {
    installment_number: 2,
    amount: 500.00,
    due_date: "2026-03-15",
    status: "Pendente",
    notes: ""
  }
]

// Fluxo:
1. Turma criada com payment_installments pré-calculadas
2. Admin marca como "Pago" quando recebe comprovante
3. Anexa proof_of_payment_url (upload de recibo)
4. Sistema rastreia via AuditLog
```

---

## 7. Regras de Cálculo e Precificação

### 7.1 Tipos de Cobrança

#### 7.1.1 Por Aluno (per_student)

```javascript
total_value = specific_price * students_count

Exemplo:
  specific_price = R$ 100
  students_count = 25
  total_value = 100 × 25 = R$ 2.500
```

#### 7.1.2 Turma Fechada (per_closed_class)

```javascript
total_value = class_fixed_value (independente de students_count)

Exemplo:
  class_fixed_value = R$ 1.500
  students_count = 25
  total_value = R$ 1.500 (SEMPRE, independente se 5 ou 50 alunos)
  
// MAS se alunos > limit:
  included_students_limit = 15
  excedentes = 25 - 15 = 10
  valor_unitario_excedente = 1.500 / 15 = R$ 100/aluno
  total_excedentes = 100 × 10 = R$ 1.000
  
  // Serviços adicionais:
  coffee_break = R$ 10 × 10 excedentes = R$ 100
  almoço = R$ 40 × 10 excedentes = R$ 400
  
  TOTAL FINAL = 1.500 + 1.000 + 100 + 400 = R$ 3.000
```

### 7.2 Regras de Validação

```javascript
// lib/billingCalculations.js

function validateBillingFields(course) {
  
  if (course.billing_type === "per_student") {
    return {
      valid: (course.specific_price || 0) > 0,
      errors: (course.specific_price || 0) <= 0 ? 
        ['Valor específico deve ser maior que 0'] : []
    }
  }
  
  if (course.billing_type === "per_closed_class") {
    const errors = []
    if ((course.class_fixed_value || 0) <= 0) 
      errors.push('Valor turma fechada deve ser > 0')
    if ((course.included_students_limit || 0) <= 0) 
      errors.push('Limite de alunos deve ser > 0')
    
    return { valid: errors.length === 0, errors }
  }
}
```

### 7.3 Precedência de Preço

```
1. Company.company_courses[course_id].specific_price (MAIOR PRIORIDADE)
2. ClassSchedule.unit_value (FALLBACK)
3. Course padrão (RARO)

// Lógica em BMMGenerator.jsx líneas 127-156:

const companyCourse = company.company_courses.find(...)

if (companyCourse) {
  unitValue = companyCourse.specific_price
} else {
  unitValue = classItem.unit_value  // Fallback
}

totalValue = unitValue * studentsCount
```

---

## 8. Regras de Assinatura Digital

### 8.1 Tipos de Assinatura

#### 8.1.1 Certificado Digital

**Fluxo:**
1. Certificado gerado com `status = "pending_signature"`
2. Sistema gera `signature_link` com auth_code
3. Link enviado via email ou WhatsApp para aluno
4. Aluno acessa `/CertificateSign?auth_code=XXX`
5. Interface de assinatura canvas/drawing
6. Aluno clica "Assinar"
7. Registra:
   - `signature_url` (imagem data:image/png)
   - `signed_at` (timestamp)
   - `signed_ip` (IP do cliente)
   - `signed_device` (User-Agent)
   - `status = "signed"`
8. Link expira em 7 dias (`signature_link_expires_at`)
9. Se não assinar em 48h: reenvio automático (`signature_reminder_sent_at`)
10. Prazo para download:
    - Se recipient_type = "aluno": 30 dias
    - Se recipient_type = "empresa": 45 dias
11. Após prazo: `is_blocked = true`

#### 8.1.2 Contrato Digital

**Fluxo:**
1. Contract gerado com `status = "Rascunho"`
2. `html_content_filled` preenchido com variáveis
3. Auth_code gerado
4. Aluno acessa `/ContractSign?auth_code=XXX`
5. Exibe contrato (read-only) + assinatura canvas
6. Assinatura armazenada em `student_signature_url`
7. Se menores de idade: requer assinatura de responsável legal
   - `resp_legal_signature_url`
8. Responsável financeiro assina:
   - `resp_financeiro_signature_url`
9. CAT (gerente) valida e assina:
   - `manager_signed_by`, `manager_signed_at`
10. Workflow:
    - "Rascunho" → "Enviado_Assinatura"
    - → "Aguardando_Assinatura_Aluno"
    - → "Aguardando_Assinatura_Responsavel_Legal" (se menor)
    - → "Aguardando_Assinatura_Responsavel_Financeiro"
    - → "Aguardando_Assinatura_CAT"
    - → "Assinado_Todas_Partes"
    - → "PDF_Gerado"

### 8.2 Campos de Assinatura

```javascript
Certificate:
  signature_url: string           // URL data:image/png
  signed_at: datetime             // Quando assinou
  signed_ip: string               // IP do cliente
  signed_device: string           // User-Agent browser

Contract:
  student_signature_url: string
  student_signed_at: datetime
  student_signed_ip: string
  
  resp_legal_signature_url: string
  resp_legal_signed_at: datetime
  resp_legal_signed_ip: string
  
  resp_financeiro_signature_url: string
  resp_financeiro_signed_at: datetime
  
  manager_signed_at: datetime
  manager_signed_by: string       // Email gerente
```

### 8.3 Validação de Códigos

```javascript
// GET /CertificateSign?auth_code=ABC123
const cert = await base44.entities.Certificate.filter({ auth_code: "ABC123" })

if (!cert || cert.status !== "pending_signature") {
  → Erro: Certificado inválido ou já assinado
}

if (new Date() > cert.signature_link_expires_at) {
  → Erro: Link de assinatura expirou
}

// Se OK: renderiza canvas de assinatura
```

---

## 9. Integrações Externas

### 9.1 Asaas (Cobrança Automática)

**Secrets Configurados:**
- `ASAAS_API_KEY`

**Funções Utilizadas:**
- `asaasCobranca()` - Cria cobranças
- `asaasPayment()` - Processa pagamentos
- `alertarExpiracaoAsaas()` - Notifica vencimentos

**Fluxo:**
```
ClassSchedule criada
  ↓
base44.functions.invoke('asaasCobranca', { classId, studentsCount })
  ↓
Asaas API: POST /api/v3/payments
  ↓
Cria boleto/pix para cada parcela de instrutor
  ↓
Registra em payment_installments
```

### 9.2 WhatsApp Business API

**Secrets Configurados:**
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`

**Funções Utilizadas:**
- `enviarNotificacaoWhatsApp()` - Envia notificações
- `enviarCertificadoWhatsApp()` - Envia links de assinatura
- `enviarMensagemMassaWhatsApp()` - Broadcast
- `whatsappWebhook()` - Recebe mensagens

**Fluxo:**
```
Certificado gerado
  ↓
base44.functions.invoke('enviarCertificadoWhatsApp', {
  recipient_phone: "5585987654321",
  message: "Seu certificado está pronto...",
  signature_link: "https://..."
})
  ↓
WhatsApp API: POST /v18.0/.../messages
  ↓
Aluno recebe mensagem com link
```

### 9.3 Email (UOL SMTP)

**Secrets Configurados:**
- `UOL_SMTP_EMAIL`
- `UOL_SMTP_PASSWORD`

**Funções Utilizadas:**
- `enviarBoasVindas()` - Credenciais de novo usuário
- `enviarContratoEmail()` - Contrato para assinatura
- `enviarAlertasVencimentoEmail()` - Alertas de certificados
- `sendBMMEmailUOL()` - Faturamento mensal

**Fluxo:**
```
BMM gerado e aprovado
  ↓
base44.functions.invoke('sendBMMEmailUOL', {
  recipient: "empresa@cliente.com",
  subject: "BMM — Janeiro/2025",
  pdf_attachment: base64(pdfBytes)
})
  ↓
SMTP Server: smtp.uol.com.br:587
  ↓
Email entregue na caixa de entrada
```

### 9.4 Resend Email API

**Secrets Configurados:**
- `RESEND_API_KEY`

**Uso:** Alternativa a UOL, pode ser utilizada para notificações transacionais.

### 9.5 IA - Extração de Propostas

**Integração:** `base44.integrations.Core.InvokeLLM`

**Fluxo:**
```
Proposta PDF enviada
  ↓
base44.functions.invoke('processProposal', { file_url })
  ↓
base44.integrations.Core.InvokeLLM({
  prompt: "Extraia empresa, cursos, valor de: [PDF URL]",
  add_context_from_internet: true,
  response_json_schema: { company_name, courses, total_value }
})
  ↓
Resposta JSON estruturada
  ↓
Salva em Proposal.courses, Proposal.company_name
```

### 9.6 Upload de Arquivos

**Integração:** `base44.integrations.Core.UploadFile`

**Uso:**
- Propostas PDF
- Comprovantes de pagamento
- Logos de empresas
- Fundos de certificados

```javascript
const { file_url } = await base44.integrations.Core.UploadFile({ file })
// Retorna URL pública permanente
```

---

## 10. Problemas Identificados

### 10.1 Problemas Críticos (Resolvidos em Auditoria Anterior)

| # | Problema | Severidade | Status | Solução |
|---|----------|-----------|--------|---------|
| 1 | Polling de permissões a cada 10s | 🔴 CRÍTICA | ✅ Resolvido | Aumentado para 30s |
| 2 | Loop infinito em auditoria | 🔴 CRÍTICA | ✅ Resolvido | Desativada automação "Auditar Deletions" |
| 3 | Sem cache de permissões | 🟡 MÉDIA | ✅ Resolvido | Adicionado cache TTL 5 min |

### 10.2 Problemas Residuais

#### 10.2.1 Contagem de Alunos em BMM

**Descrição:** BMM exibe 18 alunos baseado em `ClassSchedule.students_count`, mas não diferencia entre:
- Alunos inclusos no contrato (ex: 15)
- Alunos excedentes (ex: 3)

**Impacto:** Confusão visual no faturamento mensal

**Localização:** `pages/BMMGenerator.jsx` linhas 168, 513

**Recomendação:**
```javascript
// Mudar exibição de:
Total: 18 alunos

// Para:
Total: 18 alunos (15 inclusos + 3 excedentes)
```

#### 10.2.2 Automações Pendentes de Revisão

| Automação | Entidade | Trigger | Status |
|-----------|----------|---------|--------|
| `registrarAlteracao` | Todas | create/update/delete | ✅ Ativo |
| `validarIntegridadeDados` | Diversas | Scheduled | ⏸️ Pausado |
| `alertarVencimentoCertificados` | Certificate | Scheduled (diário) | ✅ Ativo |
| `gerarRecibo` | ClassSchedule | update (status=Concluído) | ✅ Ativo |

#### 10.2.3 Falta de Sincronização em Tempo Real

**Problema:** Após mudanças em ClassSchedule, BMM pode não refletir imediatamente
**Causa:** Cache local (5 min) em PermissionsContext
**Impacto:** Baixo — usuários podem atualizar manualmente via F5

#### 10.2.4 Validação Incompleta de Email

**Problema:** Não existe validação de Email duplicado em UserProfile
**Cenário:** Admin cria 2 usuários com mesmo email = erro genérico
**Impacto:** UX ruim — precisa tratar exceção melhor

```javascript
// Atualmente:
if (existing) {
  toast.warning(`O e-mail ${formData.user_email} já está cadastrado.`);
  return;
}

// Melhor seria avisar ANTES de clicar em "Criar"
```

#### 10.2.5 Contratos com Menores de Idade

**Problema:** Fluxo de assinatura com `resp_legal_nome` é manual, sem validação de data_nascimento
**Cenário:** Sistema não bloqueia se menor mas não preenche resp_legal
**Recomendação:** Validar `is_minor` antes de criar contrato

---

## 11. Riscos Técnicos

### 11.1 Riscos de Dados

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | Deleção em massa de Certificates | 🟡 Média | 🔴 Alto | Soft-delete + AuditLog |
| R2 | Duplicação de Certificates | 🟡 Média | 🟡 Médio | Validar student+course+date |
| R3 | BMM com valores incorretos | 🟡 Média | 🔴 Alto | Auditoria de cálculos |
| R4 | Contrato sem assinatura enviado | 🟢 Baixa | 🟡 Médio | Validação status antes envio |
| R5 | Permissões não sincronizarem | 🟢 Baixa | 🟡 Médio | Event listener + polling 30s |

### 11.2 Riscos de Integração

| # | Integração | Risco | Impacto | Fallback |
|---|------------|-------|---------|----------|
| R6 | WhatsApp API downtime | 🟡 Média | 🟡 Médio | Email alternativo |
| R7 | Asaas falhar em cobrança | 🟡 Média | 🔴 Alto | Retry automático + alerta |
| R8 | IA extrai proposta errado | 🟢 Baixa | 🟡 Médio | Revisão manual obrigatória |
| R9 | UOL SMTP problema | 🟡 Média | 🟡 Médio | Queue + retry 3x |

### 11.3 Riscos de Performance

| # | Área | Problema | Solução |
|---|------|----------|---------|
| R10 | Relatórios/Analytics | Sem paginação em listas | Implementar cursorização |
| R11 | BMM com muitas turmas | Cálculo síncrono bloqueador | Delegar para função background |
| R12 | Polling PermissionsContext | 30s × 100 usuários = overhead | Usar WebSocket ou SSE |

### 11.4 Riscos de Segurança

| # | Risco | Descrição | Severidade |
|---|-------|-----------|-----------|
| R13 | CSRF em formulários | Sem tokens CSRF explícitos | 🟡 Média |
| R14 | Rate limiting | Sem proteção contra brute force em login | 🟡 Média |
| R15 | SQL Injection | Base44 protege, mas validar entrada | 🟢 Baixa |
| R16 | XSS em campos livres | Textarea sem sanitização | 🟡 Média |
| R17 | Credenciais em localStorage | Secrets nas pages | 🔴 Alta |

---

## 12. Recomendações para Migração

### 12.1 Preparação Pré-Migração

#### 12.1.1 Auditoria Completa

```
□ Executar validarIntegridadeDados() em todos os ambientes
□ Comparar contagem de registros:
  ├─ Students vs StudentCourseEnrollment (1:1 mínimo)
  ├─ Certificates vs StudentCourseEnrollment (1:1)
  └─ AuditLog vs Mudanças registradas
□ Verificar integridade de assinaturas digitais
□ Validar emails em fila (Resend/UOL)
□ Listar automações ativas e testar cada uma
```

#### 12.1.2 Backup e Snapshots

```
□ Exportar todas as entidades principais em JSON:
  ├─ Company (com company_courses)
  ├─ ClassSchedule (com payment_installments)
  ├─ Certificate (com signature_urls)
  ├─ Contract (com assinaturas)
  ├─ BMMRecord (com content_snapshot)
  ├─ UserProfile (sem senhas)
  └─ AuditLog (completo)
□ Armazenar em S3/Drive com timestamp
□ Documentar estrutura do snapshot
```

#### 12.1.3 Testes de Integração

```
□ Asaas: Testar cobrança em sandbox
□ WhatsApp: Enviar mensagem teste
□ Email (UOL): Enviar email teste
□ IA (InvokeLLM): Processar proposta teste
□ Upload: Fazer upload de arquivo teste
```

### 12.2 Estratégia de Migração

#### 12.2.1 Opção 1: Big Bang (Risco Alto, Rápido)

```
Dia 0:
  └─ Freeze produção (comunicar usuários)
  └─ Backup full de todas as entidades
  └─ Inicia migração

Dia 1:
  └─ Importa dados estruturados no novo sistema
  └─ Reconstrói relacionamentos
  └─ Valida integridade

Dia 2:
  └─ Testa fluxos críticos (certificado, BMM, contrato)
  └─ Corrige erros encontrados

Dia 3:
  └─ Go-live (volta ao normal)

❌ Risco: Se falhar, perda de 3 dias de dados
✅ Vantagem: Rápido, sem duplicidade de dados
```

#### 12.2.2 Opção 2: Gradual (Risco Baixo, Lento)

```
Semana 1: Migração de Histórico
  └─ Company + Courses + Instructors
  └─ Validar relacionamentos

Semana 2: Migração de Turmas
  └─ ClassSchedule + StudentCourseEnrollment
  └─ Recalcular totais

Semana 3: Migração de Certificados
  └─ Certificate + assinaturas
  └─ Validar códigos

Semana 4: Migração de Contratos
  └─ Contract + histórico

Semana 5: Migração de Faturamento
  └─ BMMRecord + snapshots
  └─ Recalcular valores

✅ Vantagem: Baixo risco, time pode corrigir durante
❌ Desvantagem: Longo, possível duplicidade
```

#### 12.2.3 Opção 3: Paralela (Recomendada)

```
Semana 1-2: Setup Ambiente Novo
  └─ Provisionar DB nova
  └─ Deploy código
  └─ Configurar integrações

Semana 3: Espelhamento de Dados
  └─ Exportar dados históricos de PROD
  └─ Importar em STAGING
  └─ Validar completude (100% iguais)

Semana 4: Testes Extensivos
  └─ Fluxo completo: Empresa → Aluno → Certificado
  └─ Faturamento: Calcular BMM, comparar com PROD
  └─ Integrações: Testar Asaas, WhatsApp, Email

Semana 5: Cutover Planejado
  └─ Data exata definida (ex: 15/06/2026)
  └─ Usuários contatados
  └─ PROD ativa até 18:00, STAGING vira PROD às 18:00
  └─ Monitoramento 24h nos primeiros 7 dias

✅ Vantagem: Seguro, testado, rollback possível
❌ Desvantagem: Mais caro (2 ambientes simultâneos)
```

**Recomendação: Opção 3 (Paralela)**

### 12.3 Checklist Pré-Go-Live

```
□ DADOS
  ├─ 100% das entidades importadas
  ├─ Relacionamentos validados
  ├─ Totalizações recalculadas
  ├─ Nenhum registro duplicado
  └─ AuditLog migrado (sem perder histórico)

□ FUNCIONALIDADES
  ├─ Login/logout funciona
  ├─ Permissões corretas por usuário
  ├─ Dashboard carrega sem erros
  ├─ Crud de Company funciona
  ├─ Geração de BMM (cálculos corretos)
  ├─ Assinatura digital de Certificados
  ├─ Envio de Contratos
  └─ Integrações (Asaas, WhatsApp, Email)

□ PERFORMANCE
  ├─ Página carrega em < 3s
  ├─ BMM gerada em < 10s
  ├─ Queries (sem N+1)
  └─ Monitore CPU/mem nos primeiros 7 dias

□ SEGURANÇA
  ├─ SSL/TLS ativa
  ├─ Secrets não expostos em logs
  ├─ Rate limiting configurado
  ├─ CORS restringido
  └─ Audit logging ativo

□ COMUNICAÇÃO
  ├─ Usuários notificados da migração
  ├─ Suporte treinado
  ├─ FAQ publicada
  └─ Contato de emergência definido
```

### 12.4 Rollback Plan

```
Se problemas críticos forem detectados em STAGING/PROD:

1. IDENTIFICAR: Qual funcionalidade falhou?
   ├─ Dados corrompidos?
   ├─ Integração não funciona?
   └─ Performance inaceitável?

2. DIAGNOSTICAR: Quanto tempo para corrigir?
   ├─ Se < 1 hora: Corrigir no novo sistema
   ├─ Se 1-4 horas: Considerar hot-patch
   └─ Se > 4 horas: Voltar para sistema anterior

3. VOLTAR (se necessário):
   ├─ DNS aponta de volta para PROD antiga
   ├─ Dados escritos no novo ambiente: DESCARTADOS
   ├─ Usuários notificados do atraso
   └─ Replaneja nova tentativa para próxima semana

4. APRENDER:
   ├─ Quais testes falharam?
   ├─ Por que não foram detectados?
   └─ Melhorar cobertura para retry
```

### 12.5 Pós-Migração (Primeiras 4 Semanas)

```
Semana 1: Monitoramento Intensivo
  └─ Daily standup com suporte + dev
  └─ Resposta rápida a bugs
  └─ Coleta de feedback de usuários
  └─ Métricas de saúde do sistema

Semana 2: Otimizações
  └─ Se houver bottleneck: resolver
  └─ Cache aquecido
  └─ Índices de DB otimizados
  └─ Alertas de performance configurados

Semana 3: Documento Final
  └─ Documentação de como o sistema funciona
  └─ Playbook de operações
  └─ Runbooks de incidents comuns
  └─ Roadmap de melhorias identificadas

Semana 4: Cleanup
  └─ Deprovisionar ambiente antigo (opcional)
  └─ Arquivar backups antigos
  └─ Fechar tickets de migração
  └─ Rétrospective com time
```

### 12.6 Riscos Específicos da Migração

| # | Risco | Probabilidade | Impacto | Prevenção |
|---|-------|---------------|---------|-----------|
| M1 | Perda de dados durante import | 🟡 Média | 🔴 Alto | Validação de checksum |
| M2 | Relacionamentos quebrados | 🟡 Média | 🔴 Alto | Teste de integridade |
| M3 | Downtime não previsto | 🟢 Baixa | 🟡 Médio | Timeout planejado |
| M4 | Senhas salvas em logs | 🔴 Alta | 🔴 Alto | Nunca logar com prod creds |
| M5 | URLs quebradas pós-migração | 🟡 Média | 🟡 Médio | Teste todos os links |
| M6 | Assinaturas digitais perdidas | 🟢 Baixa | 🔴 Alto | Backup de todas as imgs |

---

## 📊 Resumo Executivo

### Estado do Sistema
- ✅ **Funcional:** Todos os módulos operando
- ✅ **Auditado:** Auditoria crítica realizada (junho 2026)
- ⏳ **Stable:** Após correções de permissões e automações

### Dados Críticos
- **Entidades:** 20+ tabelas
- **Relacionamentos:** Complexos (Company → ClassSchedule → Certificate)
- **Integrações:** 6 sistemas externos
- **Usuários:** Suporta multiplos perfis + permissões granulares

### Próximos Passos
1. **Curto prazo:** Implementar diferenciação de alunos inclusos vs excedentes no BMM
2. **Médio prazo:** Migração para novo ambiente (Opção 3 - Paralela)
3. **Longo prazo:** Refactor de automações + WebSocket para permissões

---

**Fim da Documentação Técnica**

Gerado por: Base44 AI Assistant  
Data: 02 de junho de 2026  
Status: Completo e Verificado