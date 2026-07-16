import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/lib/PermissionsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { logAction } from "@/components/audit/AuditLogger";

const VAZIO = { favorecido: "", cpf_cnpj: "", banco: "", tipo_chave: "CPF/CNPJ", chave: "", qr_code_url: "", observacao: "" };

export default function PixConfigForm({ config, onClose, onSaved }) {
  const { profile } = usePermissions();
  const [form, setForm] = useState(config ? { ...VAZIO, ...config } : VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [enviandoQR, setEnviandoQR] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadQR = async (file) => {
    if (!file) return;
    setEnviandoQR(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("qr_code_url", file_url);
      toast.success("QR Code enviado.");
    } catch {
      toast.error("Falha ao enviar QR Code.");
    }
    setEnviandoQR(false);
  };

  const salvar = async () => {
    if (!form.favorecido || !form.chave) return toast.error("Informe o favorecido e a chave Pix.");
    setSalvando(true);
    try {
      const dados = {
        favorecido: form.favorecido, cpf_cnpj: form.cpf_cnpj, banco: form.banco,
        tipo_chave: form.tipo_chave, chave: form.chave, qr_code_url: form.qr_code_url,
        observacao: form.observacao, atualizado_por: profile?.user_email || "",
      };
      if (config?.id) {
        await base44.entities.PixConfiguracao.update(config.id, dados);
        logAction("update", "PixConfiguracao", config.id, form.favorecido, { descricao: `Configuração Pix "${form.favorecido}" atualizada` });
      } else {
        const criado = await base44.entities.PixConfiguracao.create({ ...dados, ativo: false });
        logAction("create", "PixConfiguracao", criado.id, form.favorecido, { descricao: `Configuração Pix "${form.favorecido}" criada` });
      }
      toast.success("Configuração Pix salva.");
      onSaved();
    } catch (e) {
      toast.error("Erro ao salvar: " + (e?.response?.data?.detail || e.message));
    }
    setSalvando(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-base">{config ? "Editar Chave Pix" : "Nova Chave Pix"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Favorecido *</Label>
            <Input value={form.favorecido} onChange={e => set("favorecido", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">CPF/CNPJ</Label>
              <Input value={form.cpf_cnpj} onChange={e => set("cpf_cnpj", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Banco</Label>
              <Input value={form.banco} onChange={e => set("banco", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Tipo da Chave</Label>
              <Select value={form.tipo_chave} onValueChange={v => set("tipo_chave", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CPF/CNPJ", "E-mail", "Celular", "Chave Aleatória"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs">Chave Pix *</Label>
              <Input value={form.chave} onChange={e => set("chave", e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">QR Code (imagem)</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50">
                {enviandoQR ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Enviar imagem
                <input type="file" accept="image/*" className="hidden" onChange={e => uploadQR(e.target.files?.[0])} />
              </label>
              {form.qr_code_url && <img src={form.qr_code_url} alt="QR" className="w-14 h-14 object-contain border rounded" />}
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.observacao} onChange={e => set("observacao", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}