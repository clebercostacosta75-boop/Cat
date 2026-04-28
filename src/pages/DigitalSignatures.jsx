import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, RotateCcw, Check, PenLine, User } from "lucide-react";
import { toast } from "sonner";

function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const save = () => {
    if (!hasDrawing) return toast.error("Desenhe uma assinatura antes de salvar.");
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full touch-none cursor-crosshair rounded-lg"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <p className="text-xs text-gray-400 text-center">Assine com o mouse ou dedo dentro da área acima</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={clear} className="gap-1">
          <RotateCcw className="w-3 h-3" /> Limpar
        </Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1 flex-1" onClick={save} disabled={!hasDrawing}>
          <Check className="w-3 h-3" /> Salvar Assinatura
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

export default function DigitalSignatures() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ name: "", title: "", registration: "", signature_url: "", is_active: true });
  const [editingId, setEditingId] = useState(null);
  const [showPad, setShowPad] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ["digitalSignatures"],
    queryFn: () => base44.entities.DigitalSignature.list("-created_date", 100),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingId
        ? base44.entities.DigitalSignature.update(editingId, data)
        : base44.entities.DigitalSignature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["digitalSignatures"] });
      toast.success(editingId ? "Assinatura atualizada!" : "Assinatura cadastrada!");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar assinatura."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DigitalSignature.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["digitalSignatures"] });
      toast.success("Assinatura removida.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.DigitalSignature.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["digitalSignatures"] }),
  });

  const resetForm = () => {
    setForm({ name: "", title: "", registration: "", signature_url: "", is_active: true });
    setEditingId(null);
    setShowPad(false);
  };

  const startEdit = (sig) => {
    setForm({ name: sig.name, title: sig.title, registration: sig.registration || "", signature_url: sig.signature_url || "", is_active: sig.is_active !== false });
    setEditingId(sig.id);
    setShowPad(false);
  };

  const handleSave = () => {
    if (!form.name) return toast.error("Informe o nome.");
    if (!form.title) return toast.error("Informe o cargo/título.");
    saveMutation.mutate(form);
  };

  const handlePadSave = async (dataUrl) => {
    setUploading(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "assinatura.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, signature_url: file_url }));
      setShowPad(false);
      toast.success("Assinatura capturada!");
    } catch {
      toast.error("Erro ao salvar assinatura.");
    }
    setUploading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, signature_url: file_url }));
      toast.success("Imagem carregada!");
    } catch {
      toast.error("Erro ao carregar imagem.");
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <PenLine className="w-6 h-6 text-emerald-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Assinaturas Digitais</h1>
          <p className="text-sm text-gray-500">Cadastre assinaturas de responsáveis técnicos para uso automático nos certificados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {editingId ? "Editar Assinatura" : "Nova Assinatura"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Nome *</Label>
              <Input placeholder="Ex: Dr. Carlos Eduardo Lima" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Cargo / Título *</Label>
              <Input placeholder="Ex: Técnico em Segurança do Trabalho" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Registro Profissional</Label>
              <Input placeholder="Ex: CREA 123456/PA" value={form.registration} onChange={e => setForm(f => ({ ...f, registration: e.target.value }))} />
            </div>

            {/* Assinatura */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Imagem da Assinatura</Label>
              {form.signature_url ? (
                <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                  <img src={form.signature_url} alt="Assinatura" className="max-h-20 object-contain mx-auto" />
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowPad(true)}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Redesenhar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-3 h-3 mr-1" /> Trocar imagem
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => setForm(f => ({ ...f, signature_url: "" }))}>
                      Remover
                    </Button>
                  </div>
                </div>
              ) : showPad ? (
                <SignaturePad onSave={handlePadSave} onCancel={() => setShowPad(false)} />
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => setShowPad(true)}>
                    <PenLine className="w-3 h-3" /> Desenhar assinatura
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-3 h-3" /> {uploading ? "Carregando..." : "Upload de imagem"}
                  </Button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saveMutation.isPending}>
                <Check className="w-4 h-4 mr-1" /> {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4" /> Assinaturas Cadastradas ({signatures.length})
          </h3>
          {isLoading && <p className="text-xs text-gray-400">Carregando...</p>}
          {signatures.length === 0 && !isLoading && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <PenLine className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma assinatura cadastrada</p>
            </div>
          )}
          {signatures.map(sig => (
            <Card key={sig.id} className={`transition-opacity ${sig.is_active === false ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-800 truncate">{sig.name}</p>
                      <Badge variant={sig.is_active !== false ? "default" : "secondary"} className="text-xs shrink-0">
                        {sig.is_active !== false ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{sig.title}</p>
                    {sig.registration && <p className="text-xs text-gray-400">{sig.registration}</p>}
                    {sig.signature_url && (
                      <div className="mt-2 border rounded bg-gray-50 p-2">
                        <img src={sig.signature_url} alt="Assinatura" className="max-h-12 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => startEdit(sig)}>Editar</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2"
                      onClick={() => toggleMutation.mutate({ id: sig.id, is_active: sig.is_active === false })}
                    >
                      {sig.is_active !== false ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                      onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate(sig.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}