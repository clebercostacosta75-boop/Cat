import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ShieldCheck, Search, Plus, FileText, Building2, Calendar, Clock,
  CheckCircle, AlertTriangle, XCircle, ExternalLink, Upload, Trash2, Edit, Eye,
  Filter, Download, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDate(d) {
  if (!d) return "—";
  try { return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

function getDaysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

const STATUS_CONFIG = {
  "Pendente": { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", icon: Clock, label: "Pendente" },
  "Em Análise": { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: Search, label: "Em Análise" },
  "Aprovada": { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", icon: CheckCircle, label: "Aprovada" },
  "Rejeitada": { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: XCircle, label: "Rejeitada" },
  "Vencida": { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", icon: AlertTriangle, label: "Vencida" },
  "Cancelada": { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", icon: XCircle, label: "Cancelada" },
};

const TIPO_CONFIG = {
  "Equipamento": "bg-purple-100 text-purple-700",
  "Procedimento": "bg-indigo-100 text-indigo-700",
  "Treinamento": "bg-emerald-100 text-emerald-700",
  "Instalação": "bg-orange-100 text-orange-700",
  "Documento": "bg-cyan-100 text-cyan-700",
  "Outro": "bg-gray-100 text-gray-600",
};

export default function Homologacoes() {
  const [homologacoes, setHomologacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [companies, setCompanies] = useState([]);

  const [form, setForm] = useState({
    titulo: "", tipo: "Treinamento", norma_regulamentadora: "", descricao: "",
    empresa_id: "", empresa_nome: "", unidade: "", status: "Pendente",
    data_solicitacao: "", data_aprovacao: "", data_validade: "",
    orgao_certificador: "", numero_certificado: "", responsavel_tecnico: "",
    documentos: [], observacoes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [h, c] = await Promise.all([
      base44.entities.Homologacao.list("-created_date", 200),
      base44.entities.Company.list("razao_social", 200)
    ]);
    setHomologacoes(h);
    setCompanies(c);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      titulo: "", tipo: "Treinamento", norma_regulamentadora: "", descricao: "",
      empresa_id: "", empresa_nome: "", unidade: "", status: "Pendente",
      data_solicitacao: "", data_aprovacao: "", data_validade: "",
      orgao_certificador: "", numero_certificado: "", responsavel_tecnico: "",
      documentos: [], observacoes: ""
    });
    setEditing(null);
  };

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({
        ...f,
        documentos: [...(f.documentos || []), { nome: file.name, url: file_url, tipo: "Outro", data_upload: new Date().toISOString() }]
      }));
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const removeDoc = (idx) => {
    setForm(f => ({ ...f, documentos: f.documentos.filter((_, i) => i !== idx) }));
  };

  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (h) => { setEditing(h.id); setForm({ ...h }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.titulo || !form.empresa_nome) return;
    if (editing) {
      await base44.entities.Homologacao.update(editing, form);
    } else {
      await base44.entities.Homologacao.create(form);
    }
    setShowForm(false);
    resetForm();
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta homologação?")) return;
    await base44.entities.Homologacao.delete(id);
    await loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    await base44.entities.Homologacao.update(id, { status: newStatus });
    await loadData();
  };

  const filtered = homologacoes.filter(h => {
    const s = search.toLowerCase();
    const matchSearch = !s || h.titulo?.toLowerCase().includes(s) || h.empresa_nome?.toLowerCase().includes(s) || h.norma_regulamentadora?.toLowerCase().includes(s) || h.numero_certificado?.toLowerCase().includes(s);
    const matchStatus = statusFilter === "all" || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: homologacoes.length,
    aprovadas: homologacoes.filter(h => h.status === "Aprovada").length,
    pendentes: homologacoes.filter(h => h.status === "Pendente" || h.status === "Em Análise").length,
    vencendo: homologacoes.filter(h => h.status === "Aprovada" && h.data_validade && getDaysLeft(h.data_validade) !== null && getDaysLeft(h.data_validade) <= 30 && getDaysLeft(h.data_validade) >= 0).length,
    vencidas: homologacoes.filter(h => h.status === "Vencida" || (h.status === "Aprovada" && h.data_validade && getDaysLeft(h.data_validade) !== null && getDaysLeft(h.data_validade) < 0)).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Homologações
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de certificações, ARTs e aprovações regulatórias</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Nova Homologação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
          { label: "Aprovadas", value: stats.aprovadas, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
          { label: "Pendentes", value: stats.pendentes, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
          { label: "Vencendo", value: stats.vencendo, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
          { label: "Vencidas", value: stats.vencidas, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, empresa, NR..."
            className="pl-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="all">Todos os status</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm mt-3">Carregando homologações...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && homologacoes.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed">
          <ShieldCheck className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma homologação cadastrada</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Nova Homologação" para começar</p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4">
          {filtered.map(h => {
            const st = STATUS_CONFIG[h.status] || STATUS_CONFIG["Pendente"];
            const StatusIcon = st.icon;
            const days = getDaysLeft(h.data_validade);
            const isExpiring = h.status === "Aprovada" && days !== null && days <= 30 && days >= 0;
            const isExpired = h.status === "Vencida" || (h.status === "Aprovada" && days !== null && days < 0);

            return (
              <Card key={h.id} className={`border shadow-sm hover:shadow-md transition-shadow ${isExpired ? "border-red-300 bg-red-50/30" : isExpiring ? "border-orange-300 bg-orange-50/30" : "border-gray-200"}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left info */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${st.bg} ${st.text}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{h.titulo}</h3>
                            <Badge className={`text-[10px] ${TIPO_CONFIG[h.tipo] || "bg-gray-100 text-gray-600"}`}>{h.tipo}</Badge>
                            {h.norma_regulamentadora && (
                              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">{h.norma_regulamentadora}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                            {h.empresa_nome && (
                              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{h.empresa_nome}</span>
                            )}
                            {h.unidade && <span className="text-gray-400">• {h.unidade}</span>}
                            {h.numero_certificado && (
                              <span className="flex items-center gap-1 font-mono"><FileText className="w-3 h-3" />{h.numero_certificado}</span>
                            )}
                            {h.responsavel_tecnico && <span className="text-gray-400">RT: {h.responsavel_tecnico}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                            {h.data_solicitacao && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Solicitação: {formatDate(h.data_solicitacao)}</span>}
                            {h.data_aprovacao && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />Aprovação: {formatDate(h.data_aprovacao)}</span>}
                            {h.data_validade && (
                              <span className={`flex items-center gap-1 ${isExpired ? "text-red-600 font-medium" : isExpiring ? "text-orange-600 font-medium" : "text-gray-500"}`}>
                                <Clock className="w-3 h-3" />
                                Validade: {formatDate(h.data_validade)}
                                {days !== null && days >= 0 && <span className="text-gray-400">({days}d)</span>}
                                {days !== null && days < 0 && <span className="text-red-500">(vencida há {Math.abs(days)}d)</span>}
                              </span>
                            )}
                          </div>
                          {h.descricao && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{h.descricao}</p>
                          )}
                          {/* Documentos */}
                          {h.documentos?.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {h.documentos.map((doc, i) => (
                                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md px-2 py-1 transition-colors"
                                >
                                  <FileText className="w-3 h-3" />{doc.nome || `Doc ${i + 1}`}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right actions + status */}
                    <div className={`sm:w-48 border-t sm:border-t-0 sm:border-l ${isExpired ? "border-red-200" : "border-gray-200"} p-4 flex flex-col items-center justify-center gap-2`}>
                      <Badge className={`${st.bg} ${st.text} border ${st.border} text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />{st.label}
                      </Badge>
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(h)} className="h-7 w-7 p-0" title="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {/* Quick status change */}
                      <select
                        value={h.status}
                        onChange={e => handleStatusChange(h.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white w-full mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              {editing ? "Editar Homologação" : "Nova Homologação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Título *</label>
                <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Homologação NR-12 — Prensa Hidráulica" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {Object.keys(TIPO_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">NR</label>
                <Input value={form.norma_regulamentadora} onChange={e => setForm({ ...form, norma_regulamentadora: e.target.value })} placeholder="Ex: NR-12, NR-35" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Empresa *</label>
                <select value={form.empresa_nome} onChange={e => {
                  const c = companies.find(c => c.razao_social === e.target.value);
                  setForm({ ...form, empresa_nome: e.target.value, empresa_id: c?.id || "" });
                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">Selecionar empresa...</option>
                  {companies.map(c => <option key={c.id} value={c.razao_social}>{c.razao_social}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Unidade</label>
                <Input value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} placeholder="Nome da unidade" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Data Solicitação</label>
                <Input type="date" value={form.data_solicitacao} onChange={e => setForm({ ...form, data_solicitacao: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Data Aprovação</label>
                <Input type="date" value={form.data_aprovacao} onChange={e => setForm({ ...form, data_aprovacao: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Data Validade</label>
                <Input type="date" value={form.data_validade} onChange={e => setForm({ ...form, data_validade: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Órgão Certificador</label>
                <Input value={form.orgao_certificador} onChange={e => setForm({ ...form, orgao_certificador: e.target.value })} placeholder="Ex: CREA, INMETRO" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nº Certificado</label>
                <Input value={form.numero_certificado} onChange={e => setForm({ ...form, numero_certificado: e.target.value })} placeholder="Número do certificado" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Responsável Técnico</label>
                <Input value={form.responsavel_tecnico} onChange={e => setForm({ ...form, responsavel_tecnico: e.target.value })} placeholder="Nome do RT" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Documentos ({(form.documentos || []).length})</label>
              <div className="space-y-1 mb-2">
                {(form.documentos || []).map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 truncate">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />{doc.nome || `Doc ${i + 1}`}
                    </a>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeDoc(i)}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-xs border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 text-gray-600">
                <Upload className="w-3.5 h-3.5" />
                {uploadingDoc ? "Enviando..." : "Anexar documento (laudo, ART, certificado...)"}
                <input type="file" className="hidden" onChange={handleUploadDoc} disabled={uploadingDoc} />
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Detalhes da homologação..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={!form.titulo || !form.empresa_nome}>
              {editing ? "Salvar alterações" : "Criar homologação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}