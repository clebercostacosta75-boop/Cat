/**
 * Situação de conformidade de um certificado — reutiliza Certificate.valid_until
 * e os prazos das configurações existentes de alertas (45/30/15/5 dias).
 */
export function diasRestantes(cert) {
  if (!cert?.valid_until) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${cert.valid_until}T00:00:00`) - hoje) / 86400000);
}

export function situacaoCertificado(cert, alertDias = [45, 30, 15, 5]) {
  if (cert.status === "revoked") return { label: "Revogado", cor: "bg-gray-100 text-gray-600 border-gray-200", dias: null };
  if (cert.status === "substituido") return { label: "Substituído", cor: "bg-gray-100 text-gray-600 border-gray-200", dias: null };
  const dias = diasRestantes(cert);
  if (dias === null) return { label: "Validade pendente", cor: "bg-slate-100 text-slate-600 border-slate-200", dias };
  if (dias < 0) return { label: "Vencido", cor: "bg-red-100 text-red-700 border-red-200", dias };
  const limite = [...alertDias].sort((a, b) => a - b).find((l) => dias <= l);
  if (limite !== undefined) {
    const cor =
      limite <= 5 ? "bg-red-50 text-red-600 border-red-200" :
      limite <= 15 ? "bg-orange-100 text-orange-700 border-orange-200" :
      limite <= 30 ? "bg-amber-100 text-amber-700 border-amber-200" :
      "bg-yellow-100 text-yellow-700 border-yellow-200";
    return { label: `Vence em ${limite} dias`, cor, dias };
  }
  return { label: "Regular", cor: "bg-green-100 text-green-700 border-green-200", dias };
}

export const certificadosAtivos = (certs = []) =>
  certs.filter((c) => !["revoked", "substituido"].includes(c.status));