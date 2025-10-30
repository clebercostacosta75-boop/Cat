import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Download, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProfessionalProfile({ instructor, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState(instructor.professional_profile || '');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('gerarPerfilProfissional', {
        instructor_id: instructor.id
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setProfile(response.data.profile);
      onUpdate(response.data.profile);
    } catch (err) {
      setError(err.message || 'Erro ao gerar perfil. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    onUpdate(profile);
    alert('Perfil salvo com sucesso!');
  };

  const handleDownload = () => {
    const blob = new Blob([profile], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `perfil_${instructor.name.replace(/\s+/g, '_')}.txt`;
    link.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(profile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Card className="border-none bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">
                  Perfil Profissional com IA
                </h3>
                <p className="text-sm text-stone-600">
                  A IA analisa as qualificações, experiências e documentos para gerar 
                  automaticamente um perfil profissional completo e personalizado.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ERRO */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* BOTÃO GERAR */}
      {!profile && (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500" />
            <h3 className="text-xl font-semibold text-stone-900 mb-2">
              Ainda não há perfil profissional
            </h3>
            <p className="text-stone-600 mb-6">
              Clique no botão abaixo para a IA gerar automaticamente um perfil 
              profissional completo baseado nas informações cadastradas.
            </p>
            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando Perfil...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Perfil com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* EDITOR DE PERFIL */}
      {profile && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-900">
                Perfil Profissional Editável
              </h3>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={generating}
                  variant="outline"
                  size="sm"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Regerar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Textarea
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              rows={15}
              className="font-sans text-sm"
              placeholder="O perfil profissional será gerado aqui..."
            />

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                Salvar Alterações
              </Button>
              
              <Button onClick={handleCopy} variant="outline">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>

              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Baixar
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                💡 <strong>Dica:</strong> O texto acima é totalmente editável. 
                Você pode corrigir, adicionar ou remover informações conforme necessário. 
                Clique em "Salvar Alterações" para manter as modificações.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* INFORMAÇÕES */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h4 className="font-semibold text-stone-900 mb-2">ℹ️ Como funciona:</h4>
          <ul className="space-y-1 text-sm text-stone-600">
            <li>✅ A IA analisa todas as formações cadastradas</li>
            <li>✅ Considera os documentos enviados</li>
            <li>✅ Avalia a experiência e especialidade</li>
            <li>✅ Gera um texto profissional e descritivo</li>
            <li>✅ Você pode editar manualmente o resultado</li>
            <li>✅ Exportável em formato texto (.txt)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}