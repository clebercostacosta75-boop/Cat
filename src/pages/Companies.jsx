import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Users, Mail, Phone, Search, Edit2, Trash2, TrendingUp, DollarSign } from "lucide-react";
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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                <span className="text-white text-xs font-bold">{stats.total}</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Empresas Clientes
              </h1>
              <p className="text-stone-600 text-sm mt-1 font-medium">
                {stats.total} {stats.total === 1 ? 'empresa cadastrada' : 'empresas cadastradas'} • Cadastro completo
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Pesquisar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64 border-blue-200 focus:border-blue-500"
              />
            </div>
            <Button 
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Empresa
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Building2 className="w-10 h-10 text-blue-600 mb-3" />
                  <p className="text-4xl font-black text-blue-900 mb-1">{stats.total}</p>
                  <p className="text-xs font-semibold text-blue-700">Total Empresas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-green-100 to-emerald-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <TrendingUp className="w-10 h-10 text-green-600 mb-3" />
                  <p className="text-4xl font-black text-green-900 mb-1">{stats.active}</p>
                  <p className="text-xs font-semibold text-green-700">Empresas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-purple-100 to-violet-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <MapPin className="w-10 h-10 text-purple-600 mb-3" />
                  <p className="text-4xl font-black text-purple-900 mb-1">{stats.totalUnits}</p>
                  <p className="text-xs font-semibold text-purple-700">Unidades Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-100 to-orange-50 p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <Users className="w-10 h-10 text-amber-600 mb-3" />
                  <p className="text-4xl font-black text-amber-900 mb-1">{stats.totalContacts}</p>
                  <p className="text-xs font-semibold text-amber-700">Contatos Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                {editingCompany ? 'Editar' : 'Nova'} Empresa
              </h2>
              <p className="text-blue-100 text-sm mt-1">Cadastro completo com unidades e contatos</p>
            </div>
            <CardContent className="p-6">
              <CompanyForm
                company={editingCompany}
                onSubmit={handleSubmit}
                onCancel={resetForm}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-0 relative z-10">
                {/* Header Card com Gradiente */}
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-6 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  
                  <div className="relative z-10 flex items-start justify-between mb-4">
                    <Badge className={statusColors[company.status]}>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full bg-white animate-pulse`} />
                        {company.status}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white mb-2">
                      {company.nome_fantasia}
                    </h3>
                    <p className="text-blue-100 text-sm mb-3">{company.razao_social}</p>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      📄 {company.cnpj}
                    </Badge>
                  </div>
                </div>

                {/* Body Card */}
                <div className="p-6 space-y-4">
                  {/* Email de Faturamento */}
                  {company.email_faturamento && (
                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-500 font-medium">Email Faturamento</p>
                        <p className="text-sm font-medium text-stone-900 truncate">{company.email_faturamento}</p>
                      </div>
                    </div>
                  )}

                  {/* Unidades */}
                  {company.units && company.units.length > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-900">
                          {company.units.length} {company.units.length === 1 ? 'Unidade' : 'Unidades'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {company.units.slice(0, 3).map((unit, idx) => (
                          <Badge key={idx} className="bg-white text-emerald-700 border-0 shadow-sm">
                            📍 {unit.name}
                          </Badge>
                        ))}
                        {company.units.length > 3 && (
                          <Badge className="bg-emerald-200 text-emerald-800 border-0">
                            +{company.units.length - 3} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contatos */}
                  {company.contacts && company.contacts.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-purple-900">
                          {company.contacts.length} {company.contacts.length === 1 ? 'Contato' : 'Contatos'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {company.contacts.slice(0, 2).map((contact, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="font-bold text-stone-900 text-sm">{contact.name}</div>
                            <div className="text-xs text-stone-600 flex items-center gap-2 mt-1">
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{contact.role}</span>
                              {contact.unit_name && <span>• {contact.unit_name}</span>}
                            </div>
                          </div>
                        ))}
                        {company.contacts.length > 2 && (
                          <p className="text-xs text-purple-600 font-medium text-center pt-1">
                            +{company.contacts.length - 2} contato(s) adicional(is)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(company)}
                      className="flex-1 hover:bg-blue-50 border-blue-200 text-blue-700"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteMutation.mutate(company.id)}
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

        {companies.length === 0 && !isLoading && (
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Building2 className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Nenhuma empresa cadastrada</h3>
              <p className="text-stone-600 mb-6">Comece adicionando a primeira empresa cliente</p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Cadastrar Primeira Empresa
              </Button>
            </div>
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
      </div>
    </div>
  );
}