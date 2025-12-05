import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LogoUploader({ logoUrl, onLogoChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.');
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      onLogoChange(result.file_url);
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange('');
    toast.success('Logo removido.');
  };

  return (
    <div className="space-y-3">
      <Label>Logo da Empresa</Label>
      
      {logoUrl ? (
        <div className="relative w-40 h-40 border-2 border-dashed border-emerald-300 rounded-lg overflow-hidden bg-white">
          <img 
            src={logoUrl} 
            alt="Logo da empresa" 
            className="w-full h-full object-contain p-2"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleRemoveLogo}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          ) : (
            <>
              <Image className="w-10 h-10 text-stone-400 mb-2" />
              <span className="text-xs text-stone-500 text-center px-2">
                Clique para enviar logo
              </span>
              <span className="text-xs text-stone-400 mt-1">
                PNG, JPG (máx 2MB)
              </span>
            </>
          )}
        </label>
      )}
    </div>
  );
}