import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LancamentoModal({ open, onClose, lancamento, tipo }) {
  const [form, setForm] = useState({
    tipo: tipo || "Receita",
    natureza: "Previsto",
    status: "Pendente",
    descricao: "",
    valor: "",
    valor_pago: "",
    data_vencimento: "",
    data_pagamento: "",
    data_competencia: "",
    forma_pagamento: "",
    categoria_nome: "",
    centro_custo_nome: "",
    cliente_nome: "",
    fornecedor_nome: "",
    curso_nome: "",
    numero_documento: "",
    total_parcelas: 1,
    numero_parcela: 1,
    observacoes: "",
    origem_modulo: "Manual",
  });
  const [categorias, setCategorias] = useState([]);
  const [centros, setCentros] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.CategoriaFinanceira.filter({ ativo: true }).then(setCategorias).catch(() => {});
    base44.entities.CentroCusto.filter({ ativo: true }).then(setCentros).catch(() => {});
  }, []);

  useEffect(() => {
    if (lancamento) {
      setForm({ ...form, ...lancamento });
    } else {
      setForm(f => ({ ...f, tipo: tipo || "Receita" }));
    }
  }, [lancamento, tipo]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      toast.error("Preencha descrição, valor e vencimento.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, valor: parseFloat(form.valor), valor_pago: parseFloat(form.valor_pago || 0) };
      if (lancamento?.id) {
        await base44.entities.LancamentoFinanceiro.update(lancamento.id, payload);
        toast.success("Lançamento atualizado!");
      } else {
        await base44.entities.LancamentoFinanceiro.create(payload);
        toast.success("Lançamento criado!");
      }
      onClose(true);
    } catch {
      toast.error("Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lancamento ? "Editar" : "Novo"} Lançamento — {form.tipo}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="md:col-span-2">
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Ex: Pagamento turma NR-35 — Empresa XYZ" />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Receita">Receita</SelectItem>
                <SelectItem value="Despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Pendente","Aprovado","Pago","Recebido","Vencido","Cancelado","Parcial"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor Total *</Label>
            <Input type="number" value={form.valor} onChange={e => set("valor", e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Valor Pago/Recebido</Label>
            <Input type="number" value={form.valor_pago} onChange={e => set("valor_pago", e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Data de Vencimento *</Label>
            <Input type="date" value={form.data_vencimento} onChange={e => set("data_vencimento", e.target.value)} />
          </div>
          <div>
            <Label>Data de Pagamento</Label>
            <Input type="date" value={form.data_pagamento} onChange={e => set("data_pagamento", e.target.value)} />
          </div>
          <div>
            <Label>Data de Competência</Label>
            <Input type="date" value={form.data_competencia} onChange={e => set("data_competencia", e.target.value)} />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={v => set("forma_pagamento", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {["Dinheiro","PIX","TED","DOC","Boleto","Cartão de Crédito","Cartão de Débito","Cheque","Transferência","Outro"].map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria_nome} onValueChange={v => set("categoria_nome", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias.filter(c => c.tipo === form.tipo || !c.tipo).map(c => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
                <SelectItem value="__outro">Outro (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {form.categoria_nome === "__outro" && (
              <Input className="mt-1" placeholder="Nome da categoria" onChange={e => set("categoria_nome", e.target.value)} />
            )}
          </div>
          <div>
            <Label>Centro de Custo</Label>
            <Select value={form.centro_custo_nome} onValueChange={v => set("centro_custo_nome", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {centros.map(c => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{form.tipo === "Receita" ? "Cliente/Empresa" : "Fornecedor"}</Label>
            <Input
              value={form.tipo === "Receita" ? form.cliente_nome : form.fornecedor_nome}
              onChange={e => set(form.tipo === "Receita" ? "cliente_nome" : "fornecedor_nome", e.target.value)}
              placeholder="Nome"
            />
          </div>
          <div>
            <Label>Curso vinculado</Label>
            <Input value={form.curso_nome} onChange={e => set("curso_nome", e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>Nº Documento (NF/Boleto)</Label>
            <Input value={form.numero_documento} onChange={e => set("numero_documento", e.target.value)} />
          </div>
          <div>
            <Label>Parcela Nº</Label>
            <Input type="number" value={form.numero_parcela} onChange={e => set("numero_parcela", parseInt(e.target.value))} min={1} />
          </div>
          <div>
            <Label>Total de Parcelas</Label>
            <Input type="number" value={form.total_parcelas} onChange={e => set("total_parcelas", parseInt(e.target.value))} min={1} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onClose()}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}