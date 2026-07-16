import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award } from "lucide-react";
import CertificateEmissaoIndividual from "./CertificateEmissaoIndividual";

/**
 * Diálogo de emissão individual sensível ao contexto:
 * - origemFixa="individual": oculta o campo Cliente (fixado como Individual PF)
 * - origemFixa="empresa": mantém a busca de empresa normalmente
 */
export default function EmitirCertificadoDialog({ open, onClose, origemFixa, onSuccess }) {
  if (!open) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" /> Emitir Certificado Individual
          </DialogTitle>
          <p className="text-sm text-gray-500">Preencha os dados para gerar um novo certificado</p>
        </DialogHeader>
        <CertificateEmissaoIndividual origemFixa={origemFixa} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}