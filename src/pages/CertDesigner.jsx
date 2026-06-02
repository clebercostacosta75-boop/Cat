/**
 * CertDesigner — Editor de Modelos de Certificado
 * Permite criar/editar modelos (CertificateModel) com pré-visualização em tempo real.
 * A pré-visualização usa o mesmo componente CertificatePreview usado na emissão.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logAction } from "@/components/audit/AuditLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Eye, Award, ChevronLeft, Copy, Wand2 } from "lucide-react";
import { toast } from "sonner";
import CertificatePreview from "@/components/certificates/CertificatePreview";
import BackgroundUploader from "@/components/certificates/BackgroundUploader";
import CanvasEditor from "@/components/certificates/CanvasEditor";

const DEFAULT_MODEL = {
  name: "",
  duration: "",
  modality: "Presencial",
  validity_period_months: 12,
  front_title: "CERTIFICADO",
  front_subtitle: "CAPACITAÇÃO PROFISSIONAL",
  front_certification_label: "CERTIFICAMOS QUE",
  front_signature_label: "Assinatura do Treinando",
  front_location_date: "Barcarena/PA, [DATA_EMISSAO]",
  front_footer_line1: "eadcatcursos.com.br",
  front_footer_line2: "www.catcursos.com.br",
  front_body_text: "concluiu com êxito o treinamento de [CURSO], realizado no\nperíodo de [DATA_INICIO] a [DATA_FIM], com carga horária total de [CARGA], sendo\nconsiderado APTO para o desempenho seguro de suas atividades.\n\nO treinamento foi desenvolvido em conformidade com as diretrizes normativas, atendendo\naos requisitos de segurança e saúde no trabalho aplicáveis.\n\nData de Emissão: [DATA_EMISSAO]",
  back_header_text: "Este certificado possui registro interno para verificação de autenticidade.",
  back_content_title: "CONTEÚDO PROGRAMÁTICO",
  back_responsibles_title: "AUTORIDADE E RESPONSABILIDADE TÉCNICA",
  back_footer_line1: "",
  back_footer_line2: "",
  page_width: 297,
  page_height: 210,
  show_programmatic_hours: true,
  text_formatting: { fontFamily: "Georgia, serif", fontSize: 11, color: "#374151", highlightColor: "#059669", textAlign: "center", lineHeight: 1.8 },
  student_name_formatting: { fontSize: 20, bold: true, color: "#111827", letterSpacing: 0, textAlign: "center", marginTop: 4, marginBottom: 4 },
  front_title_formatting: { fontSize: 28, color: "#064e3b", bold: true },
  front_subtitle_formatting: { fontSize: 10, color: "#6b7280" },
  programmatic_content: [],
  technical_responsibles: [],
  front_background_url: "",
  back_background_url: "",
};

function FieldGroup({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500 uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

export default function CertDesigner() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(DEFAULT_MODEL);
  const [creating, setCreating] = useState(false);
  const [editorMode, setEditorMode] = useState("form"); // "form" | "canvas"

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["certificateModels"],
    queryFn: () => base44.entities.CertificateModel.list("-created_date", 100),
  });

  const { data: digitalSignatures = [] } = useQuery({
    queryKey: ["digitalSignatures"],
    queryFn: () => base44.entities.DigitalSignature.filter({ is_active: true }, "-created_date", 100),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["coursesForDesigner"],
    queryFn: () => base44.entities.Course.list("-name", 500),
  });

  const syncCourseWithCatalog = async (modelData) => {
    if (!modelData.name) return;
    try {
      const courseName = modelData.name.trim();
      // Busca todos e filtra ignorando maiúsculas/minúsculas
      const allCourses = await base44.entities.Course.list('-created_date', 500);
      const existing = (allCourses || []).filter(
        c => c.name?.trim().toLowerCase() === courseName.toLowerCase()
      );
      if (existing.length === 0) {
        await base44.entities.Course.create({
          name: courseName,
          description: `Curso cadastrado automaticamente a partir do modelo de certificado "${courseName}".`,
          validity: modelData.validity_period_months ? `${modelData.validity_period_months} meses` : "",
        });
        toast.info(`✅ Curso "${courseName}" adicionado automaticamente ao catálogo.`);
      }
    } catch (err) {
      console.warn("Não foi possível sincronizar curso com o catálogo:", err);
      toast.warning(`⚠️ Modelo salvo, mas não foi possível sincronizar com o catálogo de cursos.`);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data) =>
      selectedId
        ? base44.entities.CertificateModel.update(selectedId, data)
        : base44.entities.CertificateModel.create(data),
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["certificateModels"] });
      toast.success("Modelo salvo com sucesso!");
      const action = selectedId ? "modelo_editado" : "modelo_criado";
      logAction(action, "CertificateModel", selectedId || result?.id, variables.name, {
        descricao: selectedId ? `Modelo "${variables.name}" editado` : `Modelo "${variables.name}" criado`,
        duracao: variables.duration,
        modalidade: variables.modality,
      });
      await syncCourseWithCatalog(variables);
      if (!selectedId) {
        setCreating(false);
        setSelectedId(null);
        setForm(DEFAULT_MODEL);
      }
    },
    onError: () => toast.error("Erro ao salvar modelo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CertificateModel.delete(id),
    onSuccess: (_, id) => {
      const deletedModel = models.find(m => m.id === id);
      queryClient.invalidateQueries({ queryKey: ["certificateModels"] });
      setSelectedId(null);
      setForm(DEFAULT_MODEL);
      setCreating(false);
      toast.success("Modelo excluído.");
      logAction("modelo_excluido", "CertificateModel", id, deletedModel?.name || id, {
        descricao: `Modelo "${deletedModel?.name || id}" excluído`,
      });
    },
  });

  const selectModel = (m) => {
    setSelectedId(m.id);
    setForm({ ...DEFAULT_MODEL, ...m });
    setCreating(false);
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(DEFAULT_MODEL);
    setCreating(true);
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setNested = (key, subKey, val) =>
    setForm((f) => ({ ...f, [key]: { ...(f[key] || {}), [subKey]: val } }));

  const handleSave = () => {
    if (!form.name) return toast.error("Informe o nome do modelo.");
    if (!form.duration) return toast.error("Informe a carga horária.");
    saveMutation.mutate(form);
  };

  const handleDuplicate = (model) => {
    const copy = { ...model, name: `${model.name} (cópia)`, id: undefined };
    delete copy.id;
    saveMutation.mutate(copy);
    toast.success("Modelo duplicado!");
    logAction("modelo_duplicado", "CertificateModel", model.id, model.name, {
      descricao: `Modelo "${model.name}" duplicado como "${model.name} (cópia)"`,
    });
  };

  const handleSaveCanvas = ({ front, back, mode }) => {
    const canvasData = { front, back };
    const updated = { ...form, editor_canvas_data: canvasData };
    setForm(updated);
    saveMutation.mutate(updated);
  };

  const isEditing = selectedId || creating;

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* Sidebar — lista de modelos */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" /> Modelos
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && <p className="text-xs text-gray-400 px-2">Carregando...</p>}
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => selectModel(m)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedId === m.id
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <p className="font-medium truncate">{m.name}</p>
              <p className="text-xs text-gray-400 truncate">{m.duration} • {m.modality}</p>
            </button>
          ))}
          {models.length === 0 && !isLoading && (
            <p className="text-xs text-gray-400 px-2 py-4 text-center">Nenhum modelo criado</p>
          )}
        </div>
        <div className="p-3 border-t border-gray-100 space-y-2">
          {isEditing && (
            <div className="flex rounded overflow-hidden border border-gray-200 w-full">
              <button
                onClick={() => setEditorMode("form")}
                className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 ${editorMode === "form" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Eye className="w-3 h-3" /> Campos
              </button>
              <button
                onClick={() => setEditorMode("canvas")}
                className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 ${editorMode === "canvas" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Wand2 className="w-3 h-3" /> Editor Visual
              </button>
            </div>
          )}
          <Button onClick={startNew} className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Novo Modelo
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isEditing ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Selecione ou crie um modelo</h3>
              <p className="text-gray-400 text-sm mb-4">Escolha um modelo na lista ao lado para editar ou clique em "Novo Modelo"</p>
              <Button onClick={startNew} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Modelo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Canvas Editor Mode */}
            {editorMode === "canvas" && (
              <div className="flex-1 overflow-hidden">
                <CanvasEditor
                  model={form}
                  signatures={digitalSignatures}
                  onSaveCanvas={handleSaveCanvas}
                />
              </div>
            )}

            {/* Form panel */}
            {editorMode === "form" && <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <button onClick={() => { setSelectedId(null); setCreating(false); }} className="text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-semibold text-gray-800 flex-1 truncate">
                  {selectedId ? form.name || "Editar Modelo" : "Novo Modelo"}
                </h3>
                <div className="flex gap-1 flex-wrap">
                  {/* Toggle editor mode */}
                  <div className="flex rounded overflow-hidden border border-gray-200">
                    <button
                      onClick={() => setEditorMode("form")}
                      className={`px-2 py-1 text-xs font-medium flex items-center gap-1 ${editorMode === "form" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      <Eye className="w-3 h-3" /> Campos
                    </button>
                    <button
                      onClick={() => setEditorMode("canvas")}
                      className={`px-2 py-1 text-xs font-medium flex items-center gap-1 ${editorMode === "canvas" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      <Wand2 className="w-3 h-3" /> Visual
                    </button>
                  </div>
                  {selectedId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                      title="Duplicar modelo"
                      onClick={() => { const m = models.find(m => m.id === selectedId); if (m) handleDuplicate(m); }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                  {selectedId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50 px-2"
                      onClick={() => { if (confirm("Excluir modelo?")) deleteMutation.mutate(selectedId); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 px-3" onClick={handleSave} disabled={saveMutation.isPending}>
                    <Save className="w-3 h-3 mr-1" /> Salvar
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <Tabs defaultValue="geral">
                  <TabsList className="w-full mb-4 text-xs">
                    <TabsTrigger value="geral" className="flex-1 text-xs">Geral</TabsTrigger>
                    <TabsTrigger value="frente" className="flex-1 text-xs">Frente</TabsTrigger>
                    <TabsTrigger value="verso" className="flex-1 text-xs">Verso</TabsTrigger>
                    <TabsTrigger value="layout" className="flex-1 text-xs">Layout</TabsTrigger>
                  </TabsList>

                  {/* GERAL */}
                  <TabsContent value="geral" className="space-y-4">
                    <FieldGroup label="Nome do Modelo *">
                      <Input
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                        placeholder="Digite o nome do modelo..."
                        list="courses-datalist"
                      />
                      <datalist id="courses-datalist">
                        {courses.map(c => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
                      <p className="text-xs text-gray-400">Digite livremente ou selecione um curso cadastrado.</p>
                    </FieldGroup>
                    <FieldGroup label="Carga Horária *">
                      <Input value={form.duration} onChange={e => set("duration", e.target.value)} placeholder="Ex: 8h" />
                    </FieldGroup>
                    <FieldGroup label="Modalidade">
                      <Select value={form.modality} onValueChange={v => set("modality", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Presencial">Presencial</SelectItem>
                          <SelectItem value="Híbrido">Híbrido</SelectItem>
                          <SelectItem value="Online">Online</SelectItem>
                          <SelectItem value="Formação">Formação</SelectItem>
                          <SelectItem value="Periódico">Periódico</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <FieldGroup label="Validade (meses)">
                      <Input type="number" value={form.validity_period_months} onChange={e => set("validity_period_months", +e.target.value)} />
                    </FieldGroup>

                    <div className="border-t pt-4">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider">Conteúdo Programático</Label>
                      <div className="mt-2 space-y-2">
                        {(form.programmatic_content || []).map((item, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input
                              className="flex-1 text-xs"
                              placeholder="Módulo"
                              value={item.module}
                              onChange={e => {
                                const arr = [...form.programmatic_content];
                                arr[i] = { ...arr[i], module: e.target.value };
                                set("programmatic_content", arr);
                              }}
                            />
                            <Input
                              className="w-16 text-xs"
                              placeholder="Horas"
                              value={item.hours}
                              onChange={e => {
                                const arr = [...form.programmatic_content];
                                arr[i] = { ...arr[i], hours: e.target.value };
                                set("programmatic_content", arr);
                              }}
                            />
                            <button onClick={() => set("programmatic_content", form.programmatic_content.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => set("programmatic_content", [...(form.programmatic_content || []), { module: "", hours: "" }])}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Adicionar Módulo
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider">Responsáveis Técnicos</Label>
                      <div className="mt-2 space-y-3">
                        {(form.technical_responsibles || []).map((r, i) => {
                          const linkedSig = digitalSignatures.find(s => s.id === r.signature_id);
                          return (
                          <div key={i} className="border rounded-lg p-2 space-y-1.5">
                            {/* Vincular assinatura cadastrada */}
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Assinatura Digital</p>
                              <select
                                className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background"
                                value={r.signature_id || ""}
                                onChange={e => {
                                  const arr = [...form.technical_responsibles];
                                  const sig = digitalSignatures.find(s => s.id === e.target.value);
                                  arr[i] = {
                                    ...arr[i],
                                    signature_id: e.target.value || "",
                                    name: sig ? sig.name : arr[i].name,
                                    title: sig ? sig.title : arr[i].title,
                                    registration: sig ? (sig.registration || arr[i].registration) : arr[i].registration,
                                    signature_url: sig ? sig.signature_url : "",
                                  };
                                  set("technical_responsibles", arr);
                                }}
                              >
                                <option value="">— Selecionar assinatura cadastrada —</option>
                                {digitalSignatures.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} — {s.title}</option>
                                ))}
                              </select>
                              {linkedSig?.signature_url && (
                                <div className="bg-gray-50 border rounded p-1 mt-1">
                                  <img src={linkedSig.signature_url} alt="Assinatura" className="max-h-10 object-contain" />
                                </div>
                              )}
                            </div>
                            <Input className="text-xs" placeholder="Nome" value={r.name || ""} onChange={e => { const arr = [...form.technical_responsibles]; arr[i] = { ...arr[i], name: e.target.value }; set("technical_responsibles", arr); }} />
                            <Input className="text-xs" placeholder="Título/Cargo" value={r.title || ""} onChange={e => { const arr = [...form.technical_responsibles]; arr[i] = { ...arr[i], title: e.target.value }; set("technical_responsibles", arr); }} />
                            <Input className="text-xs" placeholder="Registro (CREA, CRM...)" value={r.registration || ""} onChange={e => { const arr = [...form.technical_responsibles]; arr[i] = { ...arr[i], registration: e.target.value }; set("technical_responsibles", arr); }} />
                            <button onClick={() => set("technical_responsibles", form.technical_responsibles.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">Remover</button>
                          </div>
                          );
                        })}
                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => set("technical_responsibles", [...(form.technical_responsibles || []), { name: "", title: "", registration: "" }])}>
                          <Plus className="w-3 h-3 mr-1" /> Adicionar Responsável
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* FRENTE */}
                  <TabsContent value="frente" className="space-y-4">
                    <BackgroundUploader
                      label="Imagem de Fundo (Frente)"
                      value={form.front_background_url || ""}
                      onChange={v => set("front_background_url", v)}
                    />
                    <FieldGroup label="Título Principal">
                      <Input value={form.front_title} onChange={e => set("front_title", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Subtítulo">
                      <Input value={form.front_subtitle} onChange={e => set("front_subtitle", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Label 'Certificamos que'">
                      <Input value={form.front_certification_label} onChange={e => set("front_certification_label", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Local e Data">
                      <Input value={form.front_location_date} onChange={e => set("front_location_date", e.target.value)} placeholder="Barcarena/PA, [DATA_EMISSAO]" />
                      <p className="text-xs text-gray-400">Use [DATA_EMISSAO] para substituição automática</p>
                    </FieldGroup>
                    <FieldGroup label="Label Assinatura">
                      <Input value={form.front_signature_label} onChange={e => set("front_signature_label", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Rodapé Linha 1">
                      <Input value={form.front_footer_line1} onChange={e => set("front_footer_line1", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Rodapé Linha 2">
                      <Input value={form.front_footer_line2} onChange={e => set("front_footer_line2", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Texto do Corpo (Frente)">
                      <textarea
                        className="w-full border border-input rounded-md px-3 py-2 text-sm min-h-[80px] resize-y bg-background"
                        value={form.front_body_text || "concluiu com êxito o curso de [CURSO]\ncom carga horária de [CARGA], realizado na empresa [EMPRESA], em [LOCAL]."}
                        onChange={e => set("front_body_text", e.target.value)}
                      />
                      <p className="text-xs text-gray-400">Variáveis: [ALUNO] [CURSO] [CARGA] [EMPRESA] [LOCAL] [DATA_INICIO] [DATA_FIM] [DATA_EMISSAO]</p>
                    </FieldGroup>
                  </TabsContent>

                  {/* VERSO */}
                  <TabsContent value="verso" className="space-y-4">
                    <FieldGroup label="Texto do Cabeçalho">
                      <Input value={form.back_header_text} onChange={e => set("back_header_text", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Título Conteúdo Programático">
                      <Input value={form.back_content_title} onChange={e => set("back_content_title", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Título Responsáveis">
                      <Input value={form.back_responsibles_title} onChange={e => set("back_responsibles_title", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Rodapé Linha 1">
                      <Input value={form.back_footer_line1 || ""} onChange={e => set("back_footer_line1", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Rodapé Linha 2">
                      <Input value={form.back_footer_line2 || ""} onChange={e => set("back_footer_line2", e.target.value)} />
                    </FieldGroup>
                    <BackgroundUploader
                      label="Imagem de Fundo (Verso)"
                      value={form.back_background_url || ""}
                      onChange={v => set("back_background_url", v)}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showHours"
                        checked={form.show_programmatic_hours !== false}
                        onChange={e => set("show_programmatic_hours", e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="showHours" className="text-sm">Exibir carga horária por módulo</Label>
                    </div>
                  </TabsContent>

                  {/* LAYOUT */}
                  <TabsContent value="layout" className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup label="Largura (mm)">
                        <Input type="number" value={form.page_width || 297} onChange={e => set("page_width", +e.target.value)} />
                      </FieldGroup>
                      <FieldGroup label="Altura (mm)">
                        <Input type="number" value={form.page_height || 210} onChange={e => set("page_height", +e.target.value)} />
                      </FieldGroup>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Texto Principal</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <FieldGroup label="Fonte">
                          <Select value={form.text_formatting?.fontFamily || "Georgia, serif"} onValueChange={v => setNested("text_formatting", "fontFamily", v)}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Georgia, serif">Georgia</SelectItem>
                              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                              <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                        <FieldGroup label="Tamanho (pt)">
                          <Input type="number" className="text-xs" value={form.text_formatting?.fontSize || 11} onChange={e => setNested("text_formatting", "fontSize", +e.target.value)} />
                        </FieldGroup>
                        <FieldGroup label="Cor Texto">
                          <input type="color" value={form.text_formatting?.color || "#374151"} onChange={e => setNested("text_formatting", "color", e.target.value)} className="w-full h-9 rounded border cursor-pointer" />
                        </FieldGroup>
                        <FieldGroup label="Cor Destaque">
                          <input type="color" value={form.text_formatting?.highlightColor || "#059669"} onChange={e => setNested("text_formatting", "highlightColor", e.target.value)} className="w-full h-9 rounded border cursor-pointer" />
                        </FieldGroup>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Nome do Aluno</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <FieldGroup label="Tamanho (pt)">
                          <Input type="number" className="text-xs" value={form.student_name_formatting?.fontSize || 20} onChange={e => setNested("student_name_formatting", "fontSize", +e.target.value)} />
                        </FieldGroup>
                        <FieldGroup label="Cor">
                          <input type="color" value={form.student_name_formatting?.color || "#111827"} onChange={e => setNested("student_name_formatting", "color", e.target.value)} className="w-full h-9 rounded border cursor-pointer" />
                        </FieldGroup>
                        <FieldGroup label="Esp. Letras (px)">
                          <Input type="number" className="text-xs" value={form.student_name_formatting?.letterSpacing || 0} onChange={e => setNested("student_name_formatting", "letterSpacing", +e.target.value)} />
                        </FieldGroup>
                        <FieldGroup label="Alinhamento">
                          <Select value={form.student_name_formatting?.textAlign || "center"} onValueChange={v => setNested("student_name_formatting", "textAlign", v)}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Esquerda</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                              <SelectItem value="right">Direita</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" checked={form.student_name_formatting?.bold !== false} onChange={e => setNested("student_name_formatting", "bold", e.target.checked)} />
                          <span>Negrito</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" checked={!!form.student_name_formatting?.italic} onChange={e => setNested("student_name_formatting", "italic", e.target.checked)} />
                          <span>Itálico</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input type="checkbox" checked={!!form.student_name_formatting?.underline} onChange={e => setNested("student_name_formatting", "underline", e.target.checked)} />
                          <span>Sublinhado</span>
                        </label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>}

            {/* Preview panel */}
            {editorMode === "form" && <div className="flex-1 bg-gray-100 overflow-y-auto p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Pré-visualização (atualiza em tempo real)</span>
              </div>
              <CertificatePreview model={form} cert={{ course_name: form.name || "Nome do Modelo", course_duration: form.duration || "" }} scale={0.42} />
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}