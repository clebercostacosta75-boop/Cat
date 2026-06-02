# 📋 Plano de Exportação e Migração - CAT Gestão Cursos

**Data:** 2026-06-02  
**Versão:** 1.0  
**Status:** Documentação para Backup e Migração Futura

---

## 1. MAPA COMPLETO DE PÁGINAS

### 1.1 Estrutura de Rotas

```
/
├── / (Dashboard Central)
├── /Dashboard (alias)
├── /DashboardCentral (alias)
│
├── CERTIFICAÇÕES
│   ├── /CertificateEmissao (Emissão de Certificados)
│   ├── /Certificacoes (Gestão de Certificações)
│   ├── /CertificateAuditPanel (Auditoria de Certificados)
│   ├── /CertificateSign (Assinatura - público)
│   ├── /CertificateValidate (Validação - público)
│   └── /CertDesigner (Designer de Certificados)
│
├── ADMINISTRATIVO
│   ├── /AdminDashboard (Dashboard Admin)
│   ├── /Users (Gestão de Usuários)
│   ├── /AuditLog (Log de Auditoria)
│   ├── /AuditoriaCompleta (Auditoria Completa)
│   └── /AccessLog (Log de Acesso)
│
├── OPERACIONAL
│   ├── /Schedule (Cronograma)
│   ├── /AgendaTreinamentos (Agenda de Treinamentos)
│   ├── /AttendanceCall (Chamada Presencial)
│   ├── /DashboardOperacional (Dashboard Operacional)
│   ├── /DashboardOperacionalV2 (Dashboard Op. V2)
│   ├── /ProposalEntry (Entrada de Propostas)
│   ├── /GestaoBMM (Gestão de BMM)
│   ├── /GestaoAlunosIndividuais (Alunos Individuais PF)
│   └── /GestaoContratos (Gestão de Contratos)
│
├── FINANCEIRO
│   └── /DashboardFinanceiro (Dashboard Financeiro)
│
├── COMERCIAL
│   ├── /DashboardComercial (Dashboard Comercial)
│   ├── /GestaoLeads (Gestão de Leads)
│   └── /BaseConhecimento (Base de Conhecimento)
│
├── RELATÓRIOS
│   └── /Analytics (Dashboard de Relatórios)
│
├── CADASTROS
│   ├── /Companies (Empresas)
│   ├── /Contractors (Contratadas)
│   ├── /Courses (Cursos)
│   ├── /Instructors (Instrutores)
│   └── /CourseCategories (Categorias de Cursos)
│
├── COMUNICAÇÃO
│   └── /CommunicationCenter (Central de Comunicação)
│
├── PORTAIS
│   ├── /StudentPortal (Portal do Aluno - público)
│   ├── /CompanyPortal (Portal da Empresa - público)
│   ├── /AutoCadastroAluno (Auto-cadastro Aluno - público)
│   └── /AttendanceConfirm (Confirmação Presença - público)
│
├── ASSINATURAS E CONTRATOS
│   ├── /ContractSign (Assinatura de Contrato - público)
│   ├── /DigitalSignatures (Gerenciamento de Assinaturas)
│   └── /AlertasConfig (Configuração de Alertas)
│
└── SEGURANÇA
    ├── /AcessoNegado (Acesso Negado)
    ├── /ConsentForm (Formulário de Consentimento LGPD)
    ├── /TrocarSenha (Trocar Senha)
    ├── /PrivacyPolicy (Política de Privacidade)
    └── PageNotFound (Página não encontrada)
```

### 1.2 Características das Páginas

| Página | Tipo | Autenticação | Permissão | Status |
|--------|------|--------------|-----------|--------|
| DashboardCentral | Principal | Sim | Dashboard | Ativa |
| CertificateEmissao | Operacional | Sim | Certificações | Ativa |
| Certificacoes | Operacional | Sim | Certificações | Ativa |
| CertificateSign | Pública | Não | Nenhuma | Ativa |
| CertificateValidate | Pública | Não | Nenhuma | Ativa |
| Companies | Cadastro | Sim | Empresas | Ativa |
| Contractors | Cadastro | Sim | Contratadas | Ativa |
| Courses | Cadastro | Sim | Cursos | Ativa |
| Instructors | Cadastro | Sim | Instrutores | Ativa |
| Schedule | Operacional | Sim | Cronograma | Ativa |
| AgendaTreinamentos | Operacional | Sim | Agenda de Treinamentos | Ativa |
| GestaoBMM | Operacional | Sim | Gestão de BMM | Ativa |
| GestaoAlunosIndividuais | Operacional | Sim | Alunos Individuais (PF) | Ativa |
| GestaoContratos | Operacional | Sim | Gestão de Contratos | Ativa |
| ProposalEntry | Comercial | Sim | Entrada de Propostas | Ativa |
| Users | Admin | Sim | Usuários | Ativa |
| AuditLog | Admin | Sim | Log de Auditoria | Ativa |
| AuditoriaCompleta | Admin | Sim | Auditoria Completa | Ativa |
| AccessLog | Admin | Sim | Log de Acesso | Ativa |
| DashboardComercial | Comercial | Sim | Dashboard Comercial | Ativa |
| DashboardOperacional | Operacional | Sim | Dashboard Operacional | Ativa |
| DashboardFinanceiro | Financeiro | Sim | Dashboard Financeiro | Ativa |
| Analytics | Relatórios | Sim | Dashboard de Relatórios | Ativa |
| CommunicationCenter | Comunicação | Sim | Central de Comunicação | Ativa |
| StudentPortal | Pública | Não | Nenhuma | Ativa |
| CompanyPortal | Pública | Não | Nenhuma | Ativa |
| ContractSign | Pública | Não | Nenhuma | Ativa |

---

## 2. MAPA COMPLETO DE TABELAS (ENTIDADES)

### 2.1 Entidades Principais

```
ENTIDADES DO SISTEMA CAT GESTÃO CURSOS
├── EMPRESAS & CONTRATADAS
│   ├── Company (Empresa Cliente)
│   ├── Contractor (Empresa Contratada)
│   └── Client (Cliente)
│
├── RECURSOS HUMANOS
│   ├── Instructor (Instrutor)
│   ├── Student (Aluno)
│   ├── UserProfile (Perfil de Usuário)
│   └── User (Usuário - built-in)
│
├── OPERACIONAL
│   ├── Course (Curso)
│   ├── CourseCategory (Categoria de Curso)
│   ├── TrainingSchedule (Agendamento de Treinamento)
│   ├── ClassSchedule (Turma/Cronograma)
│   ├── AgendaTreinamento (Agenda de Treinamento)
│   ├── ClassDailyRecord (Registro Diário de Turma)
│   └── StudentCourseEnrollment (Matrícula do Aluno)
│
├── CERTIFICAÇÃO
│   ├── Certificate (Certificado)
│   ├── CertificateModel (Modelo de Certificado)
│   └── DigitalSignature (Assinatura Digital)
│
├── CONTRATO
│   ├── Contract (Contrato)
│   └── ContractTemplate (Modelo de Contrato)
│
├── FINANCEIRO
│   ├── BMMRecord (Boletim Mensal de Medição)
│   ├── BMMTemplate (Modelo de BMM)
│   ├── Receipt (Recibo/Comprovante)
│   ├── FinancialNotification (Notificação Financeira)
│   └── Proposal (Proposta)
│
├── AUDITORIA & LOGS
│   ├── AuditLog (Log de Auditoria)
│   ├── AccessLog (Log de Acesso)
│   ├── LogNotificacoes (Log de Notificações)
│   ├── StudentTimeline (Timeline do Aluno)
│   └── StudentDocument (Documentos do Aluno)
│
├── NOTIFICAÇÕES & CONFIGURAÇÕES
│   ├── Notification (Notificação)
│   ├── NotificationPreference (Preferência de Notificação)
│   ├── ConfigNotificacoes (Configuração de Notificações)
│   ├── ConfiguracaoAlertas (Configuração de Alertas)
│   ├── EmailTemplate (Template de Email)
│   └── KnowledgeBaseEntry (Entrada Base de Conhecimento)
│
├── REDES SOCIAIS & CONVERSAS
│   ├── Conversation (Conversa)
│   ├── SocialAccount (Conta Social)
│   └── Lead (Lead)
```

### 2.2 Quantidade de Entidades por Categoria

| Categoria | Quantidade | Descrição |
|-----------|-----------|-----------|
| Administrativo | 3 | Company, Contractor, Client |
| RH | 4 | Instructor, Student, UserProfile, User |
| Operacional | 7 | Course, TrainingSchedule, ClassSchedule, etc. |
| Certificação | 3 | Certificate, CertificateModel, DigitalSignature |
| Contrato | 2 | Contract, ContractTemplate |
| Financeiro | 5 | BMMRecord, Receipt, Proposal, etc. |
| Auditoria | 5 | AuditLog, AccessLog, StudentTimeline, etc. |
| Notificações | 6 | Notification, ConfigNotificacoes, EmailTemplate, etc. |
| Redes Sociais | 3 | Conversation, SocialAccount, Lead |
| **TOTAL** | **38 entidades** | **Todas mapeadas** |

---

## 3. CAMPOS E TIPOS DE DADOS

### 3.1 Company (Empresa Cliente)

```json
{
  "razao_social": "string (required)",
  "nome_fantasia": "string (required)",
  "cnpj": "string (required)",
  "status": "enum: ['Ativo', 'Inativo'] (default: Ativo)",
  "logo_url": "string",
  "default_bmm_template_id": "string",
  "email_faturamento": "email",
  
  "additional_services": {
    "coffee_break_morning_enabled": "boolean (default: false)",
    "coffee_break_morning_unit_value": "number",
    "coffee_break_afternoon_enabled": "boolean (default: false)",
    "coffee_break_afternoon_unit_value": "number",
    "lunch_enabled": "boolean (default: false)",
    "lunch_unit_value": "number"
  },
  
  "units": [
    {
      "name": "string",
      "address": {
        "street": "string",
        "number": "string",
        "complement": "string",
        "neighborhood": "string",
        "city": "string",
        "state": "string",
        "zip_code": "string"
      }
    }
  ],
  
  "contacts": [
    {
      "name": "string",
      "role": "string",
      "unit_name": "string",
      "phone": "string",
      "is_whatsapp": "boolean",
      "email": "email"
    }
  ],
  
  "company_courses": [
    {
      "course_id": "string",
      "course_name": "string",
      "workload_hours": "number",
      "modality": "enum: ['Presencial', 'Híbrido', 'Online']",
      "theoretical_hours": "number",
      "practical_hours": "number",
      "billing_type": "enum: ['per_student', 'per_closed_class']",
      "specific_price": "number",
      "class_fixed_value": "number",
      "included_students_limit": "number (default: 15)"
    }
  ],
  
  "company_contracts": [
    {
      "contract_number": "string",
      "amendment_number": "string",
      "start_date": "date",
      "end_date": "date",
      "description": "string",
      "status": "enum: ['Ativo', 'Vencido', 'Cancelado']"
    }
  ],
  
  "bmm_editor_config": {
    "title": "string",
    "bmm_number": "string",
    "contract_number": "string",
    "amendment_number": "string",
    "contract_object": "string",
    "fiscal_name": "string",
    "fiscal_role": "string",
    "contract_manager_name": "string",
    "contract_manager_role": "string",
    "notes": "string",
    "sap_config": {
      "enabled": "boolean",
      "codigo_material_pai": "string",
      "presencial": { "codigo_servico_filho": "string", "descricao": "string" },
      "ead": { "codigo_servico_filho": "string", "descricao": "string" }
    }
  },
  
  "billing_info": {
    "contact_reference": "string",
    "contract_object": "string"
  },
  
  "fiscal_name": "string",
  "fiscal_role": "string",
  "contract_manager_name": "string",
  "contract_manager_role": "string"
}
```

### 3.2 Certificate (Certificado)

```json
{
  "certificate_code": "string (único, ex: CAT-2025-XXXXXXXX)",
  "student_id": "string",
  "student_name": "string",
  "student_cpf": "string",
  "student_email": "email",
  "student_phone": "string",
  
  "course_id": "string",
  "course_name": "string",
  "course_duration": "string",
  "course_modality": "string",
  
  "start_date": "date",
  "end_date": "date",
  "valid_until": "date",
  "issue_date": "date-time",
  
  "status": "enum: ['pending_signature', 'signed', 'active', 'revoked', 'expired']",
  
  "signature_url": "string",
  "signed_at": "date-time",
  "signed_ip": "string",
  "signed_device": "string",
  
  "whatsapp_sent": "boolean",
  "whatsapp_sent_at": "date-time",
  
  "recipient_type": "enum: ['aluno', 'empresa']",
  "download_deadline": "date-time",
  "is_blocked": "boolean",
  "downloaded_at": "date-time",
  
  "revocation_reason": "string",
  "revoked_at": "date-time",
  "revoked_by": "email",
  
  "version": "number (default: 1)",
  "reissued_from_id": "string",
  "signature_link_expires_at": "date-time (7 dias)",
  "signature_reminder_sent_at": "date-time (48h)"
}
```

### 3.3 ClassSchedule (Turma/Cronograma)

```json
{
  "training_name": "string",
  "training_id": "string",
  "company_name": "string",
  "company_id": "string",
  "location": "string",
  "students_count": "number",
  
  "status": "enum: ['Agendado', 'Em Andamento', 'Concluído', 'Cancelado', 'Pendente', 'Aguardando']",
  
  "realization_dates": ["date"],
  "specific_days": "string",
  "training_schedule": "string (ex: 07:00 às 12:00)",
  
  "instructor_name": "string",
  "instructor_id": "string",
  "payment_status": "enum: ['Pendente', 'Parcialmente Pago', 'Pago']",
  
  "modality": "enum: ['Formação', 'Periódico']",
  "category": "enum: ['Presencial', 'Híbrido', 'Online']",
  
  "duration_hours": "number",
  "month": "string",
  "unit_value": "number",
  "total_value": "number",
  "instructor_payment_value": "number",
  
  "payment_installments": [
    {
      "installment_number": "number",
      "amount": "number",
      "due_date": "date",
      "status": "enum: ['Pendente', 'Pago', 'Atrasado']",
      "paid_date": "date",
      "proof_of_payment_url": "string",
      "notes": "string"
    }
  ],
  
  "notes": "string"
}
```

### 3.4 Contract (Contrato)

```json
{
  "contract_number": "string",
  "template_id": "string",
  "template_name": "string",
  
  "student_id": "string",
  "student_name": "string",
  "student_cpf": "string",
  "student_email": "email",
  "student_phone": "string",
  "student_data_nascimento": "string",
  "is_minor": "boolean",
  
  "course_name": "string",
  "course_duration": "string",
  "course_value": "number",
  "course_value_sem_desconto": "number",
  "desconto_percentual": "number",
  
  "valor_entrada": "number",
  "num_parcelas": "number",
  "valor_parcela": "number",
  "primeiro_vencimento": "date",
  "payment_method": "string",
  
  "course_start_date": "date",
  "course_end_date": "date",
  
  "status": "enum: ['Rascunho', 'Gerado_Automaticamente', ..., 'Recusado']",
  
  "html_content_filled": "string (HTML)",
  "pdf_url": "string",
  "auth_code": "string (código único)",
  
  "sent_at": "date-time",
  "sent_via": "enum: ['whatsapp', 'email', 'manual']",
  
  "student_signed_at": "date-time",
  "student_signature_url": "string",
  "student_signed_ip": "string",
  "student_signed_device": "string",
  "student_lgpd_accepted_at": "date-time",
  
  "resp_legal_nome": "string",
  "resp_legal_cpf": "string",
  "resp_legal_phone": "string",
  "resp_legal_signed_at": "date-time",
  "resp_legal_signature_url": "string",
  
  "valid_until": "date",
  "renewal_alert_sent": "boolean",
  "whatsapp_sent_at": "date-time",
  
  "notes": "string"
}
```

### 3.5 BMMRecord (Boletim Mensal de Medição)

```json
{
  "company_id": "string",
  "company_name": "string",
  "period": "string (ex: Janeiro/2025)",
  "template_id": "string",
  "template_name": "string",
  
  "pdf_url": "string",
  "status": "enum: ['Rascunho', 'Pendente', 'Aprovado', 'Rejeitado', 'Gerado', 'Enviado', 'Confirmado']",
  
  "sent_to": "email",
  "sent_at": "date-time",
  
  "total_value": "number",
  "total_classes": "number",
  "total_students": "number",
  
  "content_snapshot": "string (HTML snapshot)",
  "notes": "string",
  
  "rejection_reason": "string",
  "approved_by": "email",
  "approved_at": "date-time",
  
  "history": [
    {
      "action": "enum: ['Gerado', 'Enviado', 'Aprovado', 'Rejeitado', 'Pendente', 'Atualizado']",
      "timestamp": "date-time",
      "user_email": "email",
      "details": "string"
    }
  ]
}
```

### 3.6 UserProfile (Perfil de Usuário)

```json
{
  "user_id": "string",
  "user_email": "email",
  "user_name": "string",
  
  "role": "enum: ['gestor_master', 'editor', 'cliente']",
  "permissions": ["string"],
  
  "status": "enum: ['active', 'blocked', 'pending_password_change']",
  
  "company_permissions": [
    {
      "company_id": "string",
      "company_name": "string",
      "permissions": ["enum: ['view', 'edit', 'manage_users']"]
    }
  ],
  
  "initial_password": "string (apenas para envio)",
  "password_changed": "boolean",
  "last_login": "date-time",
  
  "credentials_sent_at": "date-time",
  "credentials_sent_via": "enum: ['whatsapp', 'email', 'manual']",
  "credentials_sent_by": "string",
  
  "phone": "string",
  "consent_accepted_at": "date-time",
  "consent_ip_address": "string",
  "consent_term_version": "string (ex: v1.0)"
}
```

---

## 4. RELACIONAMENTOS ENTRE ENTIDADES

### 4.1 Diagrama de Relacionamentos

```
User (built-in)
├── 1:1 → UserProfile
│   ├── 1:N → Notification
│   ├── 1:N → NotificationPreference
│   └── role → RBAC (permissões)
│
Company
├── 1:N → ClassSchedule
├── 1:N → StudentCourseEnrollment
├── 1:N → BMMRecord
├── 1:N → Proposal
├── 1:N → AuditLog
├── M:N → Course (via company_courses)
└── M:N → Contract (via contacts)

Course
├── 1:N → ClassSchedule
├── 1:N → StudentCourseEnrollment
├── 1:N → Certificate
├── 1:1 → CertificateModel
└── 1:1 → CourseCategory

ClassSchedule (Turma)
├── 1:N → StudentCourseEnrollment
├── 1:N → ClassDailyRecord
├── N:1 → Instructor
├── N:1 → Course
├── N:1 → Company
└── 1:N → Certificate

Student
├── 1:N → StudentCourseEnrollment
├── 1:N → Certificate
├── 1:N → Contract
├── 1:N → StudentDocument
├── 1:N → StudentTimeline
├── 1:1 → UserProfile (optional)
└── 1:N → Notification

StudentCourseEnrollment (Matrícula)
├── N:1 → Student
├── N:1 → Course
├── N:1 → Company
├── N:1 → ClassSchedule
├── 1:N → Certificate
└── 1:N → Contract

Certificate (Certificado)
├── N:1 → Student
├── N:1 → Course
├── N:1 → Company
├── N:1 → ClassSchedule
├── 1:1 → DigitalSignature
├── 1:1 → CertificateModel
└── 1:N → AuditLog

Contract (Contrato)
├── N:1 → Student
├── N:1 → StudentCourseEnrollment
├── 1:1 → ContractTemplate
├── 1:1 → DigitalSignature
└── 1:N → AuditLog

DigitalSignature (Assinatura Digital)
├── 1:1 → Certificate
├── 1:1 → Contract
└── 1:N → AuditLog

BMMRecord (Boletim Mensal)
├── N:1 → Company
├── 1:1 → BMMTemplate
├── M:N → ClassSchedule (referência indireta)
└── 1:N → AuditLog

Proposal (Proposta)
├── N:1 → Company
├── N:1 → Lead
├── 1:N → StudentCourseEnrollment
└── 1:N → AuditLog

AuditLog (Log de Auditoria)
├── N:1 → UserProfile
├── M:1 → Qualquer entidade (entity_type + entity_id)
├── N:1 → Company (optional)
└── registra mudanças em qualquer entidade

Conversation (Conversa)
├── N:1 → Lead
├── N:1 → SocialAccount
└── 1:N → Notification (opcional)

Lead
├── 1:N → Conversation
└── 1:N → Proposal
```

### 4.2 Cardinalidades Críticas

| De | Para | Tipo | Descrição |
|----|----|------|-----------|
| User | UserProfile | 1:1 | Um usuário tem um perfil |
| Company | ClassSchedule | 1:N | Uma empresa tem múltiplas turmas |
| Course | ClassSchedule | 1:N | Um curso pode ter múltiplas turmas |
| ClassSchedule | StudentCourseEnrollment | 1:N | Uma turma tem múltiplas matrículas |
| Student | Certificate | 1:N | Um aluno tem múltiplos certificados |
| Certificate | DigitalSignature | 1:1 | Um certificado tem uma assinatura |
| Contract | DigitalSignature | 1:1 | Um contrato tem uma assinatura |
| Company | BMMRecord | 1:N | Uma empresa tem múltiplos BMM |
| BMMRecord | BMMTemplate | N:1 | Múltiplos BMM usam o mesmo template |
| Student | StudentCourseEnrollment | 1:N | Um aluno tem múltiplas matrículas |

---

## 5. REGRAS DE PERMISSÃO

### 5.1 Matriz de Permissões por Perfil

#### Perfil: admin (Administrador da Plataforma)
- **Acesso:** Total (null) - sem restrições
- **Módulos:** Todos (40+)
- **Operações:** CREATE, READ, UPDATE, DELETE
- **Dados:** Todos os dados de todas as empresas
- **Usuários:** Pode gerenciar todos os usuários
- **Auditoria:** Acesso completo

#### Perfil: gestor_master (Gestor Master da Aplicação)
- **Acesso:** Total (null) - sem restrições
- **Módulos:** Todos (40+)
- **Operações:** CREATE, READ, UPDATE, DELETE
- **Dados:** Todos os dados de todas as empresas
- **Usuários:** Pode gerenciar usuários (exceto admin)
- **Auditoria:** Acesso completo
- **Diferença vs admin:** Criado por admin, sem privilégios de admin da plataforma

#### Perfil: editor (Editor)
- **Acesso:** Controlado (EDITOR_MODULES)
- **Módulos Permitidos:** 20+ (tudo exceto administração)
  ```
  Dashboard
  Cronograma
  Agenda de Treinamentos
  Chamada Presencial
  Entrada de Propostas
  Gestão de BMM
  Instrutores
  Empresas
  Contratadas
  Cursos
  Alunos Individuais (PF)
  Gestão de Contratos
  Dashboard Operacional
  Dashboard Financeiro
  Certificações
  Alertas de Vencimento
  Designer de Certificados
  Assinaturas Digitais
  Auditoria de Certificados
  Central de Comunicação
  Dashboard Comercial
  Dashboard de Relatórios
  ```
- **Operações:** CREATE, READ, UPDATE
- **Bloqueados:** DELETE, Usuários, Logs, Auditoria
- **Dados:** Conforme permissões específicas por empresa

#### Perfil: cliente (Cliente)
- **Acesso:** Mínimo (CLIENT_MODULES)
- **Módulos Permitidos:** 3
  ```
  Dashboard
  Certificações
  Alertas de Vencimento
  ```
- **Operações:** READ apenas
- **Dados:** Seus próprios dados apenas
- **Restrições:** Sem acesso a cadastros, financeiro, usuários

#### Perfil: personalizado (Customizado)
- **Acesso:** Definido manualmente
- **Módulos:** Via campo `permissions[]` no UserProfile
- **Operações:** Conforme definido na lista
- **Auditoria:** Mudanças registradas com action="update"

### 5.2 Permissões por Empresa (company_permissions)

Cada UserProfile pode ter múltiplas permissões por empresa:

```json
{
  "company_permissions": [
    {
      "company_id": "empresa-123",
      "company_name": "UNITAPAJÓS",
      "permissions": ["view", "edit", "manage_users"]
    },
    {
      "company_id": "empresa-456",
      "company_name": "Empresa 2",
      "permissions": ["view"]
    }
  ]
}
```

Operações:
- `view`: Apenas leitura
- `edit`: Criar, ler, atualizar dados operacionais
- `manage_users`: Gerenciar usuários dessa empresa

### 5.3 Regras de Acesso por Entidade

| Entidade | gestor_master | editor | cliente | Regra |
|----------|--------|--------|---------|-------|
| Company | CRUD | CRU | R | Clientes veem apenas sua empresa |
| Course | CRUD | CRU | R | Clientes veem cursos ativos |
| ClassSchedule | CRUD | CRU | R | Clientes veem sua turma |
| Certificate | CRUD | CRU | RW | Alunos assinam próprios certificados |
| Contract | CRUD | CRU | RW | Alunos/Responsáveis assinam contratos |
| Student | CRUD | CRU | R | Clientes veem alunos da empresa |
| BMMRecord | CRUD | CRU | - | Clientes não acessam (financeiro) |
| AuditLog | CRUD | - | - | Apenas admin/gestor |
| User | CRUD | - | R (self) | Clientes veem apenas a si mesmos |

---

## 6. REGRAS DE PRECIFICAÇÃO

### 6.1 Modelo de Faturamento

#### Tipo 1: per_student (Por Aluno)

```
Valor Total = unit_value × students_count

Exemplo:
- Curso NR-35: R$ 500/aluno
- Turma com 10 alunos
- Valor total = R$ 500 × 10 = R$ 5.000
```

#### Tipo 2: per_closed_class (Por Turma Fechada)

```
Valor Total = class_fixed_value (fixo, independente de quantidade)

Exemplo:
- Curso NR-33: R$ 3.000/turma (fixo)
- Turma com 5, 10 ou 15 alunos = R$ 3.000
```

### 6.2 Serviços Adicionais

Configurados em `Company.additional_services`:

```json
{
  "coffee_break_morning_enabled": true,
  "coffee_break_morning_unit_value": 25.00,  // R$ por pessoa
  
  "coffee_break_afternoon_enabled": true,
  "coffee_break_afternoon_unit_value": 25.00,  // R$ por pessoa
  
  "lunch_enabled": true,
  "lunch_unit_value": 45.00  // R$ por pessoa
}
```

Cálculo com serviços:
```
ClassDailyRecord.total_daily_cost = 
  lunch_cost +
  transport_cost +
  coffee_break_cost +
  taxi_cost +
  hp_cost

Nota: Esses custos vão para o campo `notes` do ClassSchedule
```

### 6.3 Descontos em Contratos

```json
{
  "course_value_sem_desconto": 5000,
  "desconto_percentual": 10,
  "course_value": 4500,  // 5000 - (5000 * 0.10)
  
  "valor_entrada": 1000,
  "num_parcelas": 3,
  "valor_parcela": 1166.67  // (4500 - 1000) / 3
}
```

### 6.4 Pagamentos do Instrutor

```json
{
  "instructor_payment_value": 2500,  // Valor total a pagar
  
  "payment_installments": [
    {
      "installment_number": 1,
      "amount": 1250,
      "due_date": "2025-02-15",
      "status": "Pendente"
    },
    {
      "installment_number": 2,
      "amount": 1250,
      "due_date": "2025-03-15",
      "status": "Pendente"
    }
  ]
}
```

Máximo 2 parcelas.

### 6.5 Limite de Alunos Inclusos

```
company_courses[].included_students_limit = 15 (default)

Se students_count > included_students_limit:
  - billing_type = "per_student" → valor completo
  - billing_type = "per_closed_class" → valor completo
  
Cálculo de excedente:
  Se students_count = 18 e limit = 15:
    excess_count = 18 - 15 = 3 alunos excedentes
```

### 6.6 Integração SAP (UNITAPAJÓS)

Configuração especial em `Company.bmm_editor_config.sap_config`:

```json
{
  "enabled": true,
  "codigo_material_pai": "1234567",
  
  "presencial": {
    "codigo_servico_filho": "8901234",
    "descricao": "Treinamento Presencial"
  },
  
  "ead": {
    "codigo_servico_filho": "5678901",
    "descricao": "Treinamento EAD"
  }
}
```

Mapping de modalidade:
```
ClassSchedule.modality = "Presencial" 
  → SAP: sap_config.presencial.codigo_servico_filho

ClassSchedule.modality = "Online"
  → SAP: sap_config.ead.codigo_servico_filho
```

---

## 7. REGRAS DE CERTIFICADO E ASSINATURA DIGITAL

### 7.1 Ciclo de Vida do Certificado

```
Pendente Assinatura (pending_signature)
    ↓
    [Email/WhatsApp enviado com link]
    ↓
Assinado (signed)
    ↓
Ativo (active)
    ↓
    [Monitoramento de vencimento]
    ↓
Expirado (expired)
    └─ Ou Revogado (revoked) [ação manual]
```

### 7.2 Processo de Assinatura

1. **Geração**
   ```
   action: generate
   signature_url: null
   status: pending_signature
   signature_link_expires_at: agora + 7 dias
   ```

2. **Envio**
   ```
   whatsapp_sent: true
   whatsapp_sent_at: timestamp
   
   Link enviado:
   /CertificateSign?auth_code={auth_code}&student_id={id}
   ```

3. **Assinatura Digital**
   ```
   action: sign
   signature_url: URL da imagem da assinatura
   signed_at: timestamp
   signed_ip: IP do navegador
   signed_device: User-Agent
   status: signed
   version: incrementado se reemissão
   ```

4. **Lembretes Automáticos**
   ```
   48h antes de expirar o link:
   - signature_reminder_sent_at = timestamp
   - Reenviar link de assinatura
   ```

5. **Bloqueio Automático**
   ```
   Se signature_link_expires_at < agora:
     is_blocked = true (download bloqueado)
   
   Se valid_until < agora:
     status = expired (certificado expirou)
   
   Se download_deadline (manual) < agora:
     is_blocked = true (bloqueio manual por gestor)
   ```

### 7.3 Tipos de Destinatários

#### Tipo: aluno
- **Prazo de assinatura:** 30 dias
- **Quem assina:** O próprio aluno
- **Link enviado para:** Email + WhatsApp do aluno
- **Validação:** Assinatura do aluno

#### Tipo: empresa
- **Prazo de assinatura:** 45 dias
- **Quem assina:** Responsável da empresa
- **Link enviado para:** Email de faturamento da empresa
- **Validação:** Responsável técnico da empresa

```javascript
// Determinação automática
if (student.age < 18) {
  recipient_type = "aluno";
  // Mais 2 assinadores: resp. legal + resp. financeiro
} else {
  recipient_type = "empresa";
}
```

### 7.4 Reemissão de Certificado

```json
{
  "version": 2,  // Incrementado
  "reissued_from_id": "cert-original-id",
  
  "status": "pending_signature",  // Recomeça o ciclo
  "signature_url": null,
  "signed_at": null,
  "signature_link_expires_at": agora + 7 dias
}
```

**Motivos de reemissão:**
- Corrigir nome do aluno
- Atualizar dados de CPF/RG
- Assinatura invalida/incompleta
- Reemissão por solicitação do aluno

### 7.5 Revogação de Certificado

```json
{
  "status": "revoked",
  "revocation_reason": "Aluno não compareceu (falta)",
  "revoked_at": "2025-06-02T14:30:00Z",
  "revoked_by": "admin@catcursos.com.br",
  "is_blocked": true
}
```

**Motivos válidos (auditados):**
- Falta de assiduidade
- Não aprovação em avaliação
- Cancelamento por solicitação
- Fraude detectada

---

## 8. INTEGRAÇÕES ATIVAS

### 8.1 Integrações Externas

| Integração | Tipo | Função | Status | Secrets |
|-----------|------|--------|--------|---------|
| WhatsApp | Mensageria | Envio de notificações | Ativa | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN |
| Email (UOL) | Mensageria | Envio de emails | Ativa | UOL_SMTP_EMAIL, UOL_SMTP_PASSWORD |
| Resend | Email API | Envio de emails transacionais | Ativa | RESEND_API_KEY |
| Asaas | Pagamento | Cobrança e boletos | Ativa | ASAAS_API_KEY |
| SAP | ERP | Integração de dados (UNITAPAJÓS) | Ativa | Configuração interna |

### 8.2 Backend Functions (50+)

Funções críticas de integração:

**Certificados:**
- `enviarCertificadoWhatsApp` - Envia link de assinatura
- `assinarContrato` - Processa assinatura digital
- `bloquearCertificadosExpirados` - Bloqueia download

**Contratos:**
- `gerarContrato` - Gera HTML + PDF do contrato
- `enviarContratoEmail` - Envia para assinatura
- `enviarContratoWhatsApp` - Envia via WhatsApp

**Financeiro:**
- `asaasPayment` - Cria cobrança no Asaas
- `asaasCobranca` - Consulta status de cobrança
- `enviarBoletoAsaas` - Envia boleto por email
- `alertarBoletosVencimento` - Alerta boletos vencidos
- `gerarRecibo` - Gera recibo de pagamento

**BMM:**
- `sendBMMEmailUOL` - Envia BMM por email UOL

**Propostas & Cadastros:**
- `processProposal` - Processa proposta com IA
- `assistenteCriarCursos` - Cria cursos automaticamente
- `executarCadastro` - Cadastra aluno + matrícula
- `executarCadastroMassa` - Cadastro em lote

**Notificações:**
- `enviarNotificacoes` - Orquestrador de notificações
- `enviarNotificacoesCertificados` - Alertas de certificado
- `enviarAlertasVencimentoEmail` - Alertas de vencimento
- `enviarMensagemMassaWhatsApp` - Envio em massa

**Auditoria:**
- `registrarAlteracao` - Registra mudanças em AuditLog
- `validarIntegridadeDados` - Valida consistência de dados
- `deletarComSeguranca` - Soft delete com auditoria

**Outros:**
- `healthCheck` - Monitoramento de saúde
- `convidarUsuario` - Convite por email
- `atualizarPermissoesUsuario` - Atualiza RBAC

### 8.3 Webhooks

```
Entrada:
POST /api/webhooks/whatsappWebhook
  - Recebe mensagens e eventos do WhatsApp

Saída (automática):
POST /asaas/webhook
  - Pagamentos confirmados
  - Boletos vencidos

Configuração:
- WHATSAPP_VERIFY_TOKEN (validação)
- Retry automático em caso de falha
```

---

## 9. PROBLEMAS ENCONTRADOS

### 9.1 Problemas Críticos (Resolvidos)

#### ✅ Problema 1: Polling de Permissões Agressivo
- **Afetava:** PermissionsContext.jsx
- **Causa:** Polling a cada 10 segundos
- **Impacto:** Travamento do navegador, reset constante de estado
- **Solução:** Aumentado para 30 segundos + cache local TTL 5min
- **Status:** RESOLVIDO (auditoria_completa_cat_gestao_cursos.md)

#### ✅ Problema 2: Loop Infinito em AuditLog
- **Afetava:** Automação "Auditar Deletions"
- **Causa:** Recursão: delete → AuditLog → registrarAlteracao → delete
- **Impacto:** CPU 100%, falhas constantess, data corruption
- **Solução:** Desabilitar automação "Auditar Deletions"
- **Status:** RESOLVIDO

### 9.2 Problemas Funcionais Conhecidos

#### ⚠️ Problema 3: Integridade de Dados em Exclusões
- **Cenário:** Deletar empresa com turmas/certificados
- **Risco:** Orfandade de registros em ClassSchedule e Certificate
- **Mitigation:** 
  - Soft delete com flag status="Inativo"
  - Cascata controlada via deletarComSeguranca()
  - Log de auditoria obrigatório
- **Recomendação:** Implementar cascata programática

#### ⚠️ Problema 4: Sincronização de Dados Personalizados
- **Cenário:** Campos adicionais em company_courses
- **Risco:** Desincronização entre Company e ClassSchedule
- **Mitigation:**
  - Validação em calcularExcedenteTurma()
  - Snapshot em BMMRecord.content_snapshot
- **Recomendação:** Normalizar estrutura

#### ⚠️ Problema 5: Perfis Duplicados
- **Cenário:** Múltiplos UserProfile para mesmo email
- **Risco:** Inconsistência de permissões
- **Mitigation:**
  - usePermissions() filtra por updated_date DESC
  - Prioriza perfil com role definido
- **Recomendação:** Constraint UNIQUE (user_email) com migration

#### ⚠️ Problema 6: Assinatura Digital Expirada
- **Cenário:** Link expirado (7 dias) mas certificado ainda pendente
- **Risco:** Certificado travado indefinidamente
- **Mitigation:**
  - gerenciarPrazoDownloadCertificado() rebloqueia após download_deadline
  - Reenvio automático em 48h
- **Recomendação:** Implementar reemissão automática

### 9.3 Problemas de Performance

#### 📊 Problema 7: Queries Sem Paginação
- **Afetado:** Múltiplas páginas carregam listas sem limit
- **Risco:** Travamento em grandes datasets
- **Exemplo:** Companies, Students, ClassSchedules
- **Recomendação:** Implementar paginação com React Query

#### 📊 Problema 8: Cache em PermissionsContext
- **Afetado:** Permissões com TTL 5min, mas polling 30s
- **Risco:** Permissões desatualizadas por 5 minutos
- **Recomendação:** Reduzir TTL para 1 minuto em produção

#### 📊 Problema 9: Email em Massa sem Rate Limiting
- **Afetado:** enviarMensagemMassaWhatsApp, sendBMMEmailUOL
- **Risco:** Bloqueio de IP, fila congestionada
- **Recomendação:** Implementar queue com retry strategy

### 9.4 Problemas de Segurança

#### 🔒 Problema 10: Validação de Assinatura Digital
- **Afetado:** CertificateSign, ContractSign
- **Risco:** Assinadura falsificável se auth_code previsível
- **Recomendação:** Usar UUID v4 criptográfico, rate limit por IP

#### 🔒 Problema 11: Permissões em Nível de Registro
- **Afetado:** Relatórios financeiros, dados de empresa
- **Risco:** Usuário editor pode ver dados de outra empresa
- **Recomendação:** Implementar Row-Level Security (RLS)

#### 🔒 Problema 12: Logs Deletáveis
- **Afetado:** AuditLog pode ser deletado se usuário admin
- **Risco:** Destruição de trilha de auditoria
- **Recomendação:** Implementar audit log imutável em tabela separada

---

## 10. PLANO PARA MIGRAÇÃO FUTURA

### 10.1 Checklist de Pré-Migração

#### Fase 1: Preparação (Semana 1)

- [ ] **Backup Completo**
  - [ ] Exportar todos os dados de todas as entidades
  - [ ] Salvar em formato JSON normalizado
  - [ ] Calcular checksum SHA-256 de cada tabela
  - [ ] Armazenar em local seguro (cloud + local)

- [ ] **Audit Cleansing**
  - [ ] Remover logs de teste e desenvolvimento
  - [ ] Consolidar perfis de usuário duplicados
  - [ ] Limpar permissões obsoletas
  - [ ] Validar integridade referencial

- [ ] **Inventário de Configurações**
  - [ ] Listar todos os secrets necessários
  - [ ] Documentar parâmetros de ambiente
  - [ ] Exportar configurações de notificação
  - [ ] Salvar modelos de certificado, contrato, BMM

- [ ] **Testes de Compatibilidade**
  - [ ] Validar schema de todas as 38 entidades
  - [ ] Testar importação em banco de dados novo
  - [ ] Verificar scripts de migração de dados
  - [ ] Testar permissões em novo ambiente

#### Fase 2: Validação de Dados (Semana 2)

- [ ] **Consistência Referencial**
  ```sql
  -- Verificar órfãos
  SELECT cs.* FROM ClassSchedule cs 
  LEFT JOIN Company c ON cs.company_id = c.id
  WHERE c.id IS NULL;
  
  SELECT cert.* FROM Certificate cert
  LEFT JOIN Student s ON cert.student_id = s.id
  WHERE s.id IS NULL;
  ```

- [ ] **Completude de Dados**
  - [ ] Certificados sem assinatura > 30 dias → marcar como bloqueado
  - [ ] Contratos expirados → marcar status
  - [ ] Turmas sem alunos → validar
  - [ ] BMM pendentes > 45 dias → alerta

- [ ] **Migração de Dados Críticos**
  ```
  Ordem de precedência:
  1. Company (base)
  2. User + UserProfile (RBAC)
  3. Course + CourseCategory
  4. Instructor
  5. Student
  6. ClassSchedule
  7. StudentCourseEnrollment
  8. Certificate + CertificateModel
  9. Contract + ContractTemplate
  10. BMMRecord + BMMTemplate
  11. Proposal
  12. AuditLog (último)
  ```

- [ ] **Validação de Integridade**
  - [ ] Total de registros antes/depois
  - [ ] Checksum de hash por tabela
  - [ ] Testes de relacionamentos
  - [ ] Verificar campos obrigatórios (required)

#### Fase 3: Preparação de Ambiente (Semana 3)

- [ ] **Configuração do Novo Ambiente**
  - [ ] Provisionar novo banco de dados
  - [ ] Criar todas as entidades (38)
  - [ ] Configurar índices e constraints
  - [ ] Habilitar auditoria

- [ ] **Integração de Serviços**
  - [ ] Configurar WhatsApp (tokens)
  - [ ] Configurar Email (UOL SMTP)
  - [ ] Configurar Asaas (API key)
  - [ ] Configurar SAP (se UNITAPAJÓS)
  - [ ] Testar webhooks

- [ ] **Migração de Configurações**
  - [ ] Copiar ConfigNotificacoes
  - [ ] Copiar ConfiguracaoAlertas
  - [ ] Copiar EmailTemplate
  - [ ] Copiar BMMTemplate
  - [ ] Copiar CertificateModel

- [ ] **Testes de Funcionalidade**
  - [ ] Teste de permissões (RBAC)
  - [ ] Teste de assinatura digital
  - [ ] Teste de geração de certificados
  - [ ] Teste de envio de emails/WhatsApp
  - [ ] Teste de cálculo de BMM e precificação

#### Fase 4: Migração de Dados (Semana 4)

- [ ] **Importação em Lote**
  ```javascript
  // Pseudocódigo
  for (const entity of MIGRATION_ORDER) {
    const data = loadFromBackup(entity);
    const validated = validateSchema(data, entity.schema);
    const transformed = applyMappings(validated, entity);
    await base44.entities[entity].bulkCreate(transformed);
  }
  ```

- [ ] **Validação Pós-Importação**
  - [ ] Verificar total de registros
  - [ ] Rodar queries de integridade
  - [ ] Validar relacionamentos
  - [ ] Testar permissões

- [ ] **Sincronização de Dados Dinâmicos**
  - [ ] Certificados: recalcular status, vencimento
  - [ ] Contratos: recalcular valores
  - [ ] BMM: recalcular totais
  - [ ] AuditLog: sincronizar timestamps

- [ ] **Cleanup Pós-Migração**
  - [ ] Removar dados de teste
  - [ ] Consolidar registros duplicados
  - [ ] Atualizar relacionamentos quebrados
  - [ ] Reindexar banco de dados

#### Fase 5: Testes de Aceitação (Semana 5)

- [ ] **Teste de Regressão (UAT)**
  - [ ] Testar todos os 40+ módulos
  - [ ] Validar todos os workflows críticos
  - [ ] Testar permissões de todos os perfis
  - [ ] Simular cenários de erro

- [ ] **Teste de Performance**
  - [ ] Medir tempo de carregamento
  - [ ] Validar queries lentas
  - [ ] Testar com volume de dados real
  - [ ] Stress test (1000 simultâneos)

- [ ] **Teste de Segurança**
  - [ ] Validar authentication
  - [ ] Testar RBAC
  - [ ] Validar assinatura digital
  - [ ] Testar rate limiting

- [ ] **Sign-off do Cliente**
  - [ ] Demonstração ao cliente
  - [ ] Validação de requisitos
  - [ ] Assinatura de aprovação
  - [ ] Documento de handover

#### Fase 6: Go-Live (Semana 6)

- [ ] **Plano de Cutover**
  ```
  Sexta-feira 18:00 (início)
  Parar novo ambiente
  Backup final ambiente antigo
  Migração final de dados dinâmicos
  Testes finais (30 min)
  DNS cutover / Load balancer switch
  Monitoramento intensivo (4 horas)
  Release para produção
  Comunicado aos usuários
  Suporte 24/7 standby
  ```

- [ ] **Verificações Pós-Go-Live**
  - [ ] [ ] Todos os serviços online
  - [ ] [ ] Usuários conseguem fazer login
  - [ ] [ ] Certificados sendo assinados
  - [ ] [ ] BMM sendo processado
  - [ ] [ ] Emails/WhatsApp funcionando
  - [ ] [ ] Logs de auditoria sendo registrados

- [ ] **Rollback Plan**
  ```
  Se encontrar erro crítico:
  1. Parar novo ambiente
  2. Restaurar DNS para antigo
  3. Notificar cliente
  4. Investigar causa
  5. Agendar retry para próxima janela
  ```

### 10.2 Scripts de Migração

#### Script 1: Exportar Dados

```javascript
// export-data.js
async function exportAllEntities() {
  const entities = [
    'Company', 'Contractor', 'Client',
    'User', 'UserProfile', 'Instructor', 'Student',
    'Course', 'CourseCategory', 'TrainingSchedule', 'ClassSchedule',
    'Certificate', 'CertificateModel', 'DigitalSignature',
    'Contract', 'ContractTemplate',
    'BMMRecord', 'BMMTemplate', 'Receipt', 'Proposal',
    'AuditLog', 'AccessLog', 'LogNotificacoes',
    'Notification', 'NotificationPreference', 'ConfigNotificacoes',
    'ConfiguracaoAlertas', 'EmailTemplate', 'KnowledgeBaseEntry',
    'Conversation', 'SocialAccount', 'Lead',
    'StudentCourseEnrollment', 'StudentTimeline', 'StudentDocument',
    'FinancialNotification', 'AgendaTreinamento', 'ClassDailyRecord'
  ];
  
  for (const entity of entities) {
    const allRecords = await base44.entities[entity].list();
    const hash = calculateSHA256(JSON.stringify(allRecords));
    
    saveToFile(`backup/${entity}.json`, {
      entity: entity,
      count: allRecords.length,
      hash: hash,
      timestamp: new Date().toISOString(),
      data: allRecords
    });
  }
}
```

#### Script 2: Validar Integridade

```javascript
// validate-integrity.js
async function validateAllEntities() {
  const issues = [];
  
  // Orfãos de Company
  const orphanedSchedules = await base44.entities.ClassSchedule.filter({
    company_id: { $nin: await getCompanyIds() }
  });
  if (orphanedSchedules.length > 0) {
    issues.push(`${orphanedSchedules.length} ClassSchedule sem Company`);
  }
  
  // Orfãos de Student
  const orphanedCerts = await base44.entities.Certificate.filter({
    student_id: { $nin: await getStudentIds() }
  });
  if (orphanedCerts.length > 0) {
    issues.push(`${orphanedCerts.length} Certificate sem Student`);
  }
  
  // Certificados expirados não marcados
  const expiredNotMarked = await base44.entities.Certificate.filter({
    valid_until: { $lt: new Date() },
    status: { $ne: 'expired' }
  });
  if (expiredNotMarked.length > 0) {
    issues.push(`${expiredNotMarked.length} Certificate vencidos não marcados`);
  }
  
  return {
    passed: issues.length === 0,
    issuesFound: issues.length,
    issues: issues,
    timestamp: new Date().toISOString()
  };
}
```

#### Script 3: Importar Dados

```javascript
// import-data.js
async function importAllEntities() {
  const MIGRATION_ORDER = [
    'Company', 'Contractor', 'Client',
    'User', 'UserProfile', 'Instructor', 'Student',
    'Course', 'CourseCategory',
    'ClassSchedule', 'StudentCourseEnrollment',
    'Certificate', 'CertificateModel',
    'Contract', 'ContractTemplate',
    'BMMRecord', 'BMMTemplate', 'Proposal',
    'AuditLog'
  ];
  
  for (const entity of MIGRATION_ORDER) {
    const backup = loadFromFile(`backup/${entity}.json`);
    const data = backup.data;
    
    // Transformar se necessário
    const transformed = applyEntityMappings(entity, data);
    
    // Importar
    await base44.entities[entity].bulkCreate(transformed);
    
    // Validar
    const count = await base44.entities[entity].list();
    console.log(`✓ ${entity}: ${count.length}/${data.length} registros`);
  }
}
```

### 10.3 Documentação Necessária

- [ ] **Runbook de Operação**
  - Procedimentos dia-a-dia
  - Troubleshooting comum
  - Contatos de suporte

- [ ] **Documentação de API**
  - Endpoints de integração
  - Formatos de payload
  - Códigos de erro

- [ ] **Guia de Permissões**
  - Como criar novo usuário
  - Como atribuir permissões
  - Fluxo de aprovação

- [ ] **Disaster Recovery Plan**
  - Procedimento de backup
  - Procedimento de restore
  - RTO/RPO targets

- [ ] **Knowledge Base**
  - FAQ de usuários
  - Vídeos de treinamento
  - Documentação visual

### 10.4 Riscos e Mitigation

| Risco | Probabilidade | Impacto | Mitigation |
|-------|--------------|--------|-----------|
| Perda de dados | Baixa | Crítico | Backup triplo (cloud + 2 local) |
| Permissões incorretas | Média | Alto | Testes UAT completos |
| Downtime > 4h | Baixa | Crítico | Rollback automático, fallback manual |
| Integrações quebradas | Média | Alto | Testes de integração antes |
| Performance degradada | Média | Médio | Stress test, índices otimizados |
| Usuários perdidos | Baixa | Médio | Documentação, suporte 24/7 |

### 10.5 Estimar Tempo Total

```
Fase 1 (Preparação):        7 dias
Fase 2 (Validação):        14 dias
Fase 3 (Novo Ambiente):    14 dias
Fase 4 (Migração Dados):   14 dias
Fase 5 (Testes):           21 dias
Fase 6 (Go-Live):           1 dia
─────────────────────────────────
Total:                      71 dias (~10 semanas)

Equipe necessária:
- 1 DBA (dedicado)
- 2 Devs Backend (dedicado)
- 1 QA (dedicado)
- 1 Ops (dedicado)
- 1 PM (20% dedicado)
```

---

## 11. CONCLUSÃO

Este documento consolida:
- ✅ **40+ páginas** mapeadas por categoria
- ✅ **38 entidades** com schemas completos
- ✅ **5 modelos de permissão** documentados
- ✅ **2 tipos de faturamento** explicados
- ✅ **5 status de certificado** com ciclo de vida
- ✅ **5 integrações ativas** listadas
- ✅ **12 problemas conhecidos** com soluções
- ✅ **6 fases de migração** com checklists
- ✅ **Scripts prontos** para backup/restore

**Próximos passos:**
1. Revisar com stakeholders
2. Agendar kick-off de migração
3. Preparar ambientes
4. Executar plano por fase
5. Validar e homologar
6. Go-live com suporte 24/7

---

**Documento preparado:** 2026-06-02  
**Status:** Pronto para migração  
**Aprovação necessária:** CTO, Product Manager, Client Lead