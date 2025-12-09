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
  Mail, Plus, Edit2, Trash2, FileText, Save, X, Eye, Copy, Sparkles, MessageSquare
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

  const stats = {
    total: templates.length,
    bmm: templates.filter(t => t.type === 'BMM').length,
    notificacao: templates.filter(t => t.type === 'Notificação').length,
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Modelos de E-mail
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {stats.total} {stats.total === 1 ? 'modelo cadastrado' : 'modelos cadastrados'} • Templates personalizados
            </p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Mail className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.total}</p>
              <p className="text-sm text-gray-600">Total de Modelos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <FileText className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.bmm}</p>
              <p className="text-sm text-gray-600">Modelos BMM</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Sparkles className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.notificacao}</p>
              <p className="text-sm text-gray-600">Notificações</p>
            </CardContent>
          </Card>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card className="border border-gray-300">
            <CardHeader className="bg-gray-100 border-b border-gray-200">
              <h2 className="text-xl font-bold flex items-center gap-2 text-black">
                <Mail className="w-6 h-6" />
                {editingTemplate ? 'Editar Modelo' : 'Novo Modelo de E-mail'}
              </h2>
              <p className="text-gray-600 text-sm">Configure o template de comunicação</p>
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
                  <Button type="button" variant="outline" onClick={resetForm} className="hover:bg-stone-100">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gray-900 hover:bg-gray-800">
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
            <Card key={template.id} className="border border-gray-300 hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {template.type}
                  </Badge>
                  {template.is_default && (
                    <Badge variant="outline" className="text-xs">⭐ Padrão</Badge>
                  )}
                </div>
                <CardTitle className="text-lg text-black">{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-gray-600">{template.description}</p>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                <div className="border border-gray-200 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Assunto:</p>
                  <p className="text-sm font-medium text-black">{template.subject}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
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
          <Card className="border border-gray-300">
            <CardContent className="p-16 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-black mb-2">Nenhum modelo cadastrado</h3>
              <p className="text-gray-600 mb-6">Crie seu primeiro template de e-mail personalizado</p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Primeiro Modelo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}