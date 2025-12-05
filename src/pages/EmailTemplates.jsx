import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, Plus, Edit2, Trash2, FileText, Save, X, Eye, Copy 
} from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subject: "",
    body: "",
    type: "BMM",
    is_default: false
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      resetForm();
      toast.success('Modelo criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      resetForm();
      toast.success('Modelo atualizado com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      toast.success('Modelo excluído!');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      subject: "",
      body: "",
      type: "BMM",
      is_default: false
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || "",
      description: template.description || "",
      subject: template.subject || "",
      body: template.body || "",
      type: template.type || "BMM",
      is_default: template.is_default || false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDuplicate = (template) => {
    setFormData({
      name: `${template.name} (Cópia)`,
      description: template.description || "",
      subject: template.subject || "",
      body: template.body || "",
      type: template.type || "BMM",
      is_default: false
    });
    setShowForm(true);
    toast.info('Modelo duplicado. Edite e salve.');
  };

  const placeholders = [
    { key: '{{empresa}}', desc: 'Nome da empresa' },
    { key: '{{periodo}}', desc: 'Período do BMM' },
    { key: '{{total_turmas}}', desc: 'Total de turmas' },
    { key: '{{total_alunos}}', desc: 'Total de alunos' },
    { key: '{{total_valor}}', desc: 'Valor total formatado' },
    { key: '{{contato_nome}}', desc: 'Nome do contato' },
    { key: '{{data_atual}}', desc: 'Data atual' },
  ];

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  };

  const typeColors = {
    'BMM': 'bg-emerald-100 text-emerald-800',
    'Notificação': 'bg-blue-100 text-blue-800',
    'Lembrete': 'bg-amber-100 text-amber-800',
    'Personalizado': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900">Modelos de E-mail</h1>
              <p className="text-stone-500 text-sm">Gerencie modelos para envio de BMM</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                {editingTemplate ? 'Editar Modelo' : 'Novo Modelo de E-mail'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Modelo *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: BMM Padrão"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BMM">📊 BMM</SelectItem>
                        <SelectItem value="Notificação">🔔 Notificação</SelectItem>
                        <SelectItem value="Lembrete">⏰ Lembrete</SelectItem>
                        <SelectItem value="Personalizado">✨ Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do modelo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assunto do E-mail *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: BMM - {{empresa}} - {{periodo}}"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Corpo do E-mail *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {showPreview ? 'Ocultar Preview' : 'Preview'}
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <ReactQuill
                      theme="snow"
                      value={formData.body}
                      onChange={(value) => setFormData({ ...formData, body: value })}
                      modules={quillModules}
                      className="bg-white"
                      style={{ minHeight: '250px' }}
                    />
                  </div>
                </div>

                {/* Placeholders */}
                <div className="bg-stone-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-stone-700 mb-2">
                    Placeholders disponíveis (clique para inserir):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {placeholders.map(p => (
                      <Badge
                        key={p.key}
                        variant="outline"
                        className="cursor-pointer hover:bg-emerald-50"
                        onClick={() => setFormData({ 
                          ...formData, 
                          body: formData.body + ' ' + p.key 
                        })}
                      >
                        {p.key}
                        <span className="ml-1 text-xs text-stone-400">({p.desc})</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {showPreview && (
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-sm font-medium text-stone-700 mb-2">Preview:</p>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formData.body }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                  <Label>Definir como modelo padrão para o tipo</Label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="w-4 h-4 mr-2" />
                    {editingTemplate ? 'Atualizar' : 'Criar'} Modelo
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Modelos */}
        <div className="grid md:grid-cols-2 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-stone-900">{template.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[template.type] || typeColors['Personalizado']}>
                      {template.type}
                    </Badge>
                    {template.is_default && (
                      <Badge className="bg-amber-100 text-amber-800">Padrão</Badge>
                    )}
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-stone-600 mb-3">{template.description}</p>
                )}

                <div className="bg-stone-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-stone-500 mb-1">Assunto:</p>
                  <p className="text-sm font-medium">{template.subject}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o modelo "{template.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(template.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && !isLoading && !showForm && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 mb-4">Nenhum modelo de e-mail cadastrado</p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Modelo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}