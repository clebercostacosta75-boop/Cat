import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function ImportPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      // Upload file
      setProgress(30);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract training schedules
      setProgress(50);
      const cronogramaResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            schedules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  training_name: { type: "string" },
                  instructor_name: { type: "string" },
                  company: { type: "string" },
                  month: { type: "string" },
                  date: { type: "string" },
                  hours: { type: "number" },
                  instructor_cost: { type: "number" },
                  standard_value: { type: "number" },
                  participants: { type: "number" },
                  status: { type: "string" }
                }
              }
            }
          }
        }
      });

      setProgress(70);

      if (cronogramaResult.status === "success" && cronogramaResult.output?.schedules) {
        const schedules = cronogramaResult.output.schedules.map(schedule => ({
          ...schedule,
          cost_difference: (schedule.instructor_cost || 0) - (schedule.standard_value || 0)
        }));

        // Insert schedules
        setProgress(85);
        await base44.entities.TrainingSchedule.bulkCreate(schedules);

        setProgress(100);
        setResult({
          success: true,
          count: schedules.length,
          type: 'schedules'
        });
      } else {
        throw new Error("Não foi possível extrair dados do arquivo");
      }
    } catch (err) {
      console.error("Error importing:", err);
      setError(err.message || "Erro ao importar arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Importar Excel</h1>
          <p className="text-stone-600">Faça upload dos seus arquivos Excel para popular o sistema</p>
        </div>

        {error && (
          <Alert variant="destructive" className="border-none shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="border-none shadow-lg bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Sucesso! {result.count} registro(s) importado(s) com sucesso.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              Upload de Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-12 text-center hover:border-emerald-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 mb-1">
                      Clique para fazer upload
                    </p>
                    <p className="text-sm text-stone-600">
                      Arquivos Excel (.xlsx, .xls)
                    </p>
                  </div>
                  {!uploading && (
                    <Button type="button" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                      Selecionar Arquivo
                    </Button>
                  )}
                </div>
              </label>
            </div>

            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-sm font-medium text-stone-700">Processando arquivo...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="bg-stone-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-stone-900 mb-3">Instruções:</h3>
              <ul className="space-y-2 text-sm text-stone-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                  <span>O arquivo Excel deve conter as colunas: Treinamento, Instrutor, Empresa, Mês, Data, Horas, Custo HP, Valor Padrão</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                  <span>O sistema irá automaticamente calcular a diferença entre Custo HP e Valor Padrão</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                  <span>Certifique-se de que os dados estão formatados corretamente antes do upload</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}