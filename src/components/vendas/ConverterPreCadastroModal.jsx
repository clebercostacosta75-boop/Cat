import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, User, Package, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { limparCPF } from "@/lib/cpf";
import { logVenda } from "@/lib/auditVendas";
import { executarVenda } from "@/lib/executarVenda";

const STATUS_PGTO = ["Pendente", "Pago", "Aguardando Confirmação", "Cancelado", "Cortesia"];

export default function ConverterPreCadastroModal({ preCadastro, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tipo, setTipo] = useState(preCadastro.pacote_id ? "pacote" : "oferta");
  const [ofertaId, setOfertaId] = useState(preCadastro.oferta_id || "");
  const [pacoteId, setPacoteId] = useState(preCadastro.pacote_id || "");
  const [datasPacote, setDatasPacote] = useState([]);
  const [pgto, setPgto] = useState({ desconto: "0", forma_pagamento: "", parcelas: "1", vencimento: "", status_pagamento: "Pendente", observacao_financeira: "" });
  const [atendenteNome, setAtendenteNome] = useState(preCadastro.atendente_nome || "");
  const [saving, setSaving] = useState(false);

  const isMaster = ["admin", "Administrador Master", "gestor_master"].includes(user?.role);

  const { data: students = [] } = useQuery({ queryKey: ["students-pf"], queryFn: () => base44.entities.Student.list("-created_date") });
  const { data: ofertas = [] } = useQuery({ queryKey: ["course-offers"], queryFn: () => base44.entities.CourseOffer.list("-created_date", 200) });
  const { data: pacotes = [] } = useQuery({ queryKey: ["course-packages"], queryFn: () => base44.entities.CoursePackage.list("-created_date", 200) });

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); if (!preCadastro.atendente_nome) setAtendenteNome(u?.full_name || u?.email || ""); }).catch(() => {});
  }, [preCadastro]);

  const oferta = ofertas.find(o => o.id === ofertaId);
  const pacote = pacotes.find(p => p.id === pacoteId);

  useEffect(() => {
    if (pacote) setDatasPacote((pacote.cursos || []).map(c => ({ ...c })));
  }, [pacoteId, pacotes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aluno: vinculado > detectado por CPF > novo
  const digits = limparCPF(preCadastro.cpf);
  const alunoVinculado = students.find(s => s.id === preCadastro.student_id_vinculado);
  const alunoPorCpf = alunoVinculado || students.find(s => limparCPF(s.cpf) === digits);

  const vagasDisp = (item) => Math.max(0, (item?.vagas_total || 0) - (item?.vagas_preenchidas || 0));
  const valorOriginal = tipo === "oferta" ? (oferta?.valor || 0) : (pacote?.valor_final ?? pacote?.valor_total ?? 0);
  const valorFinal = Math.max(0, valorOriginal - (parseFloat(pgto.desconto) || 0));
  const formasAceitas = (tipo === "oferta" ? oferta?.formas_pagamento : pacote?.formas_pagamento) || [];

  const handleConverter = async () => {
    const item = tipo === "oferta" ? oferta : pacote;
    if (!item) { toast.error(tipo === "oferta" ? "Confirme a oferta de curso." : "Confirme o pacote."); return; }
    if (vagasDisp(item) <= 0 && !isMaster) { toast.error("Sem vagas disponíveis nesta oferta."); return; }
    if (!pgto.forma_pagamento) { toast.error("Confirme a forma de pagamento."); return; }
    if (!alunoPorCpf && !preCadastro.cpf_valido) { toast.error("CPF inválido — solicite correção ao aluno antes de converter."); return; }

    const cursosMatricula = tipo === "oferta"
      ? [{ course_id: item.course_id, course_name: item.course_name, carga_horaria: item.carga_horaria, data_inicio: item.data_inicio, data_termino: item.data_termino }]
      : datasPacote;
    for (const c of cursosMatricula) {
      if (!c.data_inicio || !c.data_termino) { toast.error(`Defina o período de realização do curso "${c.course_name}".`); return; }
      if (c.data_inicio > c.data_termino) { toast.error(`Curso "${c.course_name}": data de início posterior ao término.`); return; }
    }
    if (cursosMatricula.length === 0) { toast.error("Nenhum curso definido."); return; }

    setSaving(true);
    try {
      const { aluno, matriculas } = await executarVenda({
        user, atendenteId: preCadastro.atendente_id || user?.id || "", atendenteNome,
        alunoExistente: alunoPorCpf || null,
        novoAluno: {
          full_name: preCadastro.nome_completo, whatsapp: preCadastro.telefone, email: preCadastro.email,
          logradouro: preCadastro.endereco, cidade: preCadastro.cidade, estado: preCadastro.estado, cep: preCadastro.cep,
          data_nascimento: preCadastro.data_nascimento || "",
          notes: `Cadastro via QR Code de inscrição. ${preCadastro.indicacao ? `Indicação: ${preCadastro.indicacao}.` : ""}`.trim(),
        },
        cpf: preCadastro.cpf,
        tipo, item, cursosMatricula, pgto,
        origemInscricao: preCadastro.atendente_id ? "QR Code do Atendente" : "QR Code",
        auditPrefix: "FASE 2 QR Code",
        extraEnrollment: { pre_cadastro_id: preCadastro.id },
      });

      await base44.entities.PreCadastro.update(preCadastro.id, {
        status: "Convertido em matrícula",
        student_id_vinculado: aluno.id,
        enrollment_ids: matriculas.map(m => m.id),
        validado_por: user?.email || "", validado_em: new Date().toISOString(),
      });
      await logVenda("update", {
        entity_type: "PreCadastro", entity_id: preCadastro.id, entity_name: preCadastro.nome_completo,
        details: `FASE 2 QR Code: pré-cadastro convertido em matrícula (${matriculas.length} matrícula(s)). Aluno ${alunoPorCpf ? "existente vinculado" : "criado"}: ${aluno.full_name}. Atendente: ${atendenteNome}`,
      });

      toast.success(`Pré-cadastro convertido! ${matriculas.length} matrícula(s) criada(s).`);
      ["pre-cadastros", "enrollments-pf", "students-pf", "course-offers", "course-packages"].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [k] }));
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao converter: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-600" /> Converter Pré-Cadastro em Matrícula</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Aluno */}
          <div className={`p-3 rounded-md border ${alunoPorCpf ? "bg-blue-50 border-blue-200" : "bg-gray-50"}`}>
            <p className="text-sm font-semibold flex items-center gap-1.5"><User className="w-4 h-4" /> {preCadastro.nome_completo}</p>
            <p className="text-xs text-gray-500 font-mono">{preCadastro.cpf} • {preCadastro.telefone}</p>
            {alunoPorCpf ? (
              <p className="text-xs text-blue-800 mt-1">✔ Aluno já encontrado pelo CPF (<strong>{alunoPorCpf.full_name}</strong>). O pré-cadastro será vinculado ao cadastro existente — sem duplicidade.</p>
            ) : (
              <p className="text-xs text-emerald-700 mt-1">Novo aluno será criado com os dados do pré-cadastro.</p>
            )}
          </div>

          {/* Curso / Pacote */}
          <div className="border rounded-md p-3 space-y-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button onClick={() => setTipo("oferta")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${tipo === "oferta" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}><BookOpen className="w-3.5 h-3.5" /> Curso Avulso</button>
              <button onClick={() => setTipo("pacote")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${tipo === "pacote" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}><Package className="w-3.5 h-3.5" /> Pacote</button>
            </div>
            {tipo === "oferta" ? (
              <>
                <Select value={ofertaId} onValueChange={setOfertaId}>
                  <SelectTrigger><SelectValue placeholder="Confirme a oferta de curso..." /></SelectTrigger>
                  <SelectContent>
                    {ofertas.map(o => <SelectItem key={o.id} value={o.id}>{o.nome_comercial} — {vagasDisp(o)} vaga(s)</SelectItem>)}
                  </SelectContent>
                </Select>
                {oferta && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-2">
                    📅 {oferta.data_inicio || "—"} → {oferta.data_termino || "—"} • 🎟 {vagasDisp(oferta)} vaga(s) • <Badge className="text-xs bg-gray-200 text-gray-700">{oferta.status}</Badge>
                    {vagasDisp(oferta) <= 0 && <p className="text-red-600 font-semibold flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Sem vagas.{isMaster ? " (Master pode prosseguir)" : ""}</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <Select value={pacoteId} onValueChange={setPacoteId}>
                  <SelectTrigger><SelectValue placeholder="Confirme o pacote..." /></SelectTrigger>
                  <SelectContent>
                    {pacotes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} — {vagasDisp(p)} vaga(s)</SelectItem>)}
                  </SelectContent>
                </Select>
                {pacote && datasPacote.map((c, i) => (
                  <div key={c.course_id} className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
                    <span className="text-xs font-medium text-gray-800 flex-1">{c.course_name}</span>
                    <Input type="date" className="h-7 text-xs w-32" value={c.data_inicio || ""} onChange={e => setDatasPacote(d => d.map((x, j) => j === i ? { ...x, data_inicio: e.target.value } : x))} />
                    <span className="text-xs text-gray-400">→</span>
                    <Input type="date" className="h-7 text-xs w-32" value={c.data_termino || ""} onChange={e => setDatasPacote(d => d.map((x, j) => j === i ? { ...x, data_termino: e.target.value } : x))} />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Pagamento */}
          <div className="border rounded-md p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirmar pagamento</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><Label className="text-xs">Valor</Label><div className="h-9 px-2 flex items-center border rounded-md bg-gray-50 text-sm">R$ {valorOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
              <div><Label className="text-xs">Desconto (R$)</Label><Input type="number" min="0" step="0.01" value={pgto.desconto} onChange={e => setPgto(p => ({ ...p, desconto: e.target.value }))} /></div>
              <div><Label className="text-xs">Valor Final</Label><div className="h-9 px-2 flex items-center border rounded-md bg-emerald-50 text-emerald-800 font-bold text-sm">R$ {valorFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
              <div>
                <Label className="text-xs">Parcelas</Label>
                <Select value={pgto.parcelas} onValueChange={v => setPgto(p => ({ ...p, parcelas: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Forma de Pagamento *</Label>
                <Select value={pgto.forma_pagamento} onValueChange={v => setPgto(p => ({ ...p, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{(formasAceitas.length ? formasAceitas : ["Pix", "Boleto", "Dinheiro"]).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Vencimento</Label><Input type="date" value={pgto.vencimento} onChange={e => setPgto(p => ({ ...p, vencimento: e.target.value }))} /></div>
              <div>
                <Label className="text-xs">Status Pgto</Label>
                <Select value={pgto.status_pagamento} onValueChange={v => setPgto(p => ({ ...p, status_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_PGTO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Atendente */}
          <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-md">
            <User className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-indigo-800">Atendente responsável:</span>
            <Input className="h-7 text-xs flex-1" value={atendenteNome} onChange={e => setAtendenteNome(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConverter} disabled={saving}>
              {saving ? "Convertendo..." : <><CheckCircle className="w-4 h-4 mr-1" /> Converter em Matrícula</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}