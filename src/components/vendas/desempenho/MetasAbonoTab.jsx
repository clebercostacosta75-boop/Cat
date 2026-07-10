import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Target, Plus, Edit, Award, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";
import { fmtBRL, dataDe, inicioSemana, fimSemana, isCancelada, valorDe, statusMeta } from "./desempenhoUtils";

const EMPTY_META = { escopo: "Geral", atendente_nome: "", periodo_tipo: "Mensal", periodo_referencia: "", meta_inscricoes: "", meta_valor: "" };

function MetaFormDialog({ meta, atendentes, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_META);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meta) setForm({ ...EMPTY_META, ...meta, meta_inscricoes: String(meta.meta_inscricoes ?? ""), meta_valor: String(meta.meta_valor ?? "") });
    else setForm({ ...EMPTY_META, periodo_referencia: new Date().toISOString().slice(0, 7) });
  }, [meta]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePeriodoTipo = (v) => {
    setForm(f => ({ ...f, periodo_tipo: v, periodo_referencia: v === "Mensal" ? new Date().toISOString().slice(0, 7) : inicioSemana() }));
  };

  const handleSave = async () => {
    if (!form.periodo_referencia) { toast.error("Informe o período de referência."); return; }
    if (form.escopo === "Atendente" && !form.atendente_nome) { toast.error("Selecione o atendente."); return; }
    if (!(parseFloat(form.meta_inscricoes) > 0) && !(parseFloat(form.meta_valor) > 0)) { toast.error("Informe pelo menos uma meta (inscrições ou valor)."); return; }
    setSaving(true);
    try {
      const data = {
        escopo: form.escopo,
        atendente_nome: form.escopo === "Atendente" ? form.atendente_nome : "",
        periodo_tipo: form.periodo_tipo,
        periodo_referencia: form.periodo_referencia,
        meta_inscricoes: parseFloat(form.meta_inscricoes) || 0,
        meta_valor: parseFloat(form.meta_valor) || 0,
        ativa: true,
      };
      const alvo = form.escopo === "Atendente" ? form.atendente_nome : "Equipe (geral)";
      if (meta?.id) {
        await base44.entities.MetaAtendente.update(meta.id, data);
        await logVenda("update", { entity_type: "MetaAtendente", entity_id: meta.id, entity_name: `Meta ${form.periodo_tipo} — ${alvo}`, details: `FASE 3 Desempenho: meta alterada. Período ${form.periodo_referencia}. Inscrições: ${data.meta_inscricoes}. Valor: ${fmtBRL(data.meta_valor)}` });
        toast.success("Meta atualizada!");
      } else {
        const nova = await base44.entities.MetaAtendente.create(data);
        await logVenda("create", { entity_type: "MetaAtendente", entity_id: nova.id, entity_name: `Meta ${form.periodo_tipo} — ${alvo}`, details: `FASE 3 Desempenho: meta criada. Período ${form.periodo_referencia}. Inscrições: ${data.meta_inscricoes}. Valor: ${fmtBRL(data.meta_valor)}` });
        toast.success("Meta criada!");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> {meta ? "Editar Meta" : "Nova Meta"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Escopo</Label>
              <Select value={form.escopo} onValueChange={v => set("escopo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral (equipe)</SelectItem>
                  <SelectItem value="Atendente">Por atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.escopo === "Atendente" && (
              <div>
                <Label className="text-xs">Atendente</Label>
                <Select value={form.atendente_nome} onValueChange={v => set("atendente_nome", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{atendentes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Tipo de período</Label>
              <Select value={form.periodo_tipo} onValueChange={handlePeriodoTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{form.periodo_tipo === "Mensal" ? "Mês (AAAA-MM)" : "Início da semana"}</Label>
              {form.periodo_tipo === "Mensal" ? (
                <Input type="month" value={form.periodo_referencia} onChange={e => set("periodo_referencia", e.target.value)} />
              ) : (
                <Input type="date" value={form.periodo_referencia} onChange={e => set("periodo_referencia", e.target.value)} />
              )}
            </div>
            <div>
              <Label className="text-xs">Meta de inscrições</Label>
              <Input type="number" min="0" value={form.meta_inscricoes} onChange={e => set("meta_inscricoes", e.target.value)} placeholder="Ex: 30" />
            </div>
            <div>
              <Label className="text-xs">Meta de valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.meta_valor} onChange={e => set("meta_valor", e.target.value)} placeholder="Ex: 8000" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Meta"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AbonoDialog({ meta, realizado, onClose, onSaved }) {
  const [elegivel, setElegivel] = useState(meta.elegivel_para_abono ? "sim" : "nao");
  const [obs, setObs] = useState(meta.observacao_abono || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.MetaAtendente.update(meta.id, {
        elegivel_para_abono: elegivel === "sim",
        observacao_abono: obs,
        analisado_por: user?.email || "",
        analisado_em: new Date().toISOString(),
      });
      await logVenda("update", {
        entity_type: "MetaAtendente", entity_id: meta.id,
        entity_name: `Meta ${meta.periodo_tipo} — ${meta.atendente_nome || "Equipe (geral)"}`,
        details: `FASE 3 Desempenho: análise de abono registrada — elegível: ${elegivel === "sim" ? "SIM" : "NÃO"}. Realizado: ${realizado.inscricoes} inscrições / ${fmtBRL(realizado.valor)}. ${obs ? `Obs: ${obs}.` : ""} Sem pagamento automático — decisão manual futura do gestor.`,
      });
      toast.success("Análise de abono registrada (referência — sem pagamento automático).");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Base para Abono/Bônus</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
            <p><span className="text-gray-500 text-xs">Meta:</span> {meta.periodo_tipo} — {meta.atendente_nome || "Equipe (geral)"} — {meta.periodo_referencia}</p>
            <p><span className="text-gray-500 text-xs">Realizado:</span> {realizado.inscricoes} inscrições • {realizado.pagas} pagas • {fmtBRL(realizado.valor)} vendidos</p>
          </div>
          <div>
            <Label className="text-xs">Elegível para abono? (referência futura)</Label>
            <Select value={elegivel} onValueChange={setElegivel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">✅ Sim</SelectItem>
                <SelectItem value="nao">❌ Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Observação do gestor</Label>
            <Textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Superou a meta mensal, considerar abono no fechamento..." />
          </div>
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">⚠️ Apenas referência — nenhum pagamento ou lançamento financeiro é gerado automaticamente. O abono será decidido manualmente pelo gestor.</p>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Registrar Análise"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MetasAbonoTab({ vendas, atendentes }) {
  const queryClient = useQueryClient();
  const [formMeta, setFormMeta] = useState(null); // null | "nova" | meta
  const [abonoMeta, setAbonoMeta] = useState(null);

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ["metas-atendente"],
    queryFn: () => base44.entities.MetaAtendente.list("-created_date", 100),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["metas-atendente"] });

  const realizadoDe = (meta) => {
    const noPeriodo = vendas.filter(e => {
      if (meta.escopo === "Atendente" && e.atendente_nome !== meta.atendente_nome) return false;
      const d = dataDe(e);
      if (meta.periodo_tipo === "Mensal") return d.slice(0, 7) === meta.periodo_referencia;
      return d >= meta.periodo_referencia && d <= fimSemana(meta.periodo_referencia);
    }).filter(e => !isCancelada(e));
    return {
      inscricoes: noPeriodo.length,
      pagas: noPeriodo.filter(e => e.status_pagamento === "Pago").length,
      valor: noPeriodo.reduce((s, e) => s + valorDe(e), 0),
    };
  };

  const handleExcluir = async (meta) => {
    if (!window.confirm("Excluir esta meta?")) return;
    await logVenda("delete", { entity_type: "MetaAtendente", entity_id: meta.id, entity_name: `Meta ${meta.periodo_tipo} — ${meta.atendente_nome || "Equipe (geral)"}`, details: `FASE 3 Desempenho: meta excluída (período ${meta.periodo_referencia})` });
    await base44.entities.MetaAtendente.delete(meta.id);
    refresh();
    toast.success("Meta excluída.");
  };

  return (
    <div className="space-y-3">
      {formMeta && <MetaFormDialog meta={formMeta === "nova" ? null : formMeta} atendentes={atendentes} onClose={() => setFormMeta(null)} onSaved={refresh} />}
      {abonoMeta && <AbonoDialog meta={abonoMeta} realizado={realizadoDe(abonoMeta)} onClose={() => setAbonoMeta(null)} onSaved={refresh} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Metas semanais e mensais de inscrições e valor vendido — base para futuro abono/bônus manual.</p>
        <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setFormMeta("nova")}>
          <Plus className="w-4 h-4 mr-1" /> Nova Meta
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400">Carregando...</div>
      ) : metas.length === 0 ? (
        <Card className="border border-gray-200">
          <CardContent className="py-12 text-center text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma meta cadastrada. Crie a primeira meta semanal ou mensal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metas.map(meta => {
            const r = realizadoDe(meta);
            const pctInsc = meta.meta_inscricoes > 0 ? Math.round((r.inscricoes / meta.meta_inscricoes) * 100) : null;
            const pctValor = meta.meta_valor > 0 ? Math.round((r.valor / meta.meta_valor) * 100) : null;
            const pctRef = pctInsc ?? pctValor ?? 0;
            const st = statusMeta(pctRef);
            return (
              <Card key={meta.id} className="border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Target className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{meta.periodo_tipo} — {meta.atendente_nome || "Equipe (geral)"}</span>
                    </span>
                    <Badge className={`text-xs flex-shrink-0 ${st.cls}`}>{st.label}</Badge>
                  </CardTitle>
                  <p className="text-xs text-gray-400">Período: {meta.periodo_referencia}{meta.periodo_tipo === "Semanal" ? ` → ${fimSemana(meta.periodo_referencia)}` : ""}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pctInsc !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Inscrições: {r.inscricoes} / {meta.meta_inscricoes}</span>
                        <span className="font-semibold">{pctInsc}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pctInsc >= 100 ? "bg-emerald-500" : pctInsc >= 50 ? "bg-blue-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, pctInsc)}%` }} />
                      </div>
                    </div>
                  )}
                  {pctValor !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Valor: {fmtBRL(r.valor)} / {fmtBRL(meta.meta_valor)}</span>
                        <span className="font-semibold">{pctValor}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pctValor >= 100 ? "bg-emerald-500" : pctValor >= 50 ? "bg-blue-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, pctValor)}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="text-xs">
                      {meta.analisado_em ? (
                        <span className={meta.elegivel_para_abono ? "text-emerald-700" : "text-gray-500"}>
                          {meta.elegivel_para_abono ? "✅ Elegível p/ abono" : "❌ Não elegível"} — {meta.analisado_por}
                        </span>
                      ) : (
                        <span className="text-gray-400">Abono não analisado</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setAbonoMeta(meta)}>
                        <Award className="w-3 h-3 mr-1" /> Abono
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFormMeta(meta)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleExcluir(meta)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {meta.observacao_abono && <p className="text-xs text-gray-500 bg-gray-50 rounded p-1.5">💬 {meta.observacao_abono}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400">Sem cálculo automático de comissão, sem lançamento financeiro e sem pagamento automático — o abono é decidido manualmente pelo gestor.</p>
    </div>
  );
}