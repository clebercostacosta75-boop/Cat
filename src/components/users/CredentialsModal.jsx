import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export default function CredentialsModal({ isOpen, onClose, credentials }) {
  if (!credentials) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const handleCopyAll = () => {
    const text = `Login: ${credentials.email}\nSenha: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    toast.success("Credenciais copiadas!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Credenciais Geradas com Sucesso
          </DialogTitle>
          <DialogDescription>
            Compartilhe essas credenciais com o usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usuário */}
          <div>
            <label className="text-sm font-medium text-gray-700">Nome do usuário:</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-900">{credentials.name}</span>
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="text-sm font-medium text-gray-700">E-mail de acesso:</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-900 truncate">{credentials.email}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(credentials.email)}
                className="ml-2"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="text-sm font-medium text-gray-700">Senha temporária:</label>
            <div className="mt-1 p-3 bg-blue-50 rounded-lg border-2 border-blue-300 flex justify-between items-center">
              <span className="font-bold text-blue-900 text-lg tracking-widest">{credentials.password}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(credentials.password)}
                className="ml-2 text-blue-600"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Aviso */}
          <Card className="bg-yellow-50 border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Importante:</strong> Esta é uma senha temporária. O usuário deve alterá-la no primeiro acesso.
            </p>
          </Card>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCopyAll}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Tudo
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Fechar
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            💌 Um e-mail também foi enviado para {credentials.email}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}