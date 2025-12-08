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
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
              <UsersIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Instrutores
              </h1>
              <p className="text-stone-600 text-sm mt-1 font-medium">
                {stats.total} {stats.total === 1 ? 'instrutor cadastrado' : 'instrutores cadastrados'} • Gestão completa
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-center flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              <Input
                placeholder="Pesquisar instrutor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64 border-indigo-200 focus:border-indigo-500"
              />
            </div>
            <Button 
              onClick={() => {
                setEditingInstructor(null);
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
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Novo Instrutor
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <UsersIcon className="w-10 h-10 text-indigo-600 mb-3" />
                  <p className="text-4xl font-black text-indigo-900 mb-1">{stats.total}</p>
                  <p className="text-xs font-semibold text-indigo-700">Total de Instrutores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-green-100 to-emerald-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Star className="w-10 h-10 text-green-600 mb-3" />
                  <p className="text-4xl font-black text-green-900 mb-1">{stats.active}</p>
                  <p className="text-xs font-semibold text-green-700">Instrutores Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-100 to-orange-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <DollarSign className="w-10 h-10 text-amber-600 mb-3" />
                  <p className="text-4xl font-black text-amber-900 mb-1">
                    R$ {(stats.totalValue / stats.total || 0).toFixed(0)}
                  </p>
                  <p className="text-xs font-semibold text-amber-700">Valor Médio/Hora</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                {editingInstructor ? 'Editar' : 'Novo'} Instrutor
              </h2>
              <p className="text-indigo-100 text-sm mt-1">Preencha as informações do instrutor</p>
            </div>
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
                  <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                    {editingInstructor ? 'Atualizar' : 'Criar'} Instrutor
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructors.map((instructor) => (
            <Card key={instructor.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-0 relative z-10">
                {/* Header Card com Gradiente */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-6 pb-12 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  
                  <div className="relative z-10 flex items-start justify-between mb-4">
                    <Badge className={instructor.status === 'Ativo' ? 'bg-green-500 text-white border-0 shadow-lg' : 'bg-red-500 text-white border-0 shadow-lg'}>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full bg-white animate-pulse`} />
                        {instructor.status || 'Ativo'}
                      </div>
                    </Badge>
                    {instructor.internal_code && (
                      <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                        Cód: {instructor.internal_code}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="relative z-10 flex items-center gap-4">
                    {instructor.photo_url ? (
                      <img 
                        src={instructor.photo_url} 
                        alt={instructor.name}
                        className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-4 border-white shadow-xl">
                        <User className="w-10 h-10 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-white mb-1 line-clamp-2">{instructor.name}</h3>
                      {instructor.specialty && (
                        <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          {instructor.specialty}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body Card */}
                <div className="p-6 pt-4 space-y-4">
                  {/* Valor Destaque */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-900">Valor/Hora</span>
                      </div>
                      <span className="text-2xl font-black text-amber-600">
                        R$ {(instructor.hourly_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Informações de Contato */}
                  <div className="space-y-3">
                    {instructor.cpf && (
                      <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">📄</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-stone-500 font-medium">CPF</p>
                          <p className="text-sm font-bold text-stone-900">{instructor.cpf}</p>
                        </div>
                      </div>
                    )}

                    {instructor.email && (
                      <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-500 font-medium">Email</p>
                          <p className="text-sm font-medium text-stone-900 truncate">{instructor.email}</p>
                        </div>
                      </div>
                    )}

                    {instructor.phone && (
                      <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Phone className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-stone-500 font-medium">Telefone</p>
                          <p className="text-sm font-bold text-stone-900">{instructor.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 pt-4">
                    <Link to={createPageUrl(`InstructorDetails?id=${instructor.id}`)} className="flex-1">
                      <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(instructor)}
                      className="hover:bg-blue-50 border-blue-200 text-blue-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(instructor.id)}
                      className="hover:bg-red-50 border-red-200 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {instructors.length === 0 && (
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <UsersIcon className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Nenhum instrutor cadastrado</h3>
              <p className="text-stone-600 mb-6">Comece adicionando o primeiro instrutor ao sistema</p>
              <Button 
                onClick={() => {
                  setEditingInstructor(null);
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
                  setShowForm(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Instrutor
              </Button>
            </div>
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
      </div>
    </div>
  );
}