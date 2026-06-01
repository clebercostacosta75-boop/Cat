import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

/**
 * BMMEditor – painel de edição rápida dos campos do BMM antes de exportar/enviar.
 * Recebe `content` e `onChange(updatedContent)`.
 */
export default function BMMEditor({ content, onChange }) {
  if (!content) return null;

  const update = (path, value) => {
    // path: "company.fiscal_name" ou "overrides.title"
    const keys = path.split(".");
    const updated = JSON.parse(JSON.stringify(content)); // deep clone
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onChange(updated);
  };

  const o = content.overrides || {};
  const c = content.company || {};
  const contract = c.company_contracts?.find(ct => ct.status === 'Ativo') || {};

  return (
    <Card className="border border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-blue-800">
          <Pencil className="w-4 h-4" />
          Editar campos do BMM
        </CardTitle>
        <p className="text-xs text-blue-600">Personalize os campos antes de exportar ou enviar.</p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Cabeçalho */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Cabeçalho</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Título do documento</Label>
              <Input
                value={o.title ?? "BOLETIM MENSAL DE MEDIÇÃO - BMM"}
                onChange={e => update("overrides.title", e.target.value)}
                placeholder="Ex: BOLETIM MENSAL DE MEDIÇÃO - BMM"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número do Contrato</Label>
              <Input
                value={o.contract_number ?? contract.contract_number ?? ""}
                onChange={e => update("overrides.contract_number", e.target.value)}
                placeholder="Ex: 001/2025"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número do Aditivo</Label>
              <Input
                value={o.amendment_number ?? contract.amendment_number ?? ""}
                onChange={e => update("overrides.amendment_number", e.target.value)}
                placeholder="Ex: 001/2026"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Objeto do Contrato</Label>
              <Input
                value={o.contract_object ?? c.billing_info?.contract_object ?? ""}
                onChange={e => update("overrides.contract_object", e.target.value)}
                placeholder="Ex: Prestação de serviços de treinamento"
              />
            </div>
          </div>
        </div>

        {/* Assinaturas */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Assinaturas</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome – Fiscalização</Label>
              <Input
                value={o.fiscal_name ?? c.fiscal_name ?? ""}
                onChange={e => update("overrides.fiscal_name", e.target.value)}
                placeholder="Nome do fiscal"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cargo – Fiscalização</Label>
              <Input
                value={o.fiscal_role ?? c.fiscal_role ?? ""}
                onChange={e => update("overrides.fiscal_role", e.target.value)}
                placeholder="Ex: Técnico de Segurança"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome – Gestor do Contrato</Label>
              <Input
                value={o.contract_manager_name ?? c.contract_manager_name ?? ""}
                onChange={e => update("overrides.contract_manager_name", e.target.value)}
                placeholder="Nome do gestor"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cargo – Gestor do Contrato</Label>
              <Input
                value={o.contract_manager_role ?? c.contract_manager_role ?? ""}
                onChange={e => update("overrides.contract_manager_role", e.target.value)}
                placeholder="Ex: Coordenador de SST"
              />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Observações / Notas</p>
          <Textarea
            value={o.notes ?? ""}
            onChange={e => update("overrides.notes", e.target.value)}
            placeholder="Observações que aparecerão no rodapé do BMM (opcional)"
            rows={3}
          />
        </div>

      </CardContent>
    </Card>
  );
}