import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Users, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CompanyForm from "@/components/company/CompanyForm";

export default function CompaniesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
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
    'Ativo': 'bg-green-100 text-green-800 border-green-200',
    'Inativo': 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Logo e Título */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Empresas Clientes</h1>
            <p className="text-stone-600 mt-1">Cadastro central de empresas, unidades e contatos</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Empresa
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
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
          {companies.map((company) => (
            <Card key={company.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                {/* Cabeçalho */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-900 mb-1">
                        {company.nome_fantasia}
                      </h3>
                      <p className="text-sm text-stone-600 mb-2">{company.razao_social}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className={`${statusColors[company.status]} border`}>
                          {company.status}
                        </Badge>
                        <span className="text-xs text-stone-500">{company.cnpj}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações de Contato */}
                {company.email_faturamento && (
                  <div className="flex items-center gap-2 text-sm text-stone-600 mb-3 pb-3 border-b border-stone-200">
                    <Mail className="w-4 h-4 text-stone-400" />
                    <span>{company.email_faturamento}</span>
                  </div>
                )}

                {/* Unidades */}
                {company.units && company.units.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-stone-900">
                        {company.units.length} Unidade(s)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {company.units.slice(0, 3).map((unit, idx) => (
                        <Badge key={idx} variant="outline" className="bg-emerald-50">
                          📍 {unit.name}
                        </Badge>
                      ))}
                      {company.units.length > 3 && (
                        <Badge variant="outline" className="bg-stone-50">
                          +{company.units.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Contatos */}
                {company.contacts && company.contacts.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-stone-900">
                        {company.contacts.length} Contato(s)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {company.contacts.slice(0, 2).map((contact, idx) => (
                        <div key={idx} className="text-sm bg-purple-50 rounded-lg p-2">
                          <div className="font-medium text-stone-900">{contact.name}</div>
                          <div className="text-xs text-stone-600">
                            {contact.role} • {contact.unit_name}
                          </div>
                        </div>
                      ))}
                      {company.contacts.length > 2 && (
                        <p className="text-xs text-stone-500 pl-2">
                          +{company.contacts.length - 2} contato(s) adicional(is)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-4 border-t border-stone-200">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(company)}
                    className="flex-1"
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(company.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && !isLoading && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 mb-4">Nenhuma empresa cadastrada</p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Cadastrar Primeira Empresa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}