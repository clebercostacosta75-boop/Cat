import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CompanyContractsForm({ companyContracts, onChange }) {
  const handleAddContract = () => {
    onChange([
      ...companyContracts,
      {
        contract_number: "",
        amendment_number: "",
        start_date: "",
        end_date: "",
        description: "",
        status: "Ativo"
      }
    ]);
  };

  const handleRemoveContract = (index) => {
    onChange(companyContracts.filter((_, i) => i !== index));
  };

  const handleContractChange = (index, field, value) => {
    const updated = [...companyContracts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const getDaysUntilExpiration = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (endDate) => {
    const days = getDaysUntilExpiration(endDate);
    if (days === null) return null;
    
    if (days < 0) return { label: "Vencido", color: "bg-red-100 text-red-800 border-red-300" };
    if (days <= 30) return { label: `Vence em ${days} dias`, color: "bg-orange-100 text-orange-800 border-orange-300" };
    return { label: `Válido por ${days} dias`, color: "bg-green-100 text-green-800 border-green-300" };
  };

  return (
    <div className="space-y-4">
      {companyContracts.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-stone-300" />
          <p>Nenhum contrato cadastrado para esta empresa</p>
          <p className="text-sm">Clique em "Adicionar Contrato" para começar</p>
        </div>
      ) : (
        companyContracts.map((contract, index) => {
          const expirationStatus = getExpirationStatus(contract.end_date);
          const daysUntilExpiration = getDaysUntilExpiration(contract.end_date);
          
          return (
            <Card key={index} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-stone-900">Contrato {index + 1}</h4>
                    {expirationStatus && (
                      <Badge variant="outline" className={expirationStatus.color}>
                        {daysUntilExpiration !== null && daysUntilExpiration <= 30 && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {expirationStatus.label}
                      </Badge>
                    )}
                  </div>
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
                      placeholder="Ex: CT-2024-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número do Aditivo</Label>
                    <Input
                      value={contract.amendment_number || ""}
                      onChange={(e) => handleContractChange(index, 'amendment_number', e.target.value)}
                      placeholder="Ex: AD-001 (se houver)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Início *</Label>
                    <Input
                      type="date"
                      value={contract.start_date}
                      onChange={(e) => handleContractChange(index, 'start_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Término *</Label>
                    <Input
                      type="date"
                      value={contract.end_date}
                      onChange={(e) => handleContractChange(index, 'end_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={contract.status} 
                      onValueChange={(value) => handleContractChange(index, 'status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">✅ Ativo</SelectItem>
                        <SelectItem value="Vencido">⏰ Vencido</SelectItem>
                        <SelectItem value="Cancelado">❌ Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição do Contrato</Label>
                    <Textarea
                      value={contract.description}
                      onChange={(e) => handleContractChange(index, 'description', e.target.value)}
                      placeholder="Descrição detalhada do contrato..."
                      rows={2}
                    />
                  </div>
                </div>
                {daysUntilExpiration !== null && daysUntilExpiration <= 30 && daysUntilExpiration > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-xs text-orange-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <strong>Atenção:</strong> Este contrato vencerá em breve. Sistema notificará automaticamente.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
      <Button type="button" onClick={handleAddContract} size="sm" variant="outline" className="w-full">
        <Plus className="w-4 h-4 mr-1" />
        Adicionar Contrato
      </Button>
    </div>
  );
}