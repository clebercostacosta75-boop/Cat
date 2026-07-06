import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

function CrudSimples({ entity, entity_name, campos, titulo }) {
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState({});
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = () => {
    base44.entities[entity_name].list().then(d => { setItens(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const iniciarNovo = () => {
    const vazio = {};
    campos.forEach(c => { vazio[c.key] = c.default ?? ""; });
    setForm(vazio);
    setEditando("novo");
  };

  const iniciarEditar = (item) => {
    setForm({ ...item });
    setEditando(item.id);
  };

  const salvar = async () => {
    try {
      if (editando === "novo") {
        await base44.entities[entity_name].create(form);
        toast.success("Criado!");
      } else {
        await base44.entities[entity_name].update(editando, form);
        toast.success("Atualizado!");
      }
      setEditando(null);
      carregar();
    } catch { toast.error("Erro ao salvar."); }
  };

  const excluir = async (id) => {
    if (!confirm("Excluir?")) return;
    await base44.entities[entity_name].delete(id);
    toast.success("Excluído!");
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{titulo}</h3>
        <Button size="sm" onClick={iniciarNovo}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {editando && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="grid grid-cols-2 gap-3">
            {campos.map(c => (
              <div key={c.key} className={c.span2 ? "col-span-2" : ""}>
                <Label>{c.label}</Label>
                {c.options ? (
                  <Select value={form[c.key] || ""} onValueChange={v => set(c.key, v)}>
                    <SelectTrigger><SelectValue placeholder={c.placeholder || "Selecione"} /></SelectTrigger>
                    <SelectContent>{c.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={c.type || "text"}
                    value={form[c.key] || ""}
                    onChange={e => set(c.key, e.target.value)}
                    placeholder={c.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={salvar}>Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {loading ? <div className="py-4 text-center text-gray-400 text-sm">Carregando...</div> : (
        <div className="space-y-2">
          {itens.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nenhum cadastro.</p>}
          {itens.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.nome || item.codigo || item.descricao}</p>
                <p className="text-xs text-gray-500">{item.tipo} {item.codigo ? `· ${item.codigo}` : ""}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => iniciarEditar(item)}><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => excluir(item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesFinanceiras() {
  return (
    <div className="pt-4">
      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="centros">Centros de Custo</TabsTrigger>
          <TabsTrigger value="plano">Plano de Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-4">
          <CrudSimples
            entity_name="CategoriaFinanceira"
            titulo="Categorias Financeiras"
            campos={[
              { key: "nome", label: "Nome *", placeholder: "Ex: Cursos, Salários...", span2: false },
              { key: "tipo", label: "Tipo *", options: ["Receita", "Despesa"] },
              { key: "descricao", label: "Descrição", placeholder: "Opcional", span2: true },
              { key: "cor", label: "Cor (hex)", placeholder: "#22c55e" },
            ]}
          />
        </TabsContent>

        <TabsContent value="centros" className="mt-4">
          <CrudSimples
            entity_name="CentroCusto"
            titulo="Centros de Custo"
            campos={[
              { key: "codigo", label: "Código", placeholder: "CC-001" },
              { key: "nome", label: "Nome *", placeholder: "Ex: Comercial, Instrutores..." },
              { key: "responsavel", label: "Responsável", placeholder: "Nome" },
              { key: "orcamento_mensal", label: "Orçamento Mensal (R$)", type: "number" },
              { key: "orcamento_anual", label: "Orçamento Anual (R$)", type: "number" },
              { key: "descricao", label: "Descrição", placeholder: "Opcional", span2: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="plano" className="mt-4">
          <CrudSimples
            entity_name="PlanoConta"
            titulo="Plano de Contas"
            campos={[
              { key: "codigo", label: "Código *", placeholder: "Ex: 1.1.01" },
              { key: "nome", label: "Nome *", placeholder: "Ex: Receitas de Cursos" },
              { key: "tipo", label: "Tipo *", options: ["Receita", "Custo", "Despesa", "Ativo", "Passivo", "Patrimônio"] },
              { key: "nivel", label: "Nível", type: "number", placeholder: "1=grupo, 2=subgrupo, 3=conta" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}