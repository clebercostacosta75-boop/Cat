import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Upload, Image, Video, FileText, X, CheckCircle, XCircle, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function EnvioMassaWhatsApp() {
  const [texto, setTexto] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState(""); // "image" | "video"
  const [uploading, setUploading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Selecione apenas imagens ou vídeos.");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMediaUrl(file_url);
      setMediaType(isImage ? "image" : "video");
      toast.success("Arquivo enviado com sucesso!");
    } catch (e) {
      toast.error("Erro ao fazer upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = () => {
    setMediaUrl("");
    setMediaType("");
  };

  const handleEnviar = async () => {
    if (!texto && !mediaUrl) {
      toast.error("Adicione um texto ou uma mídia para enviar.");
      return;
    }

    if (!confirm(`Confirma o envio para TODOS os leads cadastrados?\n\nEsta ação não pode ser desfeita.`)) return;

    setEnviando(true);
    setResultado(null);
    try {
      const res = await base44.functions.invoke("enviarMensagemMassaWhatsApp", {
        texto,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      });
      setResultado(res.data);
      toast.success(`Envio concluído! ${res.data.sucesso} enviados, ${res.data.falha} falhas.`);
    } catch (e) {
      toast.error("Erro no envio: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aviso */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
        <MessageSquare className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Envio em Massa via WhatsApp Business</p>
          <p className="text-xs text-green-700 mt-1">
            A mensagem será enviada para <strong>todos os leads com número de WhatsApp cadastrado</strong> no sistema.
            Certifique-se de que os leads optaram por receber comunicações.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Criar Mensagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Texto */}
            <div className="space-y-1">
              <Label>Texto da Mensagem</Label>
              <Textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Digite aqui o texto que será enviado para todos os leads..."
                rows={6}
                maxLength={4096}
              />
              <p className="text-xs text-gray-400 text-right">{texto.length}/4096</p>
            </div>

            {/* Upload de mídia */}
            <div className="space-y-2">
              <Label>Imagem ou Vídeo (opcional)</Label>
              {!mediaUrl ? (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 text-gray-500">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span className="text-sm">Clique para selecionar imagem ou vídeo</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4, etc.</p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              ) : (
                <div className="relative border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-3">
                    {mediaType === "image" ? (
                      <Image className="w-8 h-8 text-blue-500" />
                    ) : (
                      <Video className="w-8 h-8 text-purple-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {mediaType === "image" ? "Imagem" : "Vídeo"} carregado
                      </p>
                      <p className="text-xs text-gray-500 truncate">{mediaUrl}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleRemoveMedia} className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {mediaType === "image" && (
                    <img src={mediaUrl} alt="preview" className="mt-2 rounded max-h-32 object-contain w-full" />
                  )}
                </div>
              )}
            </div>

            {/* Botão enviar */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 gap-2"
              onClick={handleEnviar}
              disabled={enviando || uploading || (!texto && !mediaUrl)}
            >
              {enviando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Enviar para Todos os Leads</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview / Resultado */}
        <div className="space-y-4">
          {/* Preview */}
          {(texto || mediaUrl) && !resultado && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview da Mensagem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-xl p-4 max-w-xs">
                  <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
                    {mediaUrl && mediaType === "image" && (
                      <img src={mediaUrl} alt="preview" className="rounded max-h-40 object-contain w-full" />
                    )}
                    {mediaUrl && mediaType === "video" && (
                      <div className="bg-gray-200 rounded flex items-center justify-center h-24">
                        <Video className="w-8 h-8 text-gray-500" />
                        <span className="text-xs text-gray-500 ml-2">Vídeo</span>
                      </div>
                    )}
                    {texto && <p className="text-sm text-gray-800 whitespace-pre-wrap">{texto}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado */}
          {resultado && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Resultado do Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-800">{resultado.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-700">{resultado.sucesso}</p>
                    <p className="text-xs text-green-600">Enviados</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-red-700">{resultado.falha}</p>
                    <p className="text-xs text-red-600">Falhas</p>
                  </div>
                </div>

                {/* Lista de resultados */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {resultado.resultados?.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-700 truncate flex-1">{r.nome}</span>
                      <div className="flex items-center gap-1 ml-2">
                        {r.status === "enviado" ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">Enviado</Badge>
                        ) : r.status === "pulado" ? (
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs">Sem tel</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-xs">Erro</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={() => { setResultado(null); setTexto(""); setMediaUrl(""); setMediaType(""); }}>
                  Nova Mensagem
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}