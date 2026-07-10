import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { EVENTOS, CANAIS, VARIAVEIS_DISPONIVEIS, templateEvento } from "@/lib/comunicacao";

const EMPTY = { nome: "", canal: "WhatsApp", evento: "inscricao_confirmada", texto: "", ativo: true };

// FASE 6 — Área de Modelos de Mensagem (sobrepõem os modelos padrão do sistema)
export default function ModelosMensagemModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null); // null = lista; objeto = edição/criação

  const { data: modelos = [] } = useQuery({
    queryKey: ["modelos-mensagem-all"],
    queryFn: () => base44.entities.ModeloMensagem.list("-created_date", 100),
  });

  const salvar = async () => {
    if (!form.nome.trim() || !form.texto.trim()) { toast.error("Nome e texto são obrigatórios."); return; }
    const user = await base44.auth.me().catch(() => null);
    const isEdit = !!form.id;
    let registro;
    if (isEdit) {
      const { id, ...data } = form;
      registro = await base44.entities.ModeloMensagem.update(id, data);
    } else {
      registro = await base44.entities.ModeloMensagem.create(form);
    }
    await base44.entities.AuditLog.create({
      user_email: user?.email || "sistema", user_name: user?.full_name || user?.email || "Sistema",
      action: isEdit ? "update" : "create",
      entity_type: "ModeloMensagem", entity_id: registro?.id || form.id || "",
      entity_name: form.nome,
      details: `FASE 6 Comunicação: modelo de mensagem ${isEdit ? "ALTERADO" : "CRIADO"} — "${form.nome}" | evento: ${form.evento} | canal: ${form.canal} | ativo: ${form.ativo ? "sim" : "não"}`,
    }).catch(() => {});
    toast.success(isEdit ? "Modelo atualizado!" : "Modelo criado!");
    queryClient.invalidateQueries({ queryKey: ["modelos-mensagem-all"] });
    queryClient.invalidateQueries({ queryKey: ["modelos-mensagem"] });
    setForm(null);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">📝 Modelos de Mensagem</DialogTitle>
        </DialogHeader>

        {!form ? (
          <div className="space-y-3">
            <Button size="sm" className="bg-indigo-700 hover:bg-indigo-800" onClick={() => setForm({ ...EMPTY })}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Modelo
            </Button>
            <p className="text-[11px] text-gray-500">Os 22 eventos possuem <strong>modelos padrão do sistema</strong>. Um modelo cadastrado e ativo aqui substitui o padrão para o mesmo evento/canal.</p>
            <div className="space-y-2">
              {modelos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum modelo personalizado — usando os modelos padrão do sistema.</p>
              ) : modelos.map((m) => (
                <div key={m.id} className="border rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{m.nome}</p>
                    <p className="text-[10px] text-gray-500">{EVENTOS.find((e) => e.key === m.evento)?.label || m.evento} • {m.canal}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-md">{m.texto}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge className={m.ativo ? "bg-green-100 text-green-800 text-[10px]" : "bg-gray-100 text-gray-500 text-[10px]"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setForm({ ...m })}><Edit className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Nome do Modelo *</Label>
                <Input className="h-8 text-xs" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Evento disparador</Label>
                <Select value={form.evento} onValueChange={(v) => setForm({ ...form, evento: v, texto: form.texto || templateEvento(v) })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENTOS.map((e) => <SelectItem key={e.key} value={e.key} className="text-xs">{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Canal</Label>
                <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CANAIS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Texto da Mensagem *</Label>
                <button className="text-[10px] text-indigo-700 underline" onClick={() => setForm({ ...form, texto: templateEvento(form.evento) })}>Usar modelo padrão</button>
              </div>
              <Textarea rows={9} className="text-xs font-mono mt-1" value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
            </div>
            <div className="bg-gray-50 border rounded p-2">
              <p className="text-[10px] font-semibold text-gray-600 mb-1">Variáveis disponíveis:</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">{VARIAVEIS_DISPONIVEIS.join("  ")}</p>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="accent-indigo-700" />
              Modelo ativo (substitui o padrão do sistema)
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setForm(null)}>Voltar</Button>
              <Button size="sm" className="bg-indigo-700 hover:bg-indigo-800" onClick={salvar}>Salvar Modelo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}