import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, MapPin, Users, BookOpen, MessageCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import LogoUploader from "./LogoUploader";

export default function CompanyForm({ company, onSubmit, onCancel }) {
  const [notifyInstructor, setNotifyInstructor] = useState(false);
  const [sendingNotification, setSendingNotification] = useState({});

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const { data: bmmTemplates = [] } = useQuery({
    queryKey: ['bmmTemplates'],
    queryFn: () => base44.entities.BMMTemplate.list(),
    initialData: [],
  });

  const [formData, setFormData] = useState({
    razao_social: company?.razao_social || "",
    nome_fantasia: company?.nome_fantasia || "",
    cnpj: company?.cnpj || "",
    status: company?.status || "Ativo",
    logo_url: company?.logo_url || "",
    default_bmm_template_id: company?.default_bmm_template_id || "",
    email_faturamento: company?.email_faturamento || "",
    units: company?.units || [],
    contacts: company?.contacts || [],
    billing_info: company?.billing_info || {
      contact_reference: "",
      contract_object: ""
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Funções para Unidades
  const handleAddUnit = () => {
    setFormData({
      ...formData,
      units: [
        ...formData.units,
        {
          name: "",
          address: {
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
            zip_code: ""
          }
        }
      ]
    });
  };

  const handleRemoveUnit = (index) => {
    setFormData({
      ...formData,
      units: formData.units.filter((_, i) => i !== index)
    });
  };

  const handleUnitChange = (index, field, value) => {
    const updated = [...formData.units];
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      updated[index] = {
        ...updated[index],
        address: {
          ...updated[index].address,
          [addressField]: value
        }
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData({ ...formData, units: updated });
  };

  // Funções para Contatos
  const handleAddContact = () => {
    setFormData({
      ...formData,
      contacts: [
        ...formData.contacts,
        {
          name: "",
          role: "",
          unit_name: "",
          phone: "",
          is_whatsapp: false,
          email: ""
        }
      ]
    });
  };

  const handleRemoveContact = (index) => {
    setFormData({
      ...formData,
      contacts: formData.contacts.filter((_, i) => i !== index)
    });
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...formData.contacts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, contacts: updated });
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Identificação Principal */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            1. Identificação Principal (Dados Matriz)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo Upload */}
            <LogoUploader 
              logoUrl={formData.logo_url}
              onLogoChange={(url) => setFormData({...formData, logo_url: url})}
            />
            
            {/* Dados principais */}
            <div className="flex-1 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                  placeholder="Ex: Agropalma S.A."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                  placeholder="Ex: Agropalma"
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
                <Label htmlFor="email_faturamento">Email de Faturamento</Label>
                <Input
                  id="email_faturamento"
                  type="email"
                  value={formData.email_faturamento}
                  onChange={(e) => setFormData({...formData, email_faturamento: e.target.value})}
                  placeholder="faturamento@empresa.com.br"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_bmm_template">Modelo BMM Padrão</Label>
                <Select 
                  value={formData.default_bmm_template_id} 
                  onValueChange={(value) => setFormData({...formData, default_bmm_template_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {bmmTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        📄 {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Unidades / Localizações */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              2. Unidades / Localizações
            </CardTitle>
            <Button type="button" onClick={handleAddUnit} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Unidade
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.units.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p>Nenhuma unidade cadastrada</p>
              <p className="text-sm">Clique em "Adicionar Unidade" para começar</p>
            </div>
          ) : (
            formData.units.map((unit, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold text-stone-900">Unidade {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUnit(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nome da Unidade *</Label>
                      <Input
                        value={unit.name}
                        onChange={(e) => handleUnitChange(index, 'name', e.target.value)}
                        placeholder="Ex: Fábrica Tailândia, Escritório Belém"
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Logradouro</Label>
                        <Input
                          value={unit.address?.street || ''}
                          onChange={(e) => handleUnitChange(index, 'address.street', e.target.value)}
                          placeholder="Rua, Avenida..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                          value={unit.address?.number || ''}
                          onChange={(e) => handleUnitChange(index, 'address.number', e.target.value)}
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Complemento</Label>
                        <Input
                          value={unit.address?.complement || ''}
                          onChange={(e) => handleUnitChange(index, 'address.complement', e.target.value)}
                          placeholder="Sala, Andar..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input
                          value={unit.address?.neighborhood || ''}
                          onChange={(e) => handleUnitChange(index, 'address.neighborhood', e.target.value)}
                          placeholder="Nome do bairro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={unit.address?.city || ''}
                          onChange={(e) => handleUnitChange(index, 'address.city', e.target.value)}
                          placeholder="Nome da cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Input
                          value={unit.address?.state || ''}
                          onChange={(e) => handleUnitChange(index, 'address.state', e.target.value)}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <Input
                          value={unit.address?.zip_code || ''}
                          onChange={(e) => handleUnitChange(index, 'address.zip_code', e.target.value)}
                          placeholder="00000-000"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* 3. Contatos */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              3. Contatos
            </CardTitle>
            <Button type="button" onClick={handleAddContact} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Contato
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.contacts.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p>Nenhum contato cadastrado</p>
              <p className="text-sm">Clique em "Adicionar Contato" para começar</p>
            </div>
          ) : (
            formData.contacts.map((contact, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold text-stone-900">Contato {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveContact(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nome do Contato *</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                        placeholder="Ex: João Silva"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo/Função</Label>
                      <Input
                        value={contact.role}
                        onChange={(e) => handleContactChange(index, 'role', e.target.value)}
                        placeholder="Ex: Gestor de Contrato, Fiscal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade (Vínculo)</Label>
                      <Select 
                        value={contact.unit_name} 
                        onValueChange={(value) => handleContactChange(index, 'unit_name', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.units.map((unit, idx) => (
                            <SelectItem key={idx} value={unit.name}>
                              📍 {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone/Celular</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email do Contato</Label>
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox 
                        id={`whatsapp-${index}`}
                        checked={contact.is_whatsapp}
                        onCheckedChange={(checked) => handleContactChange(index, 'is_whatsapp', checked)}
                      />
                      <label
                        htmlFor={`whatsapp-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        É WhatsApp?
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* 4. Informações de Faturamento */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">📄</span>
            4. Informações de Faturamento (Vínculo com BMM)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_reference">Referência do Contato (Ref. Contato)</Label>
            {formData.contacts.length > 0 ? (
              <>
                <Select
                  value={formData.billing_info.contact_reference}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    billing_info: {
                      ...formData.billing_info,
                      contact_reference: value
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contato de referência para o BMM" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.contacts.map((contact, idx) => (
                      <SelectItem key={idx} value={contact.name}>
                        👤 {contact.name} {contact.role && `- ${contact.role}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-stone-500">
                  Selecionado da lista de contatos cadastrados
                </p>
              </>
            ) : (
              <>
                <Input
                  id="contact_reference"
                  value={formData.billing_info.contact_reference}
                  onChange={(e) => setFormData({
                    ...formData,
                    billing_info: {
                      ...formData.billing_info,
                      contact_reference: e.target.value
                    }
                  })}
                  placeholder="Digite o nome do contato"
                />
                <p className="text-xs text-amber-600">
                  ⚠️ Adicione contatos na seção "3. Contatos" para seleção automática
                </p>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_object">Objeto do Contrato (Opcional)</Label>
            <Textarea
              id="contract_object"
              value={formData.billing_info.contract_object}
              onChange={(e) => setFormData({
                ...formData,
                billing_info: {
                  ...formData.billing_info,
                  contract_object: e.target.value
                }
              })}
              placeholder="Descrição detalhada do objeto do contrato"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {company ? 'Atualizar' : 'Criar'} Empresa
        </Button>
      </div>
    </form>
  );
}