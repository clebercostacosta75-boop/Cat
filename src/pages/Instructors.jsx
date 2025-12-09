import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Phone, User, Eye, Search, Edit2, Trash2, Award, DollarSign, Star, TrendingUp, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InstructorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  React.useEffect(() => {
    if (editingInstructor) {
      setFormData(editingInstructor);
    } else {
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
    }
  }, [editingInstructor]);

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

  const filteredInstructors = instructors.filter((instructor) => 
    instructor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.internal_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: instructors.length,
    active: instructors.filter(i => i.status === 'Ativo').length,
    totalValue: instructors.reduce((sum, i) => sum + (i.hourly_rate || 0), 0),
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Instrutores
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {stats.total} {stats.total === 1 ? 'instrutor cadastrado' : 'instrutores cadastrados'}
          </p>
        </div>

        {/* Pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Pesquisar instrutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <UsersIcon className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.total}</p>
              <p className="text-sm text-gray-600">Total de Instrutores</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Star className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.active}</p>
              <p className="text-sm text-gray-600">Instrutores Ativos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">
                R$ {(stats.totalValue / stats.total || 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">Valor Médio/Hora</p>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border border-gray-300 bg-white mb-6">
            <CardHeader>
              <h2 className="text-lg font-bold text-black">
                {editingInstructor ? 'Editar' : 'Novo'} Instrutor
              </h2>
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
                  <Button type="button" variant="outline" onClick={resetForm} className="hover:bg-stone-100">
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gray-900 hover:bg-gray-800">
                    {editingInstructor ? 'Atualizar' : 'Criar'} Instrutor
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstructors.map((instructor) => (
            <Card key={instructor.id} className="border border-gray-300 hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {instructor.status || 'Ativo'}
                  </Badge>
                  {instructor.internal_code && (
                    <Badge variant="outline" className="text-xs">
                      Cód: {instructor.internal_code}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg text-black">{instructor.name}</CardTitle>
                {instructor.specialty && (
                  <p className="text-sm text-gray-600">{instructor.specialty}</p>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {instructor.hourly_rate && (
                  <div className="border border-gray-300 p-3 rounded">
                    <p className="text-xs text-gray-500">Valor/Hora</p>
                    <p className="text-xl font-bold text-black">
                      R$ {(instructor.hourly_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {instructor.cpf && (
                  <div className="text-sm">
                    <p className="text-gray-500">CPF</p>
                    <p className="font-medium text-black">{instructor.cpf}</p>
                  </div>
                )}

                {instructor.email && (
                  <div className="text-sm">
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-black truncate">{instructor.email}</p>
                  </div>
                )}

                {instructor.phone && (
                  <div className="text-sm">
                    <p className="text-gray-500">Telefone</p>
                    <p className="font-medium text-black">{instructor.phone}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Link to={createPageUrl(`InstructorDetails?id=${instructor.id}`)} className="flex-1">
                    <Button size="sm" className="w-full bg-gray-900 hover:bg-gray-800">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(instructor)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(instructor.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {instructors.length === 0 && (
          <Card className="border border-gray-300">
            <CardContent className="p-16 text-center">
              <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-black mb-2">Nenhum instrutor cadastrado</h3>
              <p className="text-gray-600 mb-6">Comece adicionando o primeiro instrutor ao sistema</p>
              <Button 
                onClick={() => {
                  setEditingInstructor(null);
                  setShowForm(true);
                }}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Instrutor
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredInstructors.length === 0 && instructors.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600">Nenhum instrutor encontrado com "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}

        {/* Botão Fixo no Rodapé */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => {
              setEditingInstructor(null);
              setShowForm(true);
            }}
            className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-lg flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Novo Instrutor
          </button>
        </div>
      </div>
    </div>
  );
}