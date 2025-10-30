import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building, FileText, X, CreditCard, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ContractorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const queryClient = useQueryClient();

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contractor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setShowForm(false);
      setEditingContractor(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contractor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setShowForm(false);
      setEditingContractor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contractor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
  });

  const [formData, setFormData] = useState({
    company_name: "",
    razao_social: "",
    cnpj: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip_code: ""
    },
    bank_data: {
      bank_name: "",
      bank_code: "",
      agency: "",
      account: "",
      account_type: "Corrente"
    },
    contracts: [],
    contact_email: "",
    contact_phone: "",
    status: "Ativo",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (contractor) => {
    setEditingContractor(contractor);
    setFormData({
      ...contractor,
      address: contractor.address || {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: ""
      },
      bank_data: contractor.bank_data || {
        bank_name: "",
        bank_code: "",
        agency: "",
        account: "",
        account_type: "Corrente"
      },
      contracts: contractor.contracts || []
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      razao_social: "",
      cnpj: "",
      address: {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: ""
      },
      bank_data: {
        bank_name: "",
        bank_code: "",
        agency: "",
        account: "",
        account_type: "Corrente"
      },
      contracts: [],
      contact_email: "",
      contact_phone: "",
      status: "Ativo",
      notes: ""
    });
    setEditingContractor(null);
    setShowForm(false);
  };

  const handleAddContract = () => {
    setFormData({
      ...formData,
      contracts: [
        ...formData.contracts,
        {
          contract_number: "",
          client_company_id: "",
          client_company_name: "",
          contract_object: "",
          contract_value: 0,
          start_date: "",
          end_date: "",
          bmm_reference: "",
          status: "Ativo"
        }
      ]
    });
  };

  const handleRemoveContract = (index) => {
    setFormData({
      ...formData,
      contracts: formData.contracts.filter((_, i) => i !== index)
    });
  };

  const handleContractChange = (index, field, value) => {
    const updated = [...formData.contracts];

    if (field === 'client_company_id') {
      const company = companies.find(c => c.id === value);
      updated[index] = {
        ...updated[index],
        client_company_id: value,
        client_company_name: company ? company.name : ''
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    setFormData({ ...formData, contracts: updated });
  };

  const statusColors = {
    'Ativo': 'bg-green-100 text-green-800 border-green-200',
    'Inativo': 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Empresas Contratadas</h1>
            <p className="text-stone-600 mt-1">Prestadoras de serviço de treinamento</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Contratada
          </Button>
        </div>

        {showForm && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>{editingContractor ? 'Editar' : 'Nova'} Empresa Contratada</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Básicos */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-emerald-600" />
                    1. Identificação da Empresa
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Nome da Empresa *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                        placeholder="Ex: V.S. Nunes Cursos"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razao_social">Razão Social *</Label>
                      <Input
                        id="razao_social"
                        value={formData.razao_social}
                        onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                        placeholder="Ex: V.S. Nunes Cursos e Treinamento LTDA"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({...formData, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">✅ Ativo</SelectItem>
                          <SelectItem value="Inativo">❌ Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">E-mail de Contato</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Telefone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    2. Endereço
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input
                        value={formData.address.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value }
                        })}
                        placeholder="Rua, Avenida..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={formData.address.number}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, number: e.target.value }
                        })}
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input
                        value={formData.address.complement}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, complement: e.target.value }
                        })}
                        placeholder="Sala, Andar..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={formData.address.neighborhood}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, neighborhood: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado (UF)</Label>
                      <Input
                        value={formData.address.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value }
                        })}
                        placeholder="PA"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input
                        value={formData.address.zip_code}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, zip_code: e.target.value }
                        })}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados Bancários */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    3. Dados Bancários
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Banco</Label>
                      <Input
                        value={formData.bank_data.bank_name}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_data: { ...formData.bank_data, bank_name: e.target.value }
                        })}
                        placeholder="Ex: Bradesco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código do Banco</Label>
                      <Input
                        value={formData.bank_data.bank_code}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_data: { ...formData.bank_data, bank_code: e.target.value }
                        })}
                        placeholder="Ex: 237"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agência (com dígito)</Label>
                      <Input
                        value={formData.bank_data.agency}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_data: { ...formData.bank_data, agency: e.target.value }
                        })}
                        placeholder="0000-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Conta (com dígito)</Label>
                      <Input
                        value={formData.bank_data.account}
                        onChange={(e) => setFormData({
                          ...formData,
                          bank_data: { ...formData.bank_data, account: e.target.value }
                        })}
                        placeholder="00000-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Conta</Label>
                      <Select 
                        value={formData.bank_data.account_type} 
                        onValueChange={(value) => setFormData({
                          ...formData,
                          bank_data: { ...formData.bank_data, account_type: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Corrente">Corrente</SelectItem>
                          <SelectItem value="Poupança">Poupança</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contratos */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      4. Contratos com Empresas Clientes
                    </h3>
                    <Button type="button" onClick={handleAddContract} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Contrato
                    </Button>
                  </div>

                  {formData.contracts.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 bg-stone-50 rounded-lg">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                      <p>Nenhum contrato cadastrado</p>
                      <p className="text-sm">Clique em "Adicionar Contrato" para começar</p>
                    </div>
                  ) : (
                    formData.contracts.map((contract, index) => (
                      <Card key={index} className="bg-orange-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-semibold text-stone-900">Contrato {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveContract(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Número do Contrato *</Label>
                              <Input
                                value={contract.contract_number}
                                onChange={(e) => handleContractChange(index, 'contract_number', e.target.value)}
                                placeholder="Ex: 001/2025"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Empresa Cliente *</Label>
                              <Select 
                                value={contract.client_company_id} 
                                onValueChange={(value) => handleContractChange(index, 'client_company_id', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {companies.map(company => (
                                    <SelectItem key={company.id} value={company.id}>
                                      {company.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Objeto do Contrato</Label>
                              <Textarea
                                value={contract.contract_object}
                                onChange={(e) => handleContractChange(index, 'contract_object', e.target.value)}
                                placeholder="Prestação de serviços de treinamento..."
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Valor do Contrato (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={contract.contract_value}
                                onChange={(e) => handleContractChange(index, 'contract_value', parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Referência BMM</Label>
                              <Input
                                value={contract.bmm_reference}
                                onChange={(e) => handleContractChange(index, 'bmm_reference', e.target.value)}
                                placeholder="Para preencher BMM"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Data de Início</Label>
                              <Input
                                type="date"
                                value={contract.start_date}
                                onChange={(e) => handleContractChange(index, 'start_date', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Data de Término</Label>
                              <Input
                                type="date"
                                value={contract.end_date}
                                onChange={(e) => handleContractChange(index, 'end_date', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Status do Contrato</Label>
                              <Select 
                                value={contract.status} 
                                onValueChange={(value) => handleContractChange(index, 'status', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Ativo">✅ Ativo</SelectItem>
                                  <SelectItem value="Encerrado">🔒 Encerrado</SelectItem>
                                  <SelectItem value="Suspenso">⏸️ Suspenso</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Observações */}
                <div className="border-t pt-4 space-y-2">
                  <Label htmlFor="notes">Observações Gerais</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    {editingContractor ? 'Atualizar' : 'Criar'} Contratada
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Contratadas */}
        <div className="grid lg:grid-cols-2 gap-6">
          {contractors.map((contractor) => (
            <Card key={contractor.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-900 mb-1">
                        {contractor.company_name}
                      </h3>
                      <p className="text-sm text-stone-600 mb-2">{contractor.razao_social}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className={`${statusColors[contractor.status]} border`}>
                          {contractor.status}
                        </Badge>
                        <span className="text-xs text-stone-500">{contractor.cnpj}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {contractor.contact_email && (
                  <div className="text-sm text-stone-600 mb-3">
                    📧 {contractor.contact_email}
                  </div>
                )}

                {contractor.contracts && contractor.contracts.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-stone-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-stone-900">
                        {contractor.contracts.length} Contrato(s)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {contractor.contracts.slice(0, 2).map((contract, idx) => (
                        <div key={idx} className="text-sm bg-orange-50 rounded-lg p-2">
                          <div className="font-medium text-stone-900">
                            {contract.contract_number} - {contract.client_company_name}
                          </div>
                          <div className="text-xs text-stone-600">
                            Valor: R$ {(contract.contract_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                      {contractor.contracts.length > 2 && (
                        <p className="text-xs text-stone-500 pl-2">
                          +{contractor.contracts.length - 2} contrato(s) adicional(is)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(contractor)}
                    className="flex-1"
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir esta contratada?')) {
                        deleteMutation.mutate(contractor.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {contractors.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Building className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 mb-4">Nenhuma empresa contratada cadastrada</p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Cadastrar Primeira Contratada
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}