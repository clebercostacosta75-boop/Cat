import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const APP_URL = window.location.origin;

export default function CredentialsModal({ isOpen, onClose, credentials }) {
  if (!credentials) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(credentials.email);
    toast.success("E-mail copiado!");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(APP_URL);
    toast.success("Link do aplicativo copiado!");
  };

  const handleCopyMessage = () => {
    const msg = `Olá ${credentials.name}! 👋\n\nSeu acesso ao *CAT Gestão de Cursos* foi criado.\n\n📧 *E-mail:* ${credentials.email}\n\nVocê receberá um e-mail com o link para definir sua senha. Após isso, acesse o sistema pelo link abaixo:\n🔗 ${APP_URL}\n\nCaso não encontre o e-mail, verifique a caixa de spam.`;
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada! Pronta para enviar via WhatsApp.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Convite Enviado com Sucesso!
          </DialogTitle>
          <DialogDescription>
            O usuário receberá um e-mail para definir sua própria senha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usuário */}
          <div>
            <label className="text-sm font-medium text-gray-700">Usuário convidado:</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">{credentials.name}</span>
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="text-sm font-medium text-gray-700">E-mail de acesso:</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-900 truncate">{credentials.email}</span>
              <Button size="sm" variant="ghost" onClick={handleCopyEmail} className="ml-2">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Link do App */}
          <div>
            <label className="text-sm font-medium text-gray-700">Link do aplicativo:</label>
            <div className="mt-1 p-3 bg-blue-50 rounded-lg border-2 border-blue-200 flex justify-between items-center">
              <span className="text-blue-800 text-sm font-medium truncate">{APP_URL}</span>
              <Button size="sm" variant="ghost" onClick={handleCopyLink} className="ml-2 text-blue-600">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Aviso */}
          <Card className="bg-green-50 border-green-200 p-3">
            <p className="text-sm text-green-800">
              ✅ <strong>Como funciona:</strong> O usuário receberá um e-mail do sistema com um link seguro para definir sua própria senha e acessar o aplicativo.
            </p>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Não recebeu o e-mail?</strong> Peça ao usuário para verificar a caixa de spam. Caso necessário, use o botão <em>"Reenviar"</em> na lista de usuários.
            </p>
          </Card>

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCopyMessage}
              className="flex-1 text-green-700 border-green-300 hover:bg-green-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar p/ WhatsApp
            </Button>
            <Button onClick={onClose} className="flex-1">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}