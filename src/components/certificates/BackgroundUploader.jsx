import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { toast } from "sonner";

export default function BackgroundUploader({ value, onChange, label }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (JPG, PNG, etc.)");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success("Imagem de fundo carregada!");
    } catch (err) {
      toast.error("Erro ao fazer upload: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
      
      {value ? (
        <div className="relative border rounded-lg overflow-hidden">
          <img
            src={value}
            alt="Fundo do certificado"
            className="w-full h-32 object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="bg-white h-7 px-2 text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3 h-3 mr-1" /> Trocar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white h-7 px-2 text-red-500 border-red-200"
              onClick={handleRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Enviando...</span>
            </div>
          ) : (
            <>
              <Image className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Clique para fazer upload</p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP</p>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}