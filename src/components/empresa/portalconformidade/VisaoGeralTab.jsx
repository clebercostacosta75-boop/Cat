import React from "react";
import { Users, Bell, Send, BarChart3, ArrowRight, Award } from "lucide-react";
import { situacaoCertificado, certificadosAtivos } from "./situacao";

const CORES_PRAZO = {
  45: "bg-yellow-50 text-yellow-700 border-yellow-100",
  30: "bg-amber-50 text-amber-700 border-amber-100",
  15: "bg-orange-50 text-orange-700 border-orange-100",
  5: "bg-red-50 text-red-600 border-red-100",
};

export default function VisaoGeralTab({ dados, irPara }) {
  const alertDias = dados.alert_dias || [45, 30, 15, 5];
  const certs = certificadosAtivos(dados.certificates).map((c) => ({ ...c, sit: situacaoCertificado(c, alertDias) }));
  const contar = (label) => certs.filter((c) => c.sit.label === label).length;
  const prazos = [...alertDias].sort((a, b) => b - a);
  const validos = contar("Regular") + prazos.reduce((s, d) => s + contar(`Vence em ${d} dias`), 0);

  const cards = [
    { label: "Certificados válidos", value: validos, cor: "bg-green-50 text-green-700 border-green-100" },
    ...prazos.map((d) => ({ label: `Vencendo em ${d} dias`, value: contar(`Vence em ${d} dias`), cor: CORES_PRAZO[d] || "bg-yellow-50 text-yellow-700 border-yellow-100" })),
    { label: "Vencidos", value: contar("Vencido"), cor: "bg-red-50 text-red-700 border-red-100" },
    { label: "Validade pendente", value: contar("Validade pendente"), cor: "bg-slate-50 text-slate-600 border-slate-100" },
  ];

  const prioridades = certs
    .filter((c) => !["Regular", "Validade pendente"].includes(c.sit.label))
    .sort((a, b) => (a.sit.dias ?? -99999) - (b.sit.dias ?? -99999))
    .slice(0, 6);

  const atalhos = [
    { key: "alunos", label: "Alunos e Certificações", icon: Users },
    { key: "alertas", label: "Alertas e Renovações", icon: Bell },
    { key: "solicitacoes", label: "Solicitações", icon: Send },
    { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-3 ${c.cor}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-[11px] leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-gray-800 text-sm">Prioridades de renovação</span>
          </div>
          {certs.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum certificado emitido para esta empresa.</p>
            </div>
          ) : prioridades.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Nenhuma pendência de renovação no momento. ✅</div>
          ) : (
            <div className="divide-y">
              {prioridades.map((c) => (
                <div key={c.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{c.student_name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.course_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${c.sit.cor}`}>
                    {c.sit.label}{c.sit.dias != null && c.sit.dias < 0 ? ` há ${Math.abs(c.sit.dias)}d` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <span className="font-semibold text-gray-800 text-sm">Atalhos</span>
          </div>
          <div className="p-3 space-y-2">
            {atalhos.map((a) => (
              <button
                key={a.key}
                onClick={() => irPara(a.key)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
              >
                <a.icon className="w-4 h-4 text-emerald-600" />
                <span className="flex-1 text-left">{a.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}