import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Download, Loader2 } from "lucide-react";

export default function DocumentsManager({ documents, onChange, instructorId }) {
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', type: '', url: '' });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!newDoc.name) {
      alert('Digite o nome do documento primeiro');
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      const document = {
        name: newDoc.name,
        type: newDoc.type || 'Outro',
        url: result.file_url,
        uploaded_at: new Date().toISOString()
      };

      onChange([...documents, document]);
      setNewDoc({ name: '', type: '', url: '' });
      e.target.value = null;
    } catch (error) {
      alert('Erro ao fazer upload do documento');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gestor de Documentos
          </h3>
        </div>

        <Card className="mb-4 bg-stone-50">
          <CardContent className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Documento *</Label>
                <Input
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                  placeholder="Ex: Diploma de Graduação"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  value={newDoc.type}
                  onChange={(e) => setNewDoc({...newDoc, type: e.target.value})}
                  placeholder="Ex: Diploma, Certificado, RG, CNH"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Arquivo</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading || !newDoc.name}
                  className="hidden"
                  id="doc-upload"
                />
                <label htmlFor="doc-upload" className="flex-1">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    disabled={uploading || !newDoc.name}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Selecionar Arquivo
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-stone-500">
                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {documents.map((doc, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-stone-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        {doc.type && <span>{doc.type}</span>}
                        {doc.uploaded_at && (
                          <>
                            <span>•</span>
                            <span>{formatDate(doc.uploaded_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => window.open(doc.url, '_blank')}
                      size="icon"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRemove(index)}
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {documents.length === 0 && (
            <div className="text-center py-12 text-stone-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p>Nenhum documento cadastrado</p>
              <p className="text-sm mt-1">Faça o upload dos documentos do instrutor</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}