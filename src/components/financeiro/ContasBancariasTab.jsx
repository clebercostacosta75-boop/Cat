import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const TIPOS = ["Caixa", "Conta Corrente", "Conta Poupança", "Conta de Investimento", "Cartão de Crédito", "Cartão de Débito"];

export default function ContasBancariasTab() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: "", tipo: "Conta Corrente", banco: "", agencia: "", numero_conta: "", digito: "", titular: "", saldo_inicial: "", chave_pix: "", tipo_chave_pix: "", ativo: true });
  const [saving, setSaving] = useState(false);

  const carregar = () => {
    base44.entities.ContaBancaria.list().then(setContas).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const abrirNova = () => {
    setEditando(null);
    setForm({ nome: "", tipo: "Conta Corrente", banco: "", agencia: "", numero_conta: "", digito: "", titular: "", saldo_inicial: "", chave_pix: "", tipo_chave_pix: "", ativo: true });
    setModalOpen(true);
  };

  const abrirEditar = (conta) => {
    setEditando(conta);
    setForm({ ...conta });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Informe o nome da conta."); return; }
    setSaving(true);
    try {
      const payload = { ...form, saldo_inicial: parseFloat(form.saldo_inicial || 0), saldo_atual: parseFloat(form.saldo_inicial || 0) };
      if (editando?.id) {
        await base44.entities.ContaBancaria.update(editando.id, payload);
        toast.success("Conta atualizada!");
      } else {
        await base44.entities.ContaBancaria.create(payload);
        toast.success("Conta criada!");
      }
      setModalOpen(false);
      carregar();
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir conta bancária?")) return;
    await base44.entities.ContaBancaria.delete(id);
    toast.success("Removida!");
    carregar();
  };

  const totalSaldos = contas.filter(c => c.ativo).reduce((s, c) => s + (c.saldo_atual || c.saldo_inicial || 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Saldo total em contas ativas</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalSaldos)}</p>
        </div>
        <Button onClick={abrirNova} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Conta</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-8">Nenhuma conta cadastrada.</p>}
          {contas.map(conta => (
            <Card key={conta.id} className={`p-4 ${!conta.ativo ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{conta.nome}</p>
                    <p className="text-xs text-gray-500">{conta.tipo}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => abrirEditar(conta)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(conta.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                {conta.banco && <p>🏦 {conta.banco} {conta.agencia && `· Ag: ${conta.agencia}`} {conta.numero_conta && `· CC: ${conta.numero_conta}${conta.digito ? `-${conta.digito}` : ""}`}</p>}
                {conta.chave_pix && <p>⚡ PIX ({conta.tipo_chave_pix}): {conta.chave_pix}</p>}
                {conta.titular && <p>👤 {conta.titular}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Saldo</p>
                <p className={`text-lg font-bold ${(conta.saldo_atual || conta.saldo_inicial || 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {fmt(conta.saldo_atual || conta.saldo_inicial || 0)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar" : "Nova"} Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2">
              <Label>Nome da conta *</Label>
              <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Caixa Geral, Bradesco PJ" />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Banco</Label>
              <Input value={form.banco} onChange={e => set("banco", e.target.value)} />
            </div>
            <div>
              <Label>Agência</Label>
              <Input value={form.agencia} onChange={e => set("agencia", e.target.value)} />
            </div>
            <div>
              <Label>Conta / Dígito</Label>
              <div className="flex gap-1">
                <Input value={form.numero_conta} onChange={e => set("numero_conta", e.target.value)} placeholder="Conta" />
                <Input value={form.digito} onChange={e => set("digito", e.target.value)} className="w-16" placeholder="Dg" />
              </div>
            </div>
            <div>
              <Label>Titular</Label>
              <Input value={form.titular} onChange={e => set("titular", e.target.value)} />
            </div>
            <div>
              <Label>Saldo Inicial (R$)</Label>
              <Input type="number" value={form.saldo_inicial} onChange={e => set("saldo_inicial", e.target.value)} />
            </div>
            <div>
              <Label>Tipo de Chave PIX</Label>
              <Select value={form.tipo_chave_pix} onValueChange={v => set("tipo_chave_pix", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["CPF", "CNPJ", "E-mail", "Telefone", "Chave Aleatória"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chave PIX</Label>
              <Input value={form.chave_pix} onChange={e => set("chave_pix", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}