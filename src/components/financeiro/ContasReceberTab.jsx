import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, CheckCircle } from "lucide-react";
import LancamentoModal from "./LancamentoModal";
import { toast } from "sonner";

const STATUS_COLOR = {
  Pendente: "bg-yellow-100 text-yellow-700",
  Aprovado: "bg-blue-100 text-blue-700",
  Recebido: "bg-green-100 text-green-700",
  Vencido: "bg-red-100 text-red-700",
  Cancelado: "bg-gray-100 text-gray-500",
  Parcial: "bg-orange-100 text-orange-700",
};

const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ContasReceberTab() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const carregar = async () => {
    setLoading(true);
    const d = await base44.entities.LancamentoFinanceiro.filter({ tipo: "Receita" }, "-data_vencimento", 200);
    setItens(d);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const hoje = new Date();
  const filtrado = itens.filter(i => {
    const matchBusca = !busca || i.descricao?.toLowerCase().includes(busca.toLowerCase()) || i.cliente_nome?.toLowerCase().includes(busca.toLowerCase());
    const vencida = new Date(i.data_vencimento) < hoje && ["Pendente", "Parcial"].includes(i.status);
    if (filtroStatus === "vencidas") return matchBusca && vencida;
    if (filtroStatus !== "todos") return matchBusca && i.status === filtroStatus;
    return matchBusca;
  });

  const handleDelete = async (id) => {
    if (!confirm("Excluir lançamento?")) return;
    await base44.entities.LancamentoFinanceiro.delete(id);
    toast.success("Excluído!");
    carregar();
  };

  const handleBaixar = async (item) => {
    await base44.entities.LancamentoFinanceiro.update(item.id, {
      status: "Recebido",
      valor_pago: item.valor,
      data_pagamento: new Date().toISOString().split("T")[0],
    });
    toast.success("Baixa realizada!");
    carregar();
  };

  const totais = {
    total: filtrado.reduce((s, i) => s + i.valor, 0),
    recebido: filtrado.filter(i => i.status === "Recebido").reduce((s, i) => s + (i.valor_pago || i.valor), 0),
    pendente: filtrado.filter(i => ["Pendente", "Parcial", "Aprovado"].includes(i.status)).reduce((s, i) => s + (i.valor - (i.valor_pago || 0)), 0),
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["todos", "Pendente", "Recebido", "Vencido", "vencidas", "Parcial", "Cancelado"].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroStatus === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {s === "todos" ? "Todos" : s === "vencidas" ? "🔴 Vencidas" : s}
            </button>
          ))}
        </div>
        <Button onClick={() => { setEditando(null); setModalOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nova Conta a Receber
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="font-bold text-gray-900">{fmt(totais.total)}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-gray-500">Recebido</p><p className="font-bold text-green-700">{fmt(totais.recebido)}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-gray-500">A Receber</p><p className="font-bold text-blue-700">{fmt(totais.pendente)}</p></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar por descrição ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtrado.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum registro encontrado.</p>}
          {filtrado.map(item => {
            const vencida = new Date(item.data_vencimento) < hoje && ["Pendente", "Parcial"].includes(item.status);
            return (
              <Card key={item.id} className={`p-4 ${vencida ? "border-red-200 bg-red-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.descricao}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                      {item.cliente_nome && <span>👤 {item.cliente_nome}</span>}
                      {item.categoria_nome && <span>🏷 {item.categoria_nome}</span>}
                      {item.curso_nome && <span>📚 {item.curso_nome}</span>}
                      <span>📅 Venc: {item.data_vencimento}</span>
                      {item.total_parcelas > 1 && <span>Parcela {item.numero_parcela}/{item.total_parcelas}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-bold text-green-700">{fmt(item.valor)}</p>
                    {item.valor_pago > 0 && item.valor_pago < item.valor && (
                      <p className="text-xs text-gray-500">Recebido: {fmt(item.valor_pago)}</p>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] || "bg-gray-100 text-gray-600"}`}>{item.status}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {["Pendente", "Parcial", "Aprovado"].includes(item.status) && (
                    <Button size="sm" variant="outline" className="text-green-700 border-green-200 h-7 text-xs" onClick={() => handleBaixar(item)}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Dar Baixa
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditando(item); setModalOpen(true); }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <LancamentoModal
          open={modalOpen}
          tipo="Receita"
          lancamento={editando}
          onClose={(refresh) => { setModalOpen(false); setEditando(null); if (refresh) carregar(); }}
        />
      )}
    </div>
  );
}