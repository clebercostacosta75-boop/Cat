# Exemplos de Integração do Sistema de Cobrança

## 1. Integração em Propostas

### Cenário
Uma proposta está sendo criada para um treinamento de uma empresa cliente que tem cobrança por turma fechada configurada.

### Código de Exemplo

```javascript
// Em uma função backend ou componente de proposta
import { calculateCourseBilling } from '@/lib/billingCalculations';

async function calculateProposalValue(companyCourseConfig, participantCount) {
  // companyCourseConfig vem do cadastro da empresa
  // Exemplo:
  // {
  //   course_id: "abc123",
  //   billing_type: "per_closed_class",
  //   class_fixed_value: 2000,
  //   included_students_limit: 15,
  //   extra_student_unit_value: 133.33
  // }
  
  const totalValue = calculateCourseBilling(companyCourseConfig, participantCount);
  
  return {
    type: companyCourseConfig.billing_type,
    participantCount,
    baseValue: companyCourseConfig.class_fixed_value || companyCourseConfig.specific_price,
    totalValue,
    details: getCalculationDetails(companyCourseConfig, participantCount)
  };
}

function getCalculationDetails(course, participantCount) {
  if (course.billing_type === 'per_student') {
    return {
      type: 'Valor Unitário por Aluno',
      formula: `${course.specific_price} × ${participantCount} = ${course.specific_price * participantCount}`,
      breakdown: `${participantCount} alunos × R$ ${course.specific_price.toFixed(2)}/aluno`
    };
  }
  
  if (course.billing_type === 'per_closed_class') {
    const limit = course.included_students_limit || 15;
    const baseValue = course.class_fixed_value;
    
    if (participantCount <= limit) {
      return {
        type: 'Turma Fechada (Dentro do Limite)',
        formula: `Valor da turma = R$ ${baseValue.toFixed(2)}`,
        breakdown: `${participantCount} alunos ≤ ${limit} alunos (limite) = R$ ${baseValue.toFixed(2)}`
      };
    }
    
    const excess = participantCount - limit;
    const excessCost = excess * course.extra_student_unit_value;
    const total = baseValue + excessCost;
    
    return {
      type: 'Turma Fechada (Com Excedentes)',
      formula: `R$ ${baseValue.toFixed(2)} + (${excess} × R$ ${course.extra_student_unit_value.toFixed(2)}) = R$ ${total.toFixed(2)}`,
      breakdown: [
        `Valor base da turma (até ${limit} alunos): R$ ${baseValue.toFixed(2)}`,
        `Alunos excedentes: ${excess}`,
        `Valor por excedente: R$ ${course.extra_student_unit_value.toFixed(2)}`,
        `Total de excedentes: R$ ${excessCost.toFixed(2)}`,
        `TOTAL: R$ ${total.toFixed(2)}`
      ]
    };
  }
}

// Uso em um componente
export async function ProposalCalculator({ companyCourse, participantCount }) {
  const calculation = calculateProposalValue(companyCourse, participantCount);
  
  return (
    <div className="proposal-calculation">
      <h3>Cálculo do Valor</h3>
      <p><strong>Tipo:</strong> {calculation.details.type}</p>
      <p><strong>Fórmula:</strong> {calculation.details.formula}</p>
      <div className="breakdown">
        {Array.isArray(calculation.details.breakdown) ? (
          <ul>
            {calculation.details.breakdown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>{calculation.details.breakdown}</p>
        )}
      </div>
      <p className="total"><strong>VALOR TOTAL: R$ {calculation.totalValue.toFixed(2)}</strong></p>
    </div>
  );
}
```

---

## 2. Integração em Contratos

### Cenário
Um contrato está sendo gerado e precisa calcular o valor baseado na quantidade de participantes e tipo de cobrança.

```javascript
// Em processarContrato ou gerarContrato
async function gerarContrato(data) {
  const { company_id, course_id, participant_count } = data;
  
  // Buscar dados da empresa e do curso
  const company = await base44.entities.Company.get(company_id);
  const courseCfg = company.company_courses.find(c => c.course_id === course_id);
  
  if (!courseCfg) {
    throw new Error('Curso não encontrado na configuração da empresa');
  }
  
  // Calcular valor do contrato
  const contractValue = calculateCourseBilling(courseCfg, participant_count);
  
  // Gerar contrato com informações de cobrança
  const contractData = {
    ...data,
    participant_count,
    billing_info: {
      type: courseCfg.billing_type,
      unitPrice: courseCfg.specific_price || courseCfg.class_fixed_value,
      totalValue: contractValue,
      details: getCalculationDetails(courseCfg, participant_count)
    }
  };
  
  return contractData;
}
```

---

## 3. Integração em BMM (Boletim de Medição e Pagamento)

### Cenário
Um BMM está sendo gerado e precisa considerar o tipo de cobrança da empresa para calcular o valor a faturar.

```javascript
// Em gerarBMM ou função similar
async function generateBMM(classScheduleId, finalParticipantCount) {
  const classSchedule = await base44.entities.ClassSchedule.get(classScheduleId);
  const company = await base44.entities.Company.get(classSchedule.company_id);
  
  // Encontrar configuração do curso
  const courseCfg = company.company_courses?.find(
    c => c.course_id === classSchedule.training_id
  );
  
  if (!courseCfg) {
    throw new Error('Configuração de cobrança não encontrada');
  }
  
  // Calcular valor final
  const finalValue = calculateCourseBilling(courseCfg, finalParticipantCount);
  
  // Criar BMM com valor correto
  const bmm = {
    class_schedule_id: classScheduleId,
    participant_count: finalParticipantCount,
    billing_type: courseCfg.billing_type,
    unit_price: courseCfg.specific_price || courseCfg.class_fixed_value,
    final_value: finalValue,
    calculation_details: getCalculationDetails(courseCfg, finalParticipantCount),
    status: 'pending'
  };
  
  return bmm;
}
```

---

## 4. Integração em Relatórios Financeiros

### Cenário
Um relatório financeiro está sendo exibido e precisa mostrar como cada curso foi cobrado.

```javascript
// Em uma função de relatório ou componente
async function getFinancialReport(startDate, endDate) {
  const classSchedules = await base44.entities.ClassSchedule.filter({
    start_date: { $gte: startDate },
    end_date: { $lte: endDate }
  });
  
  const report = await Promise.all(
    classSchedules.map(async (cs) => {
      const company = await base44.entities.Company.get(cs.company_id);
      const courseCfg = company.company_courses?.find(
        c => c.course_id === cs.training_id
      );
      
      if (!courseCfg) return null;
      
      const value = calculateCourseBilling(courseCfg, cs.students_count);
      
      return {
        company_name: company.nome_fantasia,
        course_name: cs.training_name,
        course_id: cs.training_id,
        participants: cs.students_count,
        billing_type: courseCfg.billing_type === 'per_student' 
          ? 'Por Aluno' 
          : 'Turma Fechada',
        unit_price: courseCfg.specific_price || courseCfg.class_fixed_value,
        total_value: value,
        start_date: cs.start_date,
        end_date: cs.end_date
      };
    })
  );
  
  return report.filter(r => r !== null);
}
```

---

## 5. Validação em Formulários

### Cenário
Validar que os campos de cobrança estão corretos antes de salvar.

```javascript
import { validateBillingFields } from '@/lib/billingCalculations';

function CompanyCoursesForm({ companyCourses, onChange }) {
  const handleAddCourse = () => {
    onChange([...companyCourses, { 
      /* campos padrão */ 
      billing_type: 'per_student' 
    }]);
  };
  
  const handleSave = () => {
    // Validar cada curso
    const errors = [];
    companyCourses.forEach((course, idx) => {
      const validation = validateBillingFields(course);
      if (!validation.valid) {
        errors.push({
          courseIndex: idx,
          errors: validation.errors
        });
      }
    });
    
    if (errors.length > 0) {
      // Exibir erros
      showValidationErrors(errors);
      return;
    }
    
    // Salvar se tudo válido
    saveCompanyCourses();
  };
  
  return (
    // ... formulário
  );
}
```

---

## 6. Display em Interface

### Cenário
Exibir o cálculo de forma clara ao usuário.

```javascript
function BillingDisplay({ course, participantCount }) {
  const calculation = calculateCourseBilling(course, participantCount);
  const details = getCalculationDetails(course, participantCount);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cálculo de Cobrança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo de Cobrança */}
        <div>
          <Label>Tipo de Cobrança</Label>
          <Badge>{details.type}</Badge>
        </div>
        
        {/* Fórmula */}
        <div>
          <Label>Fórmula Aplicada</Label>
          <p className="font-mono text-sm bg-gray-50 p-2 rounded">
            {details.formula}
          </p>
        </div>
        
        {/* Detalhes */}
        <div>
          <Label>Detalhes do Cálculo</Label>
          {Array.isArray(details.breakdown) ? (
            <ul className="space-y-1">
              {details.breakdown.map((line, i) => (
                <li key={i} className="text-sm">{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">{details.breakdown}</p>
          )}
        </div>
        
        {/* Valor Total */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-600">Valor Total</p>
          <p className="text-2xl font-bold text-emerald-600">
            R$ {calculation.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Checklist de Implementação por Módulo

### Propostas
- [ ] Importar `calculateCourseBilling` em processProposal
- [ ] Buscar configuração de cobrança da empresa
- [ ] Usar função para calcular valor
- [ ] Exibir detalhes do cálculo em propostas

### Contratos
- [ ] Usar calculateCourseBilling ao gerar contrato
- [ ] Salvar tipo de cobrança e detalhes no contrato
- [ ] Permitir recálculo se quantidade mudar

### BMM
- [ ] Integrar cálculo na geração de BMM
- [ ] Exibir tipo de cobrança e fórmula usada
- [ ] Calcular valor final baseado em participantes reais

### Faturamento
- [ ] Incluir tipo de cobrança nos registros de cobrança
- [ ] Usar calculateCourseBilling para valor final
- [ ] Exibir detalhes em comprovantes

### Relatórios
- [ ] Adicionar coluna de "Tipo de Cobrança"
- [ ] Mostrar "Valor Unitário" ou "Valor da Turma"
- [ ] Incluir fórmula ou detalhes de cálculo

### Validação
- [ ] Usar validateBillingFields antes de salvar
- [ ] Exibir mensagens de erro claras
- [ ] Bloquear salvamento se dados inválidos