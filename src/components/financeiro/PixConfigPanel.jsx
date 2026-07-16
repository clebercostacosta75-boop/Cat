import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/lib/PermissionsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { QrCode, Plus } from "lucide-react";
import { toast } from "sonner";
import { logAction } from "@/components/audit/AuditLogger";
import PixConfigForm from "./PixConfigForm";

const PODE_GERIR = ["admin", "gestor_master", "financeiro"];

// Configuração Pix (fora do Asaas) — administrada somente pelo Financeiro
export default function PixConfigPanel() {
  const { role, profile } = usePermissions();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(null); // null | {} | config
  const podeGerir = PODE_GERIR.includes(role);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["pix-configuracoes"],
    queryFn: () => base44.entities.PixConfiguracao.list("-updated_date", 50),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pix-configuracoes"] });
    queryClient.invalidateQueries({ queryKey: ["pix-config-ativa"] });
  };

  const toggleAtivo = async (cfg, ativo) => {
    if (!podeGerir) return;
    if (ativo) {
      // Apenas uma chave ativa por vez
      for (const outra of configs.filter(c => c.ativo && c.id !== cfg.id)) {
        await base44.entities.PixConfiguracao.update(outra.id, { ativo: false, atualizado_por: profile?.user_email || "" });
      }
    }
    await base44.entities.PixConfiguracao.update(cfg.id, { ativo, atualizado_por: profile?.user_email || "" });
    logAction("update", "PixConfiguracao", cfg.id, cfg.favorecido, {
      descricao: `Chave Pix "${cfg.chave}" ${ativo ? "ativada" : "desativada"}`,
    });
    toast.success(ativo ? "Chave Pix ativada." : "Chave Pix desativada.");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-600" /> Configuração Pix (fora do Asaas)
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">Homologação</Badge>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Administrada somente pelo Financeiro. A chave ativa é exibida nas matrículas individuais para pagamento —
            a recepção não altera a chave nem confirma pagamentos. Todas as alterações ficam registradas na auditoria.
          </p>
        </div>
        {podeGerir && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setEditando({})}>
            <Plus className="w-4 h-4 mr-1" /> Nova Chave Pix
          </Button>
        )}
      </div>

      {!podeGerir && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Visualização somente leitura — apenas o Financeiro pode cadastrar, alterar ou ativar chaves Pix.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : configs.length === 0 ? (
        <p className="text-sm text-gray-400 border rounded-lg p-6 text-center">
          Nenhuma chave Pix cadastrada — pendente de configuração pelo Financeiro.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {configs.map((cfg) => (
            <Card key={cfg.id} className={cfg.ativo ? "border-emerald-300 bg-emerald-50/40" : ""}>
              <CardContent className="p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900">{cfg.favorecido}</p>
                  <div className="flex items-center gap-2">
                    {cfg.ativo && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Ativa</Badge>}
                    {podeGerir && <Switch checked={!!cfg.ativo} onCheckedChange={(v) => toggleAtivo(cfg, v)} />}
                  </div>
                </div>
                <p><span className="text-gray-500">CPF/CNPJ:</span> {cfg.cpf_cnpj || "—"} · <span className="text-gray-500">Banco:</span> {cfg.banco || "—"}</p>
                <p><span className="text-gray-500">Chave ({cfg.tipo_chave}):</span> <strong className="break-all">{cfg.chave}</strong></p>
                {cfg.qr_code_url && <img src={cfg.qr_code_url} alt="QR Code Pix" className="w-24 h-24 object-contain border rounded bg-white" />}
                {cfg.atualizado_por && <p className="text-[10px] text-gray-400">Última alteração: {cfg.atualizado_por}</p>}
                {podeGerir && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditando(cfg)}>Editar</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editando !== null && (
        <PixConfigForm
          config={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); refresh(); }}
        />
      )}
    </div>
  );
}