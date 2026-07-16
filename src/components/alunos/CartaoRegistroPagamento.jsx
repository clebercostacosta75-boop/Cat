import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/lib/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

// Registro de pagamento em cartão (maquininha, fora do Asaas).
// Nunca armazena número completo do cartão nem CVV — somente últimos 4 dígitos.
// A foto do comprovante é evidência; a confirmação é exclusiva do Financeiro.
export default function CartaoRegistroPagamento({ enrollment, lancamento, onRefresh }) {
  const { profile } = usePermissions();
  const saldo = Math.max(0, (lancamento?.valor || 0) - (lancamento?.valor_pago || 0));
  const [form, setForm] = useState({
    modalidade_cartao: "Crédito", adquirente: "", bandeira: "", valor: saldo || lancamento?.valor || "",
    parcelas: 1, nsu: "", codigo_autorizacao: "", ultimos_digitos: "", comprovante_url: "",
    data_hora: new Date().toISOString().slice(0, 16),
  });
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadFoto = async (file) => {
    if (!file) return;
    setEnviando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("comprovante_url", file_url);
      toast.success("Foto do comprovante enviada.");
    } catch {
      toast.error("Falha ao enviar foto.");
    }
    setEnviando(false);
  };

  const registrar = async () => {
    if (!form.nsu) return toast.error("Informe o NSU do comprovante.");
    if (!form.valor || parseFloat(form.valor) <= 0) return toast.error("Informe o valor.");
    if (form.ultimos_digitos && form.ultimos_digitos.length !== 4) return toast.error("Informe exatamente os 4 últimos dígitos.");
    setSalvando(true);
    try {
      // Bloqueio de NSU duplicado
      const duplicados = await base44.entities.PagamentoConciliacao.filter({ tipo: "Cartão", nsu: form.nsu.trim() });
      if (duplicados.length > 0) {
        toast.error(`NSU ${form.nsu} já registrado (${duplicados[0].student_name || "outro pagamento"}) — duplicidade bloqueada.`);
        setSalvando(false);
        return;
      }
      await base44.entities.PagamentoConciliacao.create({
        tipo: "Cartão",
        enrollment_id: enrollment.id,
        lancamento_id: lancamento?.id || "",
        student_id: enrollment.student_id,
        student_name: enrollment.student_name,
        course_name: enrollment.course_name,
        valor: parseFloat(form.valor),
        data_hora: new Date(form.data_hora).toISOString(),
        modalidade_cartao: form.modalidade_cartao,
        adquirente: form.adquirente,
        bandeira: form.bandeira,
        parcelas: Number(form.parcelas) || 1,
        nsu: form.nsu.trim(),
        codigo_autorizacao: form.codigo_autorizacao,
        ultimos_digitos: form.ultimos_digitos,
        comprovante_url: form.comprovante_url,
        status: "Aguardando validação financeira",
        registrado_por: profile?.user_email || "",
      });
      setSalvo(true);
      toast.success("Pagamento em cartão registrado — aguardando validação do Financeiro.");
      onRefresh?.();
    } catch (e) {
      toast.error("Erro ao registrar: " + (e?.response?.data?.detail || e.message));
    }
    setSalvando(false);
  };

  if (salvo) {
    return (
      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2">
        ✅ Registro enviado — <strong>Aguardando validação financeira</strong> na Central de Conciliação.
      </p>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-[11px]">Modalidade</Label>
          <Select value={form.modalidade_cartao} onValueChange={v => set("modalidade_cartao", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Crédito">Crédito</SelectItem>
              <SelectItem value="Débito">Débito</SelectItem>
            </SelectContent>
          </Select></div>
        <div className="space-y-1"><Label className="text-[11px]">Adquirente (maquininha)</Label>
          <Input className="h-8 text-xs" value={form.adquirente} onChange={e => set("adquirente", e.target.value)} placeholder="Stone, Cielo..." /></div>
        <div className="space-y-1"><Label className="text-[11px]">Bandeira</Label>
          <Input className="h-8 text-xs" value={form.bandeira} onChange={e => set("bandeira", e.target.value)} placeholder="Visa, Master..." /></div>
        <div className="space-y-1"><Label className="text-[11px]">Valor (R$)</Label>
          <Input className="h-8 text-xs" type="number" step="0.01" value={form.valor} onChange={e => set("valor", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-[11px]">Parcelas</Label>
          <Input className="h-8 text-xs" type="number" min="1" value={form.parcelas} onChange={e => set("parcelas", e.target.value)} disabled={form.modalidade_cartao === "Débito"} /></div>
        <div className="space-y-1"><Label className="text-[11px]">Data/Hora</Label>
          <Input className="h-8 text-xs" type="datetime-local" value={form.data_hora} onChange={e => set("data_hora", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-[11px]">NSU *</Label>
          <Input className="h-8 text-xs" value={form.nsu} onChange={e => set("nsu", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-[11px]">Código de autorização</Label>
          <Input className="h-8 text-xs" value={form.codigo_autorizacao} onChange={e => set("codigo_autorizacao", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-[11px]">Últimos 4 dígitos</Label>
          <Input className="h-8 text-xs" maxLength={4} value={form.ultimos_digitos} onChange={e => set("ultimos_digitos", e.target.value.replace(/\D/g, ""))} /></div>
        <div className="space-y-1"><Label className="text-[11px]">Foto do comprovante (evidência)</Label>
          <label className="flex items-center gap-1.5 border rounded-md px-2 h-8 cursor-pointer hover:bg-gray-50">
            {enviando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            <span className="truncate">{form.comprovante_url ? "Foto anexada ✓" : "Enviar foto"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => uploadFoto(e.target.files?.[0])} disabled={enviando} />
          </label></div>
      </div>
      <p className="text-[10px] text-gray-400 italic">
        Não é permitido registrar número completo do cartão ou CVV. A foto é evidência, não confirmação — o Financeiro confirma ou rejeita na Central de Conciliação.
      </p>
      <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={registrar} disabled={salvando}>
        {salvando ? "Registrando..." : "Registrar pagamento em cartão"}
      </Button>
    </div>
  );
}