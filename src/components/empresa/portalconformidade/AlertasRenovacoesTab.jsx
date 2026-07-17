import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Mail, MessageCircle, Send, RefreshCw, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { situacaoCertificado, certificadosAtivos } from "./situacao";
import SolicitarRenovacaoDialog from "./SolicitarRenovacaoDialog";

const fmt = (d) => { try { return d ? format(parseISO(d), "dd/MM/yyyy") : "—"; } catch { return "—"; } };

export default function AlertasRenovacoesTab({ dados, recarregar }) {
  const alertDias = dados.alert_dias || [45, 30, 15, 5];
  const [filtros, setFiltros] = useState({ prazo: "todos", aluno: "", curso: "todos", situacao: "todos", unidade: "todos" });
  const [selecao, setSelecao] = useState(new Set());
  const [comu, setComu] = useState(null); // { canal, preview, enviando, resultado }
  const [dialogSolicitar, setDialogSolicitar] = useState(false);
  const [banner, setBanner] = useState(null);

  const alunoUnidade = (c) => {
    const s = dados.students.find((x) => x.id === c.student_id);
    return s?.unidade || s?.setor || "";
  };
  const certs = useMemo(() =>
    certificadosAtivos(dados.certificates).map((c) => ({ ...c, sit: situacaoCertificado(c, alertDias), unidade: alunoUnidade(c) })),
    [dados.certificates] // eslint-disable-line
  );
  const cursos = [...new Set(certs.map((c) => c.course_name).filter(Boolean))].sort();
  const unidades = [...new Set(certs.map((c) => c.unidade).filter(Boolean))].sort();
  const situacoes = ["Regular", ...[...alertDias].sort((a, b) => b - a).map((d) => `Vence em ${d} dias`), "Vencido", "Validade pendente"];

  const filtrados = certs.filter((c) => {
    if (filtros.prazo !== "todos" && c.sit.label !== `Vence em ${filtros.prazo} dias`) return false;
    if (filtros.situacao !== "todos" && c.sit.label !== filtros.situacao) return false;
    if (filtros.curso !== "todos" && c.course_name !== filtros.curso) return false;
    if (filtros.unidade !== "todos" && c.unidade !== filtros.unidade) return false;
    if (filtros.aluno && !(c.student_name || "").toLowerCase().includes(filtros.aluno.toLowerCase())) return false;
    return true;
  });

  const toggle = (id) => setSelecao((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTodos = () => setSelecao((s) => s.size === filtrados.length ? new Set() : new Set(filtrados.map((c) => c.id)));
  const selecionados = certs.filter((c) => selecao.has(c.id));

  const prepararComunicacao = async (canal) => {
    setBanner(null);
    setComu({ canal, enviando: true });
    try {
      const res = await base44.functions.invoke("portalEmpresaConformidade", {
        action: "preparar_comunicacao", company_id: dados.company.id,
        certificado_ids: [...selecao], canal, confirmar: false,
      });
      setComu({ canal, preview: res.data, enviando: false });
    } catch (e) {
      setComu(null);
      setBanner({ erro: true, texto: e?.response?.data?.error || "Erro ao preparar a comunicação." });
    }
  };

  const confirmarEnvio = async () => {
    setComu((c) => ({ ...c, enviando: true }));
    try {
      const res = await base44.functions.invoke("portalEmpresaConformidade", {
        action: "preparar_comunicacao", company_id: dados.company.id,
        certificado_ids: [...selecao], canal: comu.canal, confirmar: true,
      });
      setComu(null);
      setSelecao(new Set());
      setBanner({ erro: false, texto: `${res.data.criadas} mensagem(ns) enviada(s) à fila oficial de comunicação (${res.data.duplicados} duplicada(s) evitada(s), ${res.data.sem_contato} sem contato).` });
    } catch (e) {
      setComu(null);
      setBanner({ erro: true, texto: e?.response?.data?.error || "Erro ao confirmar o envio." });
    }
  };

  const prazoOrigem = selecionados.length ? selecionados[0].sit.label : "";

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Bell className="w-4 h-4 text-orange-500" />
        <span className="font-semibold text-gray-800 text-sm">Alertas e Renovações ({filtrados.length})</span>
        <span className="ml-auto text-[11px] text-gray-400">Prazos ativos: {[...alertDias].sort((a, b) => b - a).join("/")} dias</span>
      </div>

      <div className="px-4 py-2.5 border-b flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Aluno..." className="pl-8 h-8 text-xs w-40" value={filtros.aluno} onChange={(e) => setFiltros((f) => ({ ...f, aluno: e.target.value }))} />
        </div>
        <select className="border rounded-md px-2 h-8 text-xs text-gray-600" value={filtros.prazo} onChange={(e) => setFiltros((f) => ({ ...f, prazo: e.target.value, situacao: "todos" }))}>
          <option value="todos">Prazo: todos</option>
          {[...alertDias].sort((a, b) => b - a).map((d) => <option key={d} value={d}>Vence em {d} dias</option>)}
        </select>
        <select className="border rounded-md px-2 h-8 text-xs text-gray-600" value={filtros.situacao} onChange={(e) => setFiltros((f) => ({ ...f, situacao: e.target.value, prazo: "todos" }))}>
          <option value="todos">Situação: todas</option>
          {situacoes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border rounded-md px-2 h-8 text-xs text-gray-600 max-w-[180px]" value={filtros.curso} onChange={(e) => setFiltros((f) => ({ ...f, curso: e.target.value }))}>
          <option value="todos">Curso: todos</option>
          {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {unidades.length > 0 && (
          <select className="border rounded-md px-2 h-8 text-xs text-gray-600" value={filtros.unidade} onChange={(e) => setFiltros((f) => ({ ...f, unidade: e.target.value }))}>
            <option value="todos">Unidade: todas</option>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
      </div>

      {selecao.size > 0 && (
        <div className="px-4 py-2 border-b bg-emerald-50/60 flex flex-wrap items-center gap-2">
          <span className="text-xs text-emerald-700 font-medium">{selecao.size} selecionado(s)</span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => prepararComunicacao("E-mail")}><Mail className="w-3 h-3" /> Preparar e-mail</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => prepararComunicacao("WhatsApp")}><MessageCircle className="w-3 h-3" /> Preparar WhatsApp</Button>
          <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogSolicitar(true)}><Send className="w-3 h-3" /> Solicitar renovação/reciclagem à CAT</Button>
        </div>
      )}
      {banner && <div className={`px-4 py-2 text-xs border-b ${banner.erro ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>{banner.texto}</div>}

      {filtrados.length === 0 ? (
        <div className="py-12 text-center text-gray-400"><Bell className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhum certificado para os filtros selecionados.</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="px-3 py-2"><input type="checkbox" checked={selecao.size === filtrados.length && filtrados.length > 0} onChange={toggleTodos} /></th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Aluno</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Curso</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Validade</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Situação</th>
                {unidades.length > 0 && <th className="text-left px-3 py-2 font-medium text-gray-500">Unidade</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selecao.has(c.id)} onChange={() => toggle(c.id)} /></td>
                  <td className="px-3 py-2.5"><div className="font-medium text-gray-800">{c.student_name}</div><div className="text-xs text-gray-400">{c.cpf_exibicao}</div></td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[220px]"><div className="truncate">{c.course_name}</div></td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{c.valid_until ? fmt(c.valid_until) : "Validade pendente"}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${c.sit.cor}`}>{c.sit.label}</span></td>
                  {unidades.length > 0 && <td className="px-3 py-2.5 text-xs text-gray-500">{c.unidade || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmação humana da comunicação (fila oficial) */}
      <Dialog open={!!comu} onOpenChange={(v) => !v && !comu?.enviando && setComu(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Preparar comunicação por {comu?.canal}</DialogTitle></DialogHeader>
          {comu?.enviando && !comu?.preview ? (
            <div className="py-6 text-center text-gray-400"><RefreshCw className="w-6 h-6 mx-auto animate-spin" /></div>
          ) : comu?.preview ? (
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">As mensagens serão colocadas na fila oficial de comunicação, com prevenção de duplicidade e registro em auditoria. Nada é enviado sem esta confirmação.</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 rounded-lg p-2"><div className="text-lg font-bold text-green-700">{comu.preview.enfileiraveis}</div><div className="text-[11px] text-green-700">A enviar</div></div>
                <div className="bg-yellow-50 rounded-lg p-2"><div className="text-lg font-bold text-yellow-700">{comu.preview.duplicados}</div><div className="text-[11px] text-yellow-700">Duplicadas (evitadas)</div></div>
                <div className="bg-gray-50 rounded-lg p-2"><div className="text-lg font-bold text-gray-600">{comu.preview.sem_contato}</div><div className="text-[11px] text-gray-600">Sem contato</div></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setComu(null)} disabled={comu.enviando}>Cancelar</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmarEnvio} disabled={comu.enviando || comu.preview.enfileiraveis === 0}>
                  {comu.enviando && <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />} Confirmar envio à fila
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <SolicitarRenovacaoDialog
        aberto={dialogSolicitar}
        onFechar={() => setDialogSolicitar(false)}
        certificados={selecionados}
        companyId={dados.company.id}
        prazoOrigem={prazoOrigem}
        onCriada={recarregar}
      />
    </div>
  );
}