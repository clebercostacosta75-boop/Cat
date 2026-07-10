import React from "react";
import { Link } from "react-router-dom";
import { Building2, ExternalLink } from "lucide-react";
import DashBloco, { VazioBloco } from "./DashBloco";
import { uniq } from "./dashDataEmpresas";

export default function DashEmpresas({ turmas, matriculas, filtros, setFiltros }) {
  const nomes = uniq([...turmas.map(t => t.company_name), ...matriculas.map(m => m.company_name)]);

  return (
    <DashBloco titulo="Empresas em Atendimento" icone={Building2}
      acoes={
        <Link to="/Companies" className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5">
          Abrir empresas <ExternalLink className="w-3 h-3" />
        </Link>
      }>
      {nomes.length === 0 ? <VazioBloco /> : (
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b text-gray-500">
            <tr>
              <th className="text-left px-3 py-1.5 font-medium">Empresa</th>
              <th className="text-left px-3 py-1.5 font-medium">Turmas</th>
              <th className="text-left px-3 py-1.5 font-medium">Alunos</th>
              <th className="text-left px-3 py-1.5 font-medium">Cursos em andamento</th>
              <th className="text-left px-3 py-1.5 font-medium">Cursos concluídos</th>
              <th className="text-left px-3 py-1.5 font-medium">Pend. acadêmicas</th>
              <th className="text-left px-3 py-1.5 font-medium">Pend. certificação</th>
              <th className="px-3 py-1.5 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {nomes.map(nome => {
              const ts = turmas.filter(t => t.company_name === nome);
              const ms = matriculas.filter(m => m.company_name === nome);
              const andamento = uniq(ts.filter(t => t.status === "Em Andamento").map(t => t.training_name)).length;
              const concluidos = uniq(ts.filter(t => t.status === "Concluído").map(t => t.training_name)).length;
              const pendAcad = ms.filter(m => (m.resultado_academico || "Pendente") === "Pendente").length;
              const pendCert = ms.filter(m => m.resultado_academico === "Aprovado" && !m.certificate_id).length;
              return (
                <tr key={nome} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    <button onClick={() => setFiltros(f => ({ ...f, empresa: f.empresa === nome ? "" : nome }))}
                      className={`font-medium hover:underline text-left ${filtros.empresa === nome ? "text-blue-700" : "text-gray-800"}`}
                      title="Filtrar a dashboard por esta empresa">
                      {nome}
                    </button>
                  </td>
                  <td className="px-3 py-1.5">{ts.length}</td>
                  <td className="px-3 py-1.5">{ms.length}</td>
                  <td className="px-3 py-1.5">{andamento}</td>
                  <td className="px-3 py-1.5">{concluidos}</td>
                  <td className="px-3 py-1.5">{pendAcad > 0 ? <span className="text-amber-700 font-medium">⚠ {pendAcad}</span> : "—"}</td>
                  <td className="px-3 py-1.5">{pendCert > 0 ? <span className="text-amber-700 font-medium">⚠ {pendCert}</span> : "—"}</td>
                  <td className="px-3 py-1.5 text-center">
                    <Link to="/Companies" className="text-blue-600 hover:underline">Abrir</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </DashBloco>
  );
}