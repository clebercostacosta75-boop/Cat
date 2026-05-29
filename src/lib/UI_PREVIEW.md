# Preview da Interface do Novo Sistema de Cobrança

## Formulário de Cursos Personalizados - Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  📚 4. Cursos e Contratos da Empresa                               │
│                                                                       │
│  [📂 Cursos Personalizados] [📋 Contratos]                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 📁 Upload em Massa | Baixar Modelo                              │ │
│  │ Descrição: Importe múltiplos cursos de uma vez                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Curso 1                                           [❌ Remover]   │ │
│  │                                                                   │ │
│  │ 📚 Curso *                                                      │ │
│  │ [Selecione o curso ▼]                                          │ │
│  │                                                                   │ │
│  │ ⏱️ Carga Horária Total (horas) *               📋 Modalidade *  │ │
│  │ [____] (Ex: 8)                         [Presencial ▼]          │ │
│  │                                                                   │ │
│  │ 🔄 Tipo de Cobrança *                                          │ │
│  │ [💰 Valor unitário por aluno ▼]                               │ │
│  │                                                                   │ │
│  │ ─────────────────────────────────────────────────────────────  │ │
│  │ 💰 Cobrança por Aluno                                         │ │
│  │                                                                   │ │
│  │ 💵 Valor Unitário por Aluno (R$) *                            │ │
│  │ [____] (Ex: 150.00)                                            │ │
│  │ ℹ️ Valor total = Valor unitário × Quantidade de alunos         │ │
│  │                                                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Curso 2                                           [❌ Remover]   │ │
│  │                                                                   │ │
│  │ 📚 Curso *                                                      │ │
│  │ [Selecione o curso ▼]                                          │ │
│  │                                                                   │ │
│  │ ⏱️ Carga Horária Total (horas) *               📋 Modalidade *  │ │
│  │ [____] (Ex: 8)                         [Híbrido ▼]             │ │
│  │                                                                   │ │
│  │ 🔄 Tipo de Cobrança *                                          │ │
│  │ [📦 Valor por turma fechada ▼]                                │ │
│  │                                                                   │ │
│  │ ─────────────────────────────────────────────────────────────  │ │
│  │ 📦 Turma Fechada                                              │ │
│  │                                                                   │ │
│  │ 💵 Valor da Turma Fechada (R$) *     🎯 Qtd Máx de Alunos *  │ │
│  │ [____] (Ex: 2000.00)                   [____] (Ex: 15)         │ │
│  │                                                                   │ │
│  │ 👥 Valor por Aluno Excedente (R$) *                           │ │
│  │ [____] (Ex: 133.33)                                            │ │
│  │                                                                   │ │
│  │ ⚠️ Exemplo: Turma de R$ 2.000 com até 15 alunos. Se tiver 18  │ │
│  │    alunos, será cobrado R$ 2.000 + (3 × valor excedente).     │ │
│  │                                                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [+ Adicionar Curso]                                                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estado 1: Valor Unitário por Aluno Selecionado

Quando o usuário seleciona "💰 Valor unitário por aluno":

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔄 Tipo de Cobrança *                                            │
│ [💰 Valor unitário por aluno ▼]                                 │
│                                                                   │
│ ─────────────────────────────────────────────────────────────── │
│ 💰 Cobrança por Aluno             [Azul: Cobrança por Aluno]    │
│                                                                   │
│ 💵 Valor Unitário por Aluno (R$) *                              │
│ [150.00]                                                         │
│ ℹ️ Valor total = Valor unitário × Quantidade de alunos          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**O que é exibido:**
- ✅ Campo de "Valor Unitário por Aluno"
- ✅ Texto explicativo da fórmula
- ❌ Campos de turma fechada (ocultos)

---

## Estado 2: Turma Fechada Selecionada

Quando o usuário seleciona "📦 Valor por turma fechada":

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔄 Tipo de Cobrança *                                            │
│ [📦 Valor por turma fechada ▼]                                  │
│                                                                   │
│ ─────────────────────────────────────────────────────────────── │
│ 📦 Turma Fechada              [Verde: Turma Fechada]            │
│                                                                   │
│ 💵 Valor da Turma Fechada (R$) *     🎯 Qtd Máx de Alunos *    │
│ [2000.00]                             [15]                       │
│                                                                   │
│ 👥 Valor por Aluno Excedente (R$) *                             │
│ [133.33]                                                         │
│                                                                   │
│ ⚠️ Exemplo: Turma de R$ 2.000 com até 15 alunos. Se tiver 18   │
│    alunos, será cobrado R$ 2.000 + (3 × valor excedente).      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**O que é exibido:**
- ✅ Campo "Valor da Turma Fechada"
- ✅ Campo "Quantidade Máxima de Alunos"
- ✅ Campo "Valor por Aluno Excedente"
- ✅ Box com exemplo de cálculo
- ❌ Campo de "Valor Unitário por Aluno" (oculto)

---

## Template Excel Atualizado

### Colunas Disponíveis

```
┌─────────────────────────────────────────────────────────────────────────┐
│ course_id│course_name│workload_…│modality│billing_type│specific_price│…│
├─────────────────────────────────────────────────────────────────────────┤
│ ID123    │NR-35      │ 8       │Presencial│per_student│150.00        │…│
├─────────────────────────────────────────────────────────────────────────┤
│ ID456    │NR-33      │16       │Presencial│per_closed_│2000.00       │…│
│          │           │         │          │class      │              │…│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│…│class_fixed_value│included_students_limit│extra_student_unit_value│
├─────────────────────────────────────────────────────────────────────────┤
│…│                 │                       │                        │
├─────────────────────────────────────────────────────────────────────────┤
│…│2000.00          │15                     │133.33                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Preenchimento por Tipo

**Para Cobrança por Aluno:**
```
course_id | modality   | billing_type | specific_price | class_fixed_value | included_students_limit | extra_student_unit_value
ID123     | Presencial | per_student  | 150.00         | [em branco]       | [em branco]             | [em branco]
```

**Para Turma Fechada:**
```
course_id | modality   | billing_type      | specific_price | class_fixed_value | included_students_limit | extra_student_unit_value
ID456     | Presencial | per_closed_class  | [em branco]    | 2000.00          | 15                      | 133.33
```

---

## Exemplos de Cálculo na Interface

### Exemplo 1: Por Aluno
```
┌────────────────────────────────────────────────┐
│ 💰 Cobrança por Aluno                          │
│                                                │
│ Valor Unitário: R$ 150,00                      │
│ Quantidade de Alunos: 10                       │
│                                                │
│ Cálculo: 10 × R$ 150,00 = R$ 1.500,00        │
│                                                │
│ ✓ VALOR TOTAL: R$ 1.500,00                    │
└────────────────────────────────────────────────┘
```

### Exemplo 2: Turma Fechada (Dentro do Limite)
```
┌────────────────────────────────────────────────┐
│ 📦 Turma Fechada (Dentro do Limite)           │
│                                                │
│ Valor da Turma: R$ 2.000,00                   │
│ Limite de Alunos: 15                          │
│ Alunos Confirmados: 10                        │
│                                                │
│ Cálculo:                                      │
│ 10 alunos ≤ 15 (limite)                       │
│ = R$ 2.000,00                                 │
│                                                │
│ ✓ VALOR TOTAL: R$ 2.000,00                    │
│   (Não é reduzido, valor mínimo garantido)    │
└────────────────────────────────────────────────┘
```

### Exemplo 3: Turma Fechada (Com Excedentes)
```
┌─────────────────────────────────────────────────┐
│ 📦 Turma Fechada (Com Alunos Excedentes)      │
│                                                 │
│ Valor da Turma: R$ 2.000,00                   │
│ Limite de Alunos: 15                          │
│ Valor por Aluno Excedente: R$ 133,33         │
│ Alunos Confirmados: 18                        │
│                                                 │
│ Cálculo:                                      │
│ Valor base: R$ 2.000,00                       │
│ Alunos excedentes: 18 - 15 = 3                │
│ Valor dos excedentes: 3 × R$ 133,33 = R$ 399,99 │
│                                                 │
│ R$ 2.000,00 + R$ 399,99 = R$ 2.399,99        │
│                                                 │
│ ✓ VALOR TOTAL: R$ 2.399,99                    │
└─────────────────────────────────────────────────┘
```

---

## Validação em Tempo Real

### Erro: Campo Vazio
```
┌──────────────────────────────────────────────────────┐
│ ❌ Valor da Turma Fechada (R$) *                     │
│    [    ]                                            │
│    ⚠️ Este campo é obrigatório                       │
│                                                       │
│ ❌ Valor por Aluno Excedente (R$) *                 │
│    [    ]                                            │
│    ⚠️ Este campo é obrigatório                       │
└──────────────────────────────────────────────────────┘
```

### Erro: Valor Inválido
```
┌──────────────────────────────────────────────────────┐
│ ❌ Valor da Turma Fechada (R$) *                     │
│    [0.00]                                            │
│    ⚠️ Valor deve ser maior que 0                     │
└──────────────────────────────────────────────────────┘
```

### Sucesso: Validado
```
┌──────────────────────────────────────────────────────┐
│ ✅ Valor da Turma Fechada (R$) *                     │
│    [2000.00]                                         │
│    ✓ Validado                                        │
└──────────────────────────────────────────────────────┘
```

---

## Resumo Visual das Mudanças

```
ANTES (Antigo Sistema)
├── Curso
├── Modalidade
├── Carga Horária
└── Valor Específico (R$) ← Único tipo de cobrança

DEPOIS (Novo Sistema)
├── Curso
├── Modalidade
├── Carga Horária
├── 🆕 Tipo de Cobrança
│   ├── Se "Por Aluno"
│   │   └── Valor Unitário por Aluno
│   └── Se "Turma Fechada"
│       ├── Valor da Turma Fechada
│       ├── Qtd Máx de Alunos
│       └── Valor por Aluno Excedente
└── (Novos campos opcionais para híbrido)
```

---

## Arquivos Afetados na UI

1. ✅ `CompanyCoursesForm.jsx` - Componente principal (ATUALIZADO)
2. ✅ `BulkCoursesUploader.jsx` - Template Excel (ATUALIZADO)
3. ✅ `billingCalculations.js` - Funções de cálculo (NOVO)
4. ✅ `Company.json` - Entidade de dados (ATUALIZADO)

---

**Nota:** Todos os campos mantêm a mesma estrutura visual e comportamento familiar ao usuário, apenas com opções condicionais para maior flexibilidade.