import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Copy, Download, User } from "lucide-react";
import { toast } from "sonner";
import { logVenda } from "@/lib/auditVendas";

export default function QRCodeInscricaoModal({ open, onClose, presetOferta }) {
  const [tipo, setTipo] = useState("geral"); // geral | oferta | pacote
  const [ofertaId, setOfertaId] = useState("");
  const [pacoteId, setPacoteId] = useState("");
  const [comAtendente, setComAtendente] = useState(false);
  const [atendenteNome, setAtendenteNome] = useState("");
  const [atendenteId, setAtendenteId] = useState("");
  const [gerado, setGerado] = useState(false);
  const qrRef = useRef(null);

  const { data: ofertas = [] } = useQuery({ queryKey: ["course-offers"], queryFn: () => base44.entities.CourseOffer.list("-created_date", 200), enabled: open });
  const { data: pacotes = [] } = useQuery({ queryKey: ["course-packages"], queryFn: () => base44.entities.CoursePackage.list("-created_date", 200), enabled: open });

  useEffect(() => {
    if (open) {
      setTipo(presetOferta ? "oferta" : "geral");
      setOfertaId(presetOferta?.id || "");
      setPacoteId(""); setGerado(false); setComAtendente(false);
      base44.auth.me().then(u => { setAtendenteNome(u?.full_name || u?.email || ""); setAtendenteId(u?.id || ""); }).catch(() => {});
    }
  }, [open]);

  const oferta = ofertas.find(o => o.id === ofertaId);
  const pacote = pacotes.find(p => p.id === pacoteId);

  const buildUrl = () => {
    const base = `${window.location.origin}/InscricaoAluno`;
    const p = new URLSearchParams();
    if (tipo === "oferta" && ofertaId) { p.set("tipo", "oferta"); p.set("id", ofertaId); }
    if (tipo === "pacote" && pacoteId) { p.set("tipo", "pacote"); p.set("id", pacoteId); }
    if (comAtendente && atendenteNome.trim()) {
      p.set("atendente", atendenteNome.trim());
      if (atendenteId) p.set("atendente_id", atendenteId);
    }
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const url = buildUrl();
  const titulo = tipo === "oferta" ? oferta?.nome_comercial : tipo === "pacote" ? pacote?.nome : "Inscrição Geral";
  const podeGerar = tipo === "geral" || (tipo === "oferta" && ofertaId) || (tipo === "pacote" && pacoteId);

  const handleGerar = async () => {
    if (!podeGerar) { toast.error(tipo === "oferta" ? "Selecione a oferta." : "Selecione o pacote."); return; }
    setGerado(true);
    await logVenda("create", {
      entity_type: tipo === "oferta" ? "CourseOffer" : tipo === "pacote" ? "CoursePackage" : "PreCadastro",
      entity_id: ofertaId || pacoteId || "",
      entity_name: `QR Code — ${titulo}${comAtendente && atendenteNome ? ` — Atendente ${atendenteNome}` : ""}`,
      details: `FASE 2 QR Code: QR Code / link de inscrição gerado (${tipo})${comAtendente && atendenteNome ? ` vinculado ao atendente ${atendenteNome}` : ""}. Link: ${url}`,
    });
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link de inscrição copiado!");
  };

  const handleBaixar = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qrcode-inscricao-${(titulo || "geral").replace(/\W+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" /> Gerar QR Code de Inscrição</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tipo de QR Code</Label>
            <Select value={tipo} onValueChange={v => { setTipo(v); setGerado(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">🔗 Geral — operador define o curso depois</SelectItem>
                <SelectItem value="oferta">📘 Curso específico (oferta)</SelectItem>
                <SelectItem value="pacote">📦 Pacote específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "oferta" && (
            <div>
              <Label className="text-xs">Oferta de curso</Label>
              <Select value={ofertaId} onValueChange={v => { setOfertaId(v); setGerado(false); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a oferta..." /></SelectTrigger>
                <SelectContent>
                  {ofertas.map(o => <SelectItem key={o.id} value={o.id}>{o.nome_comercial}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "pacote" && (
            <div>
              <Label className="text-xs">Pacote</Label>
              <Select value={pacoteId} onValueChange={v => { setPacoteId(v); setGerado(false); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o pacote..." /></SelectTrigger>
                <SelectContent>
                  {pacotes.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={comAtendente} onChange={e => { setComAtendente(e.target.checked); setGerado(false); }} className="w-4 h-4 accent-gray-900" />
            <span className="text-sm text-gray-700 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Vincular a um atendente (inscrições contam nos indicadores)</span>
          </label>

          {comAtendente && (
            <div>
              <Label className="text-xs">Nome do atendente</Label>
              <Input value={atendenteNome} onChange={e => { setAtendenteNome(e.target.value); setGerado(false); }} placeholder="Ex: Lídia" />
            </div>
          )}

          {!gerado ? (
            <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={handleGerar} disabled={!podeGerar}>
              <QrCode className="w-4 h-4 mr-2" /> Gerar QR Code
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 border rounded-xl p-4 text-center space-y-2" ref={qrRef}>
                <p className="text-sm font-semibold text-gray-800">QR Code — {titulo}</p>
                {comAtendente && atendenteNome && <p className="text-xs text-indigo-700">Atendente: {atendenteNome}</p>}
                <div className="flex justify-center bg-white p-3 rounded-lg border w-fit mx-auto">
                  <QRCodeCanvas value={url} size={200} level="M" includeMargin />
                </div>
                <p className="text-xs text-gray-400 break-all">{url}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCopiar}><Copy className="w-4 h-4 mr-1.5" /> Copiar link</Button>
                <Button variant="outline" onClick={handleBaixar}><Download className="w-4 h-4 mr-1.5" /> Baixar PNG</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}