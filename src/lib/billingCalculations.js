/**
 * Calcula o valor total do curso baseado no tipo de cobrança configurado
 * @param {Object} course - Objeto do curso com informações de cobrança
 * @param {number} participantCount - Quantidade de participantes
 * @returns {number} Valor total calculado
 */
export function calculateCourseBilling(course, participantCount) {
  if (!course) return 0;

  const billingType = course.billing_type || 'per_student';

  // Tipo 1: Valor unitário por aluno
  if (billingType === 'per_student') {
    return (course.specific_price || 0) * participantCount;
  }

  // Tipo 2: Valor por turma fechada
  if (billingType === 'per_closed_class') {
    const classFixedValue = course.class_fixed_value || 0;
    const includedLimit = course.included_students_limit || 15;
    const extraUnitValue = course.extra_student_unit_value || 0;

    // Se participantes <= limite, cobra apenas o valor fixo
    if (participantCount <= includedLimit) {
      return classFixedValue;
    }

    // Se participantes > limite, cobra o valor fixo + excedentes
    const excessParticipants = participantCount - includedLimit;
    const excessCost = excessParticipants * extraUnitValue;
    return classFixedValue + excessCost;
  }

  return 0;
}

/**
 * Retorna o objeto de configuração de cobrança para um curso
 * Usado para validação e display nos formulários
 */
export function getBillingConfig(course) {
  return {
    billingType: course.billing_type || 'per_student',
    specificPrice: course.specific_price || 0,
    classFixedValue: course.class_fixed_value || 0,
    includedStudentsLimit: course.included_students_limit || 15,
    extraStudentUnitValue: course.extra_student_unit_value || 0,
  };
}

/**
 * Validação de campos de cobrança
 */
export function validateBillingFields(course) {
  const billingType = course.billing_type || 'per_student';

  if (billingType === 'per_student') {
    return {
      valid: (course.specific_price || 0) > 0,
      errors: (course.specific_price || 0) <= 0 ? ['Valor específico deve ser maior que 0'] : [],
    };
  }

  if (billingType === 'per_closed_class') {
    const errors = [];
    if ((course.class_fixed_value || 0) <= 0) errors.push('Valor da turma fechada deve ser maior que 0');
    if ((course.included_students_limit || 0) <= 0) errors.push('Limite de alunos deve ser maior que 0');
    if ((course.extra_student_unit_value || 0) < 0) errors.push('Valor por aluno excedente não pode ser negativo');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  return { valid: true, errors: [] };
}