# Guia do Sistema de Cobrança por Turma Fechada

## Visão Geral

O novo sistema de cobrança permite flexibilidade na precificação de cursos personalizados das empresas clientes. Existem dois tipos de cobrança:

1. **Valor Unitário por Aluno** (`per_student`)
2. **Valor por Turma Fechada** (`per_closed_class`)

---

## Tipo 1: Valor Unitário por Aluno

### Descrição
Cada aluno tem um valor fixo. O valor total é calculado multiplicando o número de alunos pelo valor unitário.

### Campos
- `billing_type`: `"per_student"`
- `specific_price`: Valor unitário por aluno (obrigatório)

### Fórmula
```
Valor Total = Valor Unitário × Quantidade de Alunos
```

### Exemplo
- Valor Unitário: R$ 150,00
- Quantidade de Alunos: 10
- **Resultado: R$ 1.500,00**

### Uso em Planilha Excel
```
course_id | modality   | billing_type | specific_price
ID123     | Presencial | per_student  | 150.00
```

---

## Tipo 2: Valor por Turma Fechada

### Descrição
Um valor fixo é cobrado por uma turma de até 15 alunos. Se a turma exceder o limite, apenas os alunos excedentes são cobrados a um valor unitário adicional.

### Campos Obrigatórios
- `billing_type`: `"per_closed_class"`
- `class_fixed_value`: Valor fixo da turma (obrigatório)
- `included_students_limit`: Limite de alunos inclusos (padrão: 15, obrigatório)
- `extra_student_unit_value`: Valor por aluno excedente (obrigatório)

### Fórmula

**Se quantidade ≤ limite da turma:**
```
Valor Total = Valor da Turma Fechada
```

**Se quantidade > limite da turma:**
```
Alunos Excedentes = Quantidade - Limite
Valor Total = Valor da Turma Fechada + (Alunos Excedentes × Valor Unitário Excedente)
```

### Exemplos

#### Exemplo 1: Turma dentro do limite
- Valor da Turma: R$ 2.000,00
- Limite: 15 alunos
- Quantidade Real: 10 alunos
- **Resultado: R$ 2.000,00** (não é reduzido)

#### Exemplo 2: Turma acima do limite
- Valor da Turma: R$ 2.000,00
- Limite: 15 alunos
- Valor por Aluno Excedente: R$ 133,33
- Quantidade Real: 18 alunos
- **Cálculo:**
  - Alunos Excedentes = 18 - 15 = 3
  - Valor dos Excedentes = 3 × R$ 133,33 = R$ 399,99
  - **Resultado: R$ 2.000,00 + R$ 399,99 = R$ 2.399,99**

### Uso em Planilha Excel
```
course_id | modality   | billing_type      | class_fixed_value | included_students_limit | extra_student_unit_value
ID456     | Presencial | per_closed_class  | 2000.00          | 15                      | 133.33
```

---

## Como Usar em Diferentes Telas

### 1. Cadastro de Empresas (Companies)
Na seção **4. Cursos e Contratos da Empresa**:

1. Acesse a aba **Cursos Personalizados**
2. Clique em **Adicionar Curso**
3. Selecione o curso e modalidade
4. No campo **Tipo de Cobrança**, escolha:
   - **Valor unitário por aluno** para billing_type = per_student
   - **Valor por turma fechada** para billing_type = per_closed_class
5. Preencha os campos correspondentes

### 2. Cadastro em Massa (Excel/CSV)
Use o template baixado em **Cadastro em Massa**:

1. Clique em **Baixar Modelo**
2. Preencha as colunas:
   - Para cobrança por aluno: preenchha `specific_price`
   - Para turma fechada: preencha `class_fixed_value`, `included_students_limit`, `extra_student_unit_value`
3. Envie o arquivo

### 3. Propostas
Ao criar propostas, o sistema automaticamente:
- Detecta o tipo de cobrança configurado para o curso da empresa
- Calcula o valor total conforme a quantidade de participantes
- Exibe a fórmula usada no resumo da proposta

### 4. Contratos
Os contratos herdam a configuração de cobrança:
- O valor é calculado com base na quantidade final de participantes
- Se a quantidade mudar, o valor pode ser recalculado

### 5. Gestão de BMM
O BMM (Boletim de Medição e Pagamento) considera:
- Tipo de cobrança definido no cadastro da empresa
- Quantidade real de alunos participantes
- Cálculo automático do valor a faturar

### 6. Faturamento e Relatórios
Os relatórios financeiros exibem:
- Tipo de cobrança aplicado
- Quantidade de alunos
- Valor calculado (conforme fórmula)
- Detalhes de turmas fechadas com excedentes

---

## Implementação em Código

### Usando a Função de Cálculo

```javascript
import { calculateCourseBilling } from '@/lib/billingCalculations';

const course = {
  billing_type: 'per_closed_class',
  class_fixed_value: 2000,
  included_students_limit: 15,
  extra_student_unit_value: 133.33
};

const participantCount = 18;
const totalValue = calculateCourseBilling(course, participantCount);
// Resultado: 2399.99
```

### Validação

```javascript
import { validateBillingFields } from '@/lib/billingCalculations';

const validation = validateBillingFields(course);
if (!validation.valid) {
  console.error('Erros:', validation.errors);
}
```

---

## Checklist de Implementação

- [x] Atualizar entidade Company com novos campos
- [x] Adicionar campo "Tipo de Cobrança" em CompanyCoursesForm
- [x] Criar campos condicionais para cada tipo de cobrança
- [x] Criar funções utilitárias de cálculo (calculateCourseBilling, validateBillingFields)
- [ ] Atualizar função backend de propostas (usarCalculateCourseBilling)
- [ ] Atualizar função backend de contratos
- [ ] Atualizar função backend de BMM
- [ ] Atualizar função backend de faturamento
- [ ] Atualizar templates e relatórios financeiros
- [ ] Testar cálculos com diferentes cenários

---

## Próximas Etapas

1. **Função de Propostas** - Atualizar `processProposal` para usar `calculateCourseBilling`
2. **Função de Contratos** - Atualizar `gerarContrato` para aplicar a fórmula correta
3. **Gestão de BMM** - Atualizar geração de BMM para considerar tipo de cobrança
4. **Faturamento** - Atualizar sistemas de cobrança/faturamento
5. **Relatórios** - Adicionar colunas nos relatórios financeiros mostrando o tipo de cobrança
6. **Testes** - Criar suite de testes para validar cálculos em diferentes cenários