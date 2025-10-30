import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Mail, Phone, User, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InstructorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const queryClient = useQueryClient();

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Instructor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setShowForm(false);
      setEditingInstructor(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Instructor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      setShowForm(false);
      setEditingInstructor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Instructor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    status: "Ativo",
    internal_code: "",
    cpf: "",
    rg: "",
    hourly_rate: "",
    specialty: "",
    email: "",
    phone: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingInstructor) {
      updateMutation.mutate({ id: editingInstructor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (instructor) => {
    setEditingInstructor(instructor);
    setFormData(instructor);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ 
      name: "", 
      status: "Ativo",
      internal_code: "",
      cpf: "",
      rg: "",
      hourly_rate: "", 
      specialty: "", 
      email: "", 
      phone: "" 
    });
    setEditingInstructor(null);
    setShowForm(false);
  };

  // Máscara para CPF
  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({...formData, cpf: formatted});
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Instrutores</h1>
            <p className="text-stone-600 mt-1">Gerencie os instrutores e seus valores</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Instrutor
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>{editingInstructor ? 'Editar' : 'Novo'} Instrutor</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internal_code">Código Interno</Label>
                    <Input
                      id="internal_code"
                      value={formData.internal_code}
                      onChange={(e) => setFormData({...formData, internal_code: e.target.value})}
                      placeholder="Ex: 7083, 7772"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => setFormData({...formData, rg: e.target.value})}
                      placeholder="00.000.000-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Valor HR Aula (R$)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                      placeholder="Ex: Segurança do Trabalho"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    {editingInstructor ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructors.map((instructor) => (
            <Card key={instructor.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {instructor.photo_url ? (
                      <img 
                        src={instructor.photo_url} 
                        alt={instructor.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-emerald-600" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      {instructor.specialty && (
                        <Badge variant="outline" className="bg-stone-50 w-fit">
                          {instructor.specialty}
                        </Badge>
                      )}
                      {instructor.internal_code && (
                        <Badge variant="outline" className="bg-blue-50 w-fit text-xs">
                          Cód: {instructor.internal_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={instructor.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${instructor.status === 'Ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {instructor.status || 'Ativo'}
                    </div>
                  </Badge>
                </div>

                <h3 className="text-xl font-bold text-stone-900 mb-4">{instructor.name}</h3>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-600">Valor/hora:</span>
                    <span className="font-bold text-emerald-600">
                      R$ {(instructor.hourly_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {instructor.cpf && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <span>📄 CPF:</span>
                      <span className="font-medium">{instructor.cpf}</span>
                    </div>
                  )}

                  {instructor.email && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{instructor.email}</span>
                    </div>
                  )}

                  {instructor.phone && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Phone className="w-4 h-4" />
                      <span>{instructor.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link to={createPageUrl(`InstructorDetails?id=${instructor.id}`)} className="flex-1">
                    <Button variant="default" size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(instructor.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {instructors.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-stone-400" />
              </div>
              <p className="text-stone-600">Nenhum instrutor cadastrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}