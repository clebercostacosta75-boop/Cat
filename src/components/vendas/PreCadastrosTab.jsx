import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Eye, CheckCircle, XCircle, AlertTriangle, Trash2, FileText, Link2, Zap, Search, Inbox } from "lucide-react";
import { toast } from "sonner";
import { limparCPF } from "@/lib/cpf";
import { logVenda } from "@/lib/auditVendas";
import ConverterPreCadastroModal from "./ConverterPreCadastroModal";
import DocumentosPendentesView from "./DocumentosPendentesView";

const STATUS_COLOR = {
  "Aguardando validação": "bg-yellow-100 text-yellow-800",
  "Validado": "bg-green-100 text-green-700",
  "Rejeitado": "bg-red-100 text-red-700",
  "Corrigir dados": "bg-orange-100 text-orange-700",
  "Convertido em matrícula": "bg-emerald-100 text-emerald-800",
  "Duplicidade identificada": "bg-blue-100 text-blue-700",
};

function DetalheDialog({ pc, students, onClose, onConverter }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const digits = limparCPF(pc.cpf);
  const alunoExistente = students.find(s => s.id === pc.student_id_vinculado) || students.find(s => limparCPF(s.cpf) === digits);

  const mudarStatus = async (novoStatus, detalhe, extra = {}) => {
    setBusy(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.PreCadastro.update(pc.id, {
        status: novoStatus, motivo_status: motivo || "",
        validado_por: user?.email || "", validado_em: new Date().toISOString(),
        ...extra,
      });
      await logVenda("update", { entity_type: "PreCadastro", entity_id: pc.id, entity_name: pc.nome_completo, details: `FASE 2 QR Code: ${detalhe}${motivo ? `. Motivo: ${motivo}` : ""}` });
      queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
      toast.success(`Pré-cadastro: ${novoStatus}`);
      onClose();
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVincular = () => {
    if (!alunoExistente) return;
    mudarStatus("Validado", `aluno existente vinculado ao pré-cadastro (${alunoExistente.full_name})`, { student_id_vinculado: alunoExistente.id, cpf_duplicado: true });
  };

  const handleCriarAluno = async () => {
    setBusy(true);
    try {
      const aluno = await base44.entities.Student.create({
        full_name: pc.nome_completo, cpf: pc.cpf, whatsapp: pc.telefone, email: pc.email,
        logradouro: pc.endereco, cidade: pc.cidade, estado: pc.estado, cep: pc.cep,
        data_nascimento: pc.data_nascimento || undefined,
        notes: `Cadastro via QR Code de inscrição. ${pc.indicacao ? `Indicação: ${pc.indicacao}.` : ""}`.trim(),
        status: "Ativo", origem: "CAT App",
      });
      await logVenda("create", { entity_type: "Student", entity_id: aluno.id, entity_name: aluno.full_name, details: "FASE 2 QR Code: aluno criado a partir de pré-cadastro validado" });
      await mudarStatus("Validado", `pré-cadastro validado e aluno criado (${aluno.full_name})`, { student_id_vinculado: aluno.id });
      queryClient.invalidateQueries({ queryKey: ["students-pf"] });
    } catch (e) {
      toast.error("Erro ao criar aluno: " + e.message);
      setBusy(false);
    }
  };

  const handleVerDoc = async (doc) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
      window.open(signed_url, "_blank");
    } catch {
      toast.error("Não foi possível abrir o documento.");
    }
  };

  const jaConvertido = pc.status === "Convertido em matrícula";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pré-Cadastro — {pc.nome_completo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-gray-50 rounded-md p-3">
            <p><span className="text-gray-500 text-xs">CPF:</span> <span className="font-mono">{pc.cpf}</span> {pc.cpf_valido ? "✅" : <span className="text-red-600 text-xs font-semibold">⚠ inválido</span>}</p>
            <p><span className="text-gray-500 text-xs">Telefone:</span> {pc.telefone}</p>
            <p className="col-span-2"><span className="text-gray-500 text-xs">E-mail:</span> {pc.email}</p>
            <p className="col-span-2"><span className="text-gray-500 text-xs">Endereço:</span> {pc.endereco}, {pc.cidade}/{pc.estado} — {pc.cep}</p>
            {pc.data_nascimento && <p><span className="text-gray-500 text-xs">Nascimento:</span> {pc.data_nascimento}</p>}
            {pc.indicacao && <p><span className="text-gray-500 text-xs">Indicação:</span> {pc.indicacao}</p>}
            <p className="col-span-2"><span className="text-gray-500 text-xs">Interesse:</span> {pc.oferta_nome || pc.pacote_nome || "Geral (definir com o aluno)"}</p>
            <p><span className="text-gray-500 text-xs">Origem:</span> {pc.origem}</p>
            <p><span className="text-gray-500 text-xs">Atendente:</span> {pc.atendente_nome || "—"}</p>
            <p className="col-span-2 text-xs text-gray-400">Enviado em {new Date(pc.created_date).toLocaleString("pt-BR")} • LGPD aceito em {pc.lgpd_aceito_em ? new Date(pc.lgpd_aceito_em).toLocaleString("pt-BR") : "—"}{pc.lgpd_ip ? ` • IP ${pc.lgpd_ip}` : ""}</p>
            {pc.observacoes && <p className="col-span-2 text-xs"><span className="text-gray-500">Obs:</span> {pc.observacoes}</p>}
            {pc.motivo_status && <p className="col-span-2 text-xs text-orange-700"><span className="text-gray-500">Motivo status:</span> {pc.motivo_status}</p>}
          </div>

          {/* Duplicidade */}
          {alunoExistente && !jaConvertido && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
              <p className="text-sm text-blue-900 font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Aluno já encontrado pelo CPF. Deseja vincular este pré-cadastro ao cadastro existente?</p>
              <p className="text-xs text-blue-800"><strong>{alunoExistente.full_name}</strong> — {alunoExistente.cpf}</p>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs h-8" disabled={busy} onClick={handleVincular}>
                <Link2 className="w-3.5 h-3.5 mr-1" /> Vincular ao aluno existente
              </Button>
            </div>
          )}

          {/* Documentos */}
          <div className="border rounded-md p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Documentos enviados ({(pc.documentos || []).length})</p>
            {(pc.documentos || []).length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum documento enviado.</p>
            ) : (
              (pc.documentos || []).map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-gray-50 rounded p-2">
                  <div className="text-xs">
                    <span className="font-medium">{d.tipo} — {d.lado}</span>
                    <Badge className={`ml-2 text-xs ${d.status_documento === "Validado" ? "bg-green-100 text-green-700" : d.status_documento === "Rejeitado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"}`}>{d.status_documento || "Pendente de validação"}</Badge>
                    {d.tipo === "CNH" && d.cnh_numero && <p className="text-gray-500 mt-0.5">CNH {d.cnh_numero} • Cat. {d.cnh_categoria || "—"} • Val. {d.cnh_validade || "—"}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleVerDoc(d)}>
                    <Eye className="w-3 h-3 mr-1" /> Ver
                  </Button>
                </div>
              ))
            )}
            <p className="text-[11px] text-gray-400">Validação individual de documentos: aba "Documentos Pendentes".</p>
          </div>

          {/* Ações */}
          {!jaConvertido && (
            <>
              <div>
                <Label className="text-xs">Motivo / justificativa (para rejeição ou correção)</Label>
                <Textarea rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: CPF ilegível, dados incompletos..." />
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" disabled={busy} onClick={() => onConverter(pc)}>
                  <Zap className="w-3.5 h-3.5 mr-1" /> Converter em Matrícula
                </Button>
                {!alunoExistente && pc.cpf_valido && (
                  <Button size="sm" variant="outline" className="text-xs border-green-300 text-green-700 hover:bg-green-50" disabled={busy} onClick={handleCriarAluno}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Validar e criar aluno
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs" disabled={busy || pc.status === "Validado"}
                  onClick={() => mudarStatus("Validado", "pré-cadastro validado pelo operador")}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Validar
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50" disabled={busy}
                  onClick={() => { if (!motivo.trim()) { toast.error("Informe o motivo da correção."); return; } mudarStatus("Corrigir dados", "solicitação de correção de dados registrada"); }}>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Solicitar correção
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-700 hover:bg-red-50" disabled={busy}
                  onClick={() => { if (!motivo.trim()) { toast.error("Informe o motivo da rejeição."); return; } mudarStatus("Rejeitado", "pré-cadastro rejeitado pelo operador"); }}>
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-700" disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Descartar este pré-cadastro (spam/teste)? Esta ação remove o registro.")) return;
                    setBusy(true);
                    await logVenda("delete", { entity_type: "PreCadastro", entity_id: pc.id, entity_name: pc.nome_completo, details: "FASE 2 QR Code: pré-cadastro descartado pelo operador (spam/teste)" });
                    await base44.entities.PreCadastro.delete(pc.id);
                    queryClient.invalidateQueries({ queryKey: ["pre-cadastros"] });
                    toast.success("Pré-cadastro descartado.");
                    onClose();
                  }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Descartar
                </Button>
              </div>
            </>
          )}
          {jaConvertido && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">
              ✅ Este pré-cadastro já foi convertido em matrícula ({(pc.enrollment_ids || []).length} matrícula(s)).
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PreCadastrosTab() {
  const [sub, setSub] = useState("pre"); // pre | docs
  const [fStatus, setFStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [convertendo, setConvertendo] = useState(null);

  const { data: preCadastros = [], isLoading } = useQuery({
    queryKey: ["pre-cadastros"],
    queryFn: () => base44.entities.PreCadastro.list("-created_date", 300),
  });
  const { data: students = [] } = useQuery({ queryKey: ["students-pf"], queryFn: () => base44.entities.Student.list("-created_date") });

  const norm = (v) => (v || "").toString().toLowerCase();
  const filtrados = preCadastros.filter(pc =>
    (fStatus === "all" || pc.status === fStatus) &&
    (!search || norm(pc.nome_completo).includes(norm(search)) || limparCPF(pc.cpf).includes(limparCPF(search)))
  );

  const pendentes = preCadastros.filter(pc => ["Aguardando validação", "Duplicidade identificada", "Corrigir dados"].includes(pc.status)).length;

  return (
    <div className="space-y-4">
      {detalhe && (
        <DetalheDialog pc={detalhe} students={students} onClose={() => setDetalhe(null)} onConverter={(pc) => { setDetalhe(null); setConvertendo(pc); }} />
      )}
      {convertendo && (
        <ConverterPreCadastroModal preCadastro={convertendo} onClose={() => setConvertendo(null)} onSuccess={() => setConvertendo(null)} />
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setSub("pre")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === "pre" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
          <Inbox className="w-4 h-4" /> Pré-Cadastros {pendentes > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-1">{pendentes}</Badge>}
        </button>
        <button onClick={() => setSub("docs")} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${sub === "docs" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
          <FileText className="w-4 h-4" /> Documentos Pendentes
        </button>
      </div>

      {sub === "docs" ? <DocumentosPendentesView /> : (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-10" placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.keys(STATUS_COLOR).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="border border-gray-200">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-gray-400">Carregando...</div>
              ) : filtrados.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Inbox className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum pré-cadastro encontrado. As inscrições enviadas pelo QR Code aparecerão aqui.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtrados.map(pc => (
                    <div key={pc.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{pc.nome_completo}</p>
                          <Badge className={`text-xs ${STATUS_COLOR[pc.status] || "bg-gray-100 text-gray-600"}`}>{pc.status}</Badge>
                          {!pc.cpf_valido && <Badge className="bg-red-100 text-red-700 text-xs">CPF inválido</Badge>}
                          {(pc.documentos || []).length > 0 && <Badge className="bg-gray-100 text-gray-600 text-xs">📎 {(pc.documentos || []).length} doc(s)</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{pc.cpf} • {pc.telefone} • {pc.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {pc.oferta_nome || pc.pacote_nome || "Interesse geral"} • Origem: {pc.origem}
                          {pc.atendente_nome && ` • Atendente: ${pc.atendente_nome}`} • {new Date(pc.created_date).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setDetalhe(pc)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Analisar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}