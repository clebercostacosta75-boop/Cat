import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertCircle } from 'lucide-react';

export default function CompanySAPConfig({ company, onChange }) {
  const [sapConfig, setSapConfig] = useState(company?.sap_config || {
    enabled: false,
    codigo_material_pai: '',
    presencial: {
      codigo_servico_filho: '',
      descricao: ''
    },
    ead: {
      codigo_servico_filho: '',
      descricao: ''
    }
  });

  const handleToggle = (enabled) => {
    const updated = { ...sapConfig, enabled };
    setSapConfig(updated);
    onChange({ ...company, sap_config: updated });
  };

  const handleCodigoMaterial = (value) => {
    const updated = { ...sapConfig, codigo_material_pai: value };
    setSapConfig(updated);
    onChange({ ...company, sap_config: updated });
  };

  const handlePresencial = (field, value) => {
    const updated = {
      ...sapConfig,
      presencial: { ...sapConfig.presencial, [field]: value }
    };
    setSapConfig(updated);
    onChange({ ...company, sap_config: updated });
  };

  const handleEAD = (field, value) => {
    const updated = {
      ...sapConfig,
      ead: { ...sapConfig.ead, [field]: value }
    };
    setSapConfig(updated);
    onChange({ ...company, sap_config: updated });
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Configuração SAP</CardTitle>
            <CardDescription>
              Ativar preenchimento automático de campos SAP no BMM
            </CardDescription>
          </div>
          <Switch 
            checked={sapConfig.enabled} 
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>

      {sapConfig.enabled && (
        <CardContent className="space-y-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Os campos abaixo serão preenchidos automaticamente no BMM baseado na modalidade do treinamento.
            </p>
          </div>

          {/* Código Material PAI - Comum */}
          <div className="space-y-2">
            <Label className="font-semibold text-stone-900">
              Código Material (PAI) SAP
            </Label>
            <p className="text-xs text-stone-600 mb-2">
              Mesmo código para todas as modalidades
            </p>
            <Input
              placeholder="Ex: 2010000491"
              value={sapConfig.codigo_material_pai || ''}
              onChange={(e) => handleCodigoMaterial(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Modalidade Presencial */}
          <div className="border-t pt-6">
            <h4 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
              Modalidade Presencial
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pres-servico" className="text-sm">
                  Código Serviço (FILHO) SAP
                </Label>
                <Input
                  id="pres-servico"
                  placeholder="Ex: 3012507"
                  value={sapConfig.presencial?.codigo_servico_filho || ''}
                  onChange={(e) => handlePresencial('codigo_servico_filho', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pres-desc" className="text-sm">
                  Descrição SAP
                </Label>
                <Input
                  id="pres-desc"
                  placeholder="Ex: Serv. Treinamento Funcionário / Serv. Treinamento PRES"
                  value={sapConfig.presencial?.descricao || ''}
                  onChange={(e) => handlePresencial('descricao', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modalidade EAD */}
          <div className="border-t pt-6">
            <h4 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Modalidade EAD / Online
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ead-servico" className="text-sm">
                  Código Serviço (FILHO) SAP
                </Label>
                <Input
                  id="ead-servico"
                  placeholder="Ex: 3012506"
                  value={sapConfig.ead?.codigo_servico_filho || ''}
                  onChange={(e) => handleEAD('codigo_servico_filho', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ead-desc" className="text-sm">
                  Descrição SAP
                </Label>
                <Input
                  id="ead-desc"
                  placeholder="Ex: Serv. Treinamento Funcionário / Serv. Treinamento EAD"
                  value={sapConfig.ead?.descricao || ''}
                  onChange={(e) => handleEAD('descricao', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}