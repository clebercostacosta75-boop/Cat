import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Building2, Edit2, Trash2, ChevronRight, Users, FileText, Clock } from "lucide-react";

const STATUS_COLORS = {
  "Ativa": "bg-green-100 text-green-700",
  "Inativa": "bg-gray-100 text-gray-600",
  "Em Auditoria": "bg-amber-100 text-amber-700",
};

const GRAU_COLORS = { "1": "bg-blue-100 text-blue-700", "2": "bg-yellow-100 text-yellow-700", "3": "bg-orange-100 text-orange-700", "4": "bg-red-100 text-red-700" };

const EMPTY = {
  cnpj: "", razao_social: "", nome_fantasia: "", cnae: "", cnae_descricao: "",
  grau_risco: "1", inscricao_estadual: "", endereco: "", municipio: "", estado: "", cep: "",
  responsavel_legal: "", email: "", telefone: "", qtd_colaboradores: "",
  status_empresa: "Ativa", observacoes: "", data_cadastro: new Date().toISOString().split("T")[0]
};

export default function EmpresaMestre() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [detalheTab, setDetalheTab] = useState("dados");
  const [colaboradores, setColaboradores] = useState([]);
  const [pgrs, setPgrs] = useState([]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.EmpresaMestre.list("-created_date", 200);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.cnpj?.includes(search) ||
    r.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    r.nome_fantasia?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(EMPTY); setEditingId(null); setModalOpen(true); };
  const openEdit = (r) => { setForm({ ...r, qtd_colaboradores: r.qtd_colaboradores || "" }); setEditingId(r.id); setModalOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form };
    if (payload.qtd_colaboradores !== "" && payload.qtd_colaboradores !== undefined)
      payload.qtd_colaboradores = parseInt(payload.qtd_colaboradores, 10);
    else delete payload.qtd_colaboradores;
    if (editingId) await base44.entities.EmpresaMestre.update(editingId, payload);
    else await base44.entities.EmpresaMestre.create(payload);
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Excluir esta empresa?")) return;
    await base44.entities.EmpresaMestre.delete(id);
    load();
  };

  const openDetalhe = async (empresa) => {
    setSelectedEmpresa(empresa);
    setDetalheTab("dados");
    const [cols, pgrsData] = await Promise.all([
      base44.entities.ColaboradorSST.filter({ empresa_mestre_id: empresa.id }),
      base44.entities.PGRLeitura.filter({ empresa_mestre_id: empresa.id })
    ]);
    setColaboradores(cols);
    setPgrs(pgrsData);
  };

  const F = ({ label, k, type = "text" }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <Input type={type} value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
    </div>
  );

  if (selectedEmpresa) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => setSelectedEmpresa(null)} className="text-gray-500">← Voltar</Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{selectedEmpresa.razao_social}</h1>
            <p className="text-sm text-gray-500">CNPJ: {selectedEmpresa.cnpj}</p>
          </div>
          <Badge className={`ml-auto ${STATUS_COLORS[selectedEmpresa.status_empresa] || ""}`}>{selectedEmpresa.status_empresa}</Badge>
        </div>

        <Tabs value={detalheTab} onValueChange={setDetalheTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
            <TabsTrigger value="documentos">Documentos SST</TabsTrigger>
            <TabsTrigger value="colaboradores">Colaboradores ({colaboradores.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <div className="bg-white rounded-xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["CNPJ", "cnpj"], ["Razão Social", "razao_social"], ["Nome Fantasia", "nome_fantasia"],
                ["CNAE", "cnae"], ["Grau de Risco", "grau_risco"], ["Endereço", "endereco"],
                ["Município", "municipio"], ["Estado", "estado"], ["CEP", "cep"],
                ["Responsável Legal", "responsavel_legal"], ["Email", "email"], ["Telefone", "telefone"],
                ["Nº Colaboradores", "qtd_colaboradores"],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="font-medium text-gray-800">{selectedEmpresa[key] || "—"}</p>
                </div>
              ))}
              {selectedEmpresa.observacoes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Observações</p>
                  <p className="text-gray-700">{selectedEmpresa.observacoes}</p>
                </div>
              )}
              <div className="col-span-2 flex justify-end">
                <Button onClick={() => { openEdit(selectedEmpresa); }} className="bg-rose-600 hover:bg-rose-700">
                  <Edit2 className="w-4 h-4 mr-1" /> Editar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">PGRs Vinculados ({pgrs.length})</h3>
              {pgrs.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Nenhum PGR vinculado</p>
              ) : pgrs.map(p => (
                <div key={p.id} className="bg-white border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">PGR — {p.empresa_mestre_nome}</p>
                    <p className="text-xs text-gray-500">Processado em: {p.data_processamento || "—"}</p>
                  </div>
                  <Badge className={p.status_processamento === "Completo" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {p.status_processamento}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="colaboradores">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Nome</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">CPF</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Cargo/Função</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                </tr></thead>
                <tbody>
                  {colaboradores.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum colaborador</td></tr>
                  ) : colaboradores.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{c.nome}</td>
                      <td className="px-4 py-2 text-gray-600">{c.cpf || "—"}</td>
                      <td className="px-4 py-2 text-gray-600">{c.funcao || c.cargo || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge className={c.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Histórico de alterações em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-rose-600" /> Central de Empresas
          </h1>
          <p className="text-gray-500 text-sm">Empresa Mestre — identificação única por CNPJ</p>
        </div>
        <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 gap-1.5">
          <Plus className="w-4 h-4" /> Nova Empresa
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por CNPJ ou nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">CNPJ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Razão Social</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CNAE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Grau Risco</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma empresa cadastrada</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openDetalhe(r)}>
                  <td className="px-4 py-3 font-mono text-sm">{r.cnpj}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.razao_social}</td>
                  <td className="px-4 py-3 text-gray-600">{r.cnae || "—"}</td>
                  <td className="px-4 py-3">
                    {r.grau_risco && <Badge className={`text-xs ${GRAU_COLORS[r.grau_risco] || ""}`}>GR {r.grau_risco}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${STATUS_COLORS[r.status_empresa] || ""}`}>{r.status_empresa}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openDetalhe(r)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Empresa" : "Nova Empresa Mestre"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <F label="CNPJ *" k="cnpj" />
            <F label="Razão Social *" k="razao_social" />
            <F label="Nome Fantasia" k="nome_fantasia" />
            <F label="CNAE" k="cnae" />
            <F label="Descrição CNAE" k="cnae_descricao" />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Grau de Risco</label>
              <select value={form.grau_risco} onChange={e => setForm(f => ({ ...f, grau_risco: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["1", "2", "3", "4"].map(v => <option key={v}>Grau {v}</option>)}
              </select>
            </div>
            <F label="Endereço" k="endereco" />
            <F label="Município" k="municipio" />
            <F label="Estado" k="estado" />
            <F label="CEP" k="cep" />
            <F label="Responsável Legal" k="responsavel_legal" />
            <F label="Email" k="email" />
            <F label="Telefone" k="telefone" />
            <F label="Nº Colaboradores" k="qtd_colaboradores" type="number" />
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status_empresa} onChange={e => setForm(f => ({ ...f, status_empresa: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {["Ativa", "Inativa", "Em Auditoria"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Observações</label>
              <textarea rows={3} value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.cnpj || !form.razao_social} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}