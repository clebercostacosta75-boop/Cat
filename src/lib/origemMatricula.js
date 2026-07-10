/**
 * Regra central de origem da matrícula (StudentCourseEnrollment).
 * Fonte única de verdade — não replicar esta regra manualmente nas telas.
 *
 * Individual: company_id vazio, nulo ou "individual" (ou company_name "Individual (PF)").
 * Empresarial: company_id preenchido com ID de empresa, diferente de "individual".
 */
export function isMatriculaIndividual(enrollment) {
  if (!enrollment) return false;
  return (
    !enrollment.company_id ||
    enrollment.company_id === "individual" ||
    enrollment.company_name === "Individual (PF)"
  );
}

export function isMatriculaEmpresarial(enrollment) {
  if (!enrollment) return false;
  return !isMatriculaIndividual(enrollment);
}