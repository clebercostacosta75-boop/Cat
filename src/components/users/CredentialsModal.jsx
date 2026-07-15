import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const APP_URL = window.location.origin;

export default function CredentialsModal({ isOpen, onClose, credentials }) {
  if (!credentials) return null;

  const activationUrl = credentials.activationUrl || APP_URL;
  const handleCopyAll = () => {
    const msg = `Olá ${credentials.name}!\n\nSeu acesso ao Portal CAT Cursos foi criado.\n\nE-mail: ${credentials.email}\nLink de ativação: ${activationUrl}\n\nClique no link e crie sua senha para ativar a conta.`;
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada! Pronta para enviar via WhatsApp.");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activationUrl);
    toast.success("Link copiado!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Convite de ativação criado
          </DialogTitle>
          <DialogDescription>
            O e-mail contém o link para o usuário criar a senha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Usuário</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">{credentials.name}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-mail (login)</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-900 truncate">{credentials.email}</span>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success("Copiado!"); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {credentials.password && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Senha inicial</label>
              <div className="mt-1 p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200 flex justify-between items-center">
                <span className="font-mono font-bold text-yellow-900">{credentials.password}</span>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success("Senha copiada!"); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Link de ativação</label>
            <div className="mt-1 p-3 bg-blue-50 rounded-lg border-2 border-blue-200 flex justify-between items-center">
              <span className="text-blue-800 text-sm font-medium truncate">{activationUrl}</span>
              <Button size="sm" variant="ghost" onClick={handleCopyLink} className="text-blue-600">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Card className="bg-amber-50 border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              O usuário deve abrir o link acima e <strong>criar a própria senha</strong> para ativar a conta.
            </p>
          </Card>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={handleCopyAll} className="flex-1 text-green-700 border-green-300 hover:bg-green-50">
              <Copy className="w-4 h-4 mr-2" />
              Copiar p/ WhatsApp
            </Button>
            <Button onClick={onClose} className="flex-1">Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}