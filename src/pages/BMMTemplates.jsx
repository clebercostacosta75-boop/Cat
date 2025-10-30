import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BMMTemplatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['bmmTemplates'],
    queryFn: () => base44.entities.BMMTemplate.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BMMTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bmmTemplates'] });
      setShowForm(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BMMTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bmmTemplates'] });
      setShowForm(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BMMTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bmmTemplates'] });
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "Personalizado",
    show_signatures: true,
    is_default: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "Personalizado",
      show_signatures: true,
      is_default: false
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const typeColors = {
    'Demonstrativo Físico-Financeiro': 'bg-blue-100 text-blue-800',
    'Lista de Treinamentos Normativos': 'bg-green-100 text-green-800',
    'Personalizado': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Modelos de BMM</h1>
            <p className="text-stone-600 mt-1">Gerencie os templates de Boletim Mensal de Medição</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>{editingTemplate ? 'Editar' : 'Novo'} Modelo de BMM</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Modelo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: BMM Padrão 2025"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Modelo</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({...formData, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Demonstrativo Físico-Financeiro">📄 Demonstrativo Físico-Financeiro</SelectItem>
                        <SelectItem value="Lista de Treinamentos Normativos">📋 Lista de Treinamentos Normativos</SelectItem>
                        <SelectItem value="Personalizado">✨ Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o propósito deste modelo"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    {editingTemplate ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Modelos Padrão */}
        <div>
          <h3 className="text-lg font-semibold text-stone-900 mb-4">📦 Modelos Padrão do Sistema</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">Demonstrativo Físico-Financeiro</h3>
                      <Badge className="bg-blue-100 text-blue-800 mt-1">Modelo Padrão</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-stone-600 mb-4">
                  Modelo completo com cabeçalho formal, informações de contrato, tabela detalhada de itens e seção de assinaturas.
                </p>
                <div className="text-xs text-stone-500">
                  ✓ Cabeçalho com logo<br />
                  ✓ Informações contratuais<br />
                  ✓ Tabela de itens<br />
                  ✓ Seção de assinaturas
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">Lista de Treinamentos Normativos</h3>
                      <Badge className="bg-green-100 text-green-800 mt-1">Modelo Padrão</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-stone-600 mb-4">
                  Formato de tabela com lista detalhada de treinamentos, modalidade, carga horária, período e instrutor.
                </p>
                <div className="text-xs text-stone-500">
                  ✓ Lista de treinamentos<br />
                  ✓ Informações do instrutor<br />
                  ✓ Horários e períodos<br />
                  ✓ Totalizadores
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modelos Personalizados */}
        {templates.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-stone-900 mb-4">✨ Modelos Personalizados</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-stone-900">{template.name}</h3>
                          <Badge className={typeColors[template.type]}>
                            {template.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-stone-600 mb-4">{template.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(template)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {templates.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 mb-4">Nenhum modelo personalizado criado</p>
              <p className="text-sm text-stone-500 mb-4">
                Use os modelos padrão ou crie seus próprios modelos personalizados
              </p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Criar Primeiro Modelo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}