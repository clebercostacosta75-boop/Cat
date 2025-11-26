import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Plus, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function InstructorForm({ instructor, onChange, section }) {
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      onChange({ photo_url: result.file_url });
    } catch (error) {
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleAddPixKey = () => {
    const pix_keys = [...(instructor.pix_keys || []), { type: 'CPF/CNPJ', key: '' }];
    onChange({ pix_keys });
  };

  const handleRemovePixKey = (index) => {
    const pix_keys = instructor.pix_keys.filter((_, i) => i !== index);
    onChange({ pix_keys });
  };

  const handlePixKeyChange = (index, field, value) => {
    const pix_keys = [...instructor.pix_keys];
    pix_keys[index] = { ...pix_keys[index], [field]: value };
    onChange({ pix_keys });
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
    onChange({ cpf: formatted });
  };

  if (section === 'basic') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {instructor.photo_url ? (
              <img 
                src={instructor.photo_url} 
                alt={instructor.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-stone-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-stone-200 flex items-center justify-center">
                <Upload className="w-12 h-12 text-stone-400" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload">
              <Button 
                type="button" 
                size="sm" 
                className="absolute bottom-0 right-0"
                disabled={uploading}
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="w-3 h-3 mr-1" />
                  {uploading ? 'Enviando...' : 'Foto'}
                </span>
              </Button>
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={instructor.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Nome completo do instrutor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={instructor.status || 'Ativo'} 
              onValueChange={(value) => onChange({ status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Ativo
                  </div>
                </SelectItem>
                <SelectItem value="Inativo">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Inativo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="internal_code">Código Interno</Label>
            <Input
              id="internal_code"
              value={instructor.internal_code || ''}
              onChange={(e) => onChange({ internal_code: e.target.value })}
              placeholder="Ex: 7083, 7772"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={instructor.cpf || ''}
              onChange={handleCPFChange}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rg">RG</Label>
            <Input
              id="rg"
              value={instructor.rg || ''}
              onChange={(e) => onChange({ rg: e.target.value })}
              placeholder="00.000.000-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade</Label>
            <Input
              id="specialty"
              value={instructor.specialty || ''}
              onChange={(e) => onChange({ specialty: e.target.value })}
              placeholder="Ex: Segurança do Trabalho"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={instructor.email || ''}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={instructor.phone || ''}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Valor HR Aula (R$)</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              value={instructor.hourly_rate || ''}
              onChange={(e) => onChange({ hourly_rate: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    );
  }

  if (section === 'address') {
    const address = instructor.address || {};
    
    const handleAddressChange = (field, value) => {
      onChange({
        address: { ...address, [field]: value }
      });
    };

    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input
              id="street"
              value={address.street || ''}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder="Rua, Avenida, etc"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={address.number || ''}
              onChange={(e) => handleAddressChange('number', e.target.value)}
              placeholder="123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={address.complement || ''}
              onChange={(e) => handleAddressChange('complement', e.target.value)}
              placeholder="Apto, Bloco, etc"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={address.neighborhood || ''}
              onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
              placeholder="Nome do bairro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={address.city || ''}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder="Nome da cidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              value={address.state || ''}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              placeholder="UF"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip_code">CEP</Label>
            <Input
              id="zip_code"
              value={address.zip_code || ''}
              onChange={(e) => handleAddressChange('zip_code', e.target.value)}
              placeholder="00000-000"
            />
          </div>
        </div>
      </div>
    );
  }

  if (section === 'financial') {
    const bank_data = instructor.bank_data || {};
    
    const handleBankDataChange = (field, value) => {
      onChange({
        bank_data: { ...bank_data, [field]: value }
      });
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Chaves PIX</h3>
              <Button onClick={handleAddPixKey} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Chave
              </Button>
            </div>

            <div className="space-y-3">
              {(instructor.pix_keys || []).map((pix, index) => (
                <div key={index} className="flex gap-2">
                  <Select 
                    value={pix.type} 
                    onValueChange={(value) => handlePixKeyChange(index, 'type', value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPF/CNPJ">CPF/CNPJ</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                      <SelectItem value="Celular">Celular</SelectItem>
                      <SelectItem value="Chave Aleatória">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={pix.key}
                    onChange={(e) => handlePixKeyChange(index, 'key', e.target.value)}
                    placeholder="Digite a chave PIX"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleRemovePixKey(index)} 
                    size="icon" 
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!instructor.pix_keys || instructor.pix_keys.length === 0) && (
                <p className="text-sm text-stone-500 text-center py-4">
                  Nenhuma chave PIX cadastrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-stone-900 mb-4">Dados Bancários</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Nome do Banco</Label>
                <Input
                  id="bank_name"
                  value={bank_data.bank_name || ''}
                  onChange={(e) => handleBankDataChange('bank_name', e.target.value)}
                  placeholder="Ex: Banco do Brasil, CEF"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_code">Código do Banco</Label>
                <Input
                  id="bank_code"
                  value={bank_data.bank_code || ''}
                  onChange={(e) => handleBankDataChange('bank_code', e.target.value)}
                  placeholder="Ex: 001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency">Agência (com dígito)</Label>
                <Input
                  id="agency"
                  value={bank_data.agency || ''}
                  onChange={(e) => handleBankDataChange('agency', e.target.value)}
                  placeholder="Ex: 1234-5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Conta (com dígito)</Label>
                <Input
                  id="account"
                  value={bank_data.account || ''}
                  onChange={(e) => handleBankDataChange('account', e.target.value)}
                  placeholder="Ex: 12345-6"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo da Conta</Label>
                <Select 
                  value={bank_data.account_type || ''} 
                  onValueChange={(value) => handleBankDataChange('account_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrente">Corrente</SelectItem>
                    <SelectItem value="Poupança">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}