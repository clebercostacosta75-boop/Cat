import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Users, Mail, Phone, Search, Edit2, Trash2, TrendingUp, DollarSign, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CompanyForm from "@/components/company/CompanyForm";

export default function CompaniesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowForm(false);
      setEditingCompany(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowForm(false);
      setEditingCompany(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const handleSubmit = (data) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingCompany(null);
    setShowForm(false);
  };

  const statusColors = {
    'Ativo': 'bg-green-500 text-white border-0 shadow-md',
    'Inativo': 'bg-red-500 text-white border-0 shadow-md',
  };

  const filteredCompanies = companies.filter((company) =>
    company.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.status === 'Ativo').length,
    totalUnits: companies.reduce((sum, c) => sum + (c.units?.length || 0), 0),
    totalContacts: companies.reduce((sum, c) => sum + (c.contacts?.length || 0), 0),
  };

  const getCompanyCourses = (companyId) => {
    return classSchedules.filter(cs => cs.company_id === companyId);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Empresas Clientes
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {stats.total} {stats.total === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}
          </p>
        </div>

        {/* Pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Pesquisar empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Building2 className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Empresas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <TrendingUp className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.active}</p>
              <p className="text-sm text-gray-600">Empresas Ativas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <MapPin className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.totalUnits}</p>
              <p className="text-sm text-gray-600">Unidades Totais</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Users className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{stats.totalContacts}</p>
              <p className="text-sm text-gray-600">Contatos Cadastrados</p>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border border-gray-300 bg-white mb-6">
            <CardHeader>
              <h2 className="text-lg font-bold text-black">
                {editingCompany ? 'Editar' : 'Nova'} Empresa
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <CompanyForm
                company={editingCompany}
                onSubmit={handleSubmit}
                onCancel={resetForm}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="border border-gray-300 hover:shadow-md transition-shadow">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {company.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-black">{company.nome_fantasia}</CardTitle>
                <p className="text-sm text-gray-600">{company.razao_social}</p>
                <p className="text-xs text-gray-500 mt-1">{company.cnpj}</p>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {company.email_faturamento && (
                  <div className="text-sm">
                    <p className="text-gray-500">Email Faturamento</p>
                    <p className="font-medium text-black truncate">{company.email_faturamento}</p>
                  </div>
                )}

                {company.units && company.units.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      {company.units.length} {company.units.length === 1 ? 'Unidade' : 'Unidades'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {company.units.slice(0, 3).map((unit, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {unit.name}
                        </Badge>
                      ))}
                      {company.units.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{company.units.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {company.contacts && company.contacts.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      {company.contacts.length} {company.contacts.length === 1 ? 'Contato' : 'Contatos'}
                    </p>
                    <div className="space-y-2">
                      {company.contacts.slice(0, 2).map((contact, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-black">{contact.name}</p>
                          <p className="text-xs text-gray-600">{contact.role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getCompanyCourses(company.id).length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <p className="text-xs text-gray-500 font-semibold">
                        {getCompanyCourses(company.id).length} {getCompanyCourses(company.id).length === 1 ? 'Curso' : 'Cursos'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      {getCompanyCourses(company.id).slice(0, 5).map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 font-medium">{course.training_name}</span>
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            {course.students_count || 0} alunos
                          </Badge>
                        </div>
                      ))}
                      {getCompanyCourses(company.id).length > 5 && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          +{getCompanyCourses(company.id).length - 5} cursos
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(company)}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(company.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && !isLoading && (
          <Card className="border border-gray-300">
            <CardContent className="p-16 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-black mb-2">Nenhuma empresa cadastrada</h3>
              <p className="text-gray-600 mb-6">Comece adicionando a primeira empresa cliente</p>
              <Button 
                onClick={() => {
                  setEditingCompany(null);
                  setShowForm(true);
                }}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Plus className="w-5 h-5 mr-2" />
                Cadastrar Primeira Empresa
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredCompanies.length === 0 && companies.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600">Nenhuma empresa encontrada com "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}

        {/* Botão Fixo no Rodapé */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => {
              setEditingCompany(null);
              setShowForm(true);
            }}
            className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Empresa
          </button>
        </div>
      </div>
    </div>
  );
}