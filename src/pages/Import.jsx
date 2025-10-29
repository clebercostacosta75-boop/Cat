import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, BookOpen, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";

export default function ImportPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
      setError("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    setUploading(true);
    setProgress(5);
    setError(null);
    setResult(null);

    try {
      // Upload file
      setCurrentStep("Fazendo upload do arquivo...");
      setProgress(10);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const importResults = {
        instructors: 0,
        courses: 0,
        schedules: 0
      };

      // ===== IMPORTAR INSTRUTORES =====
      setCurrentStep("Extraindo dados dos Instrutores...");
      setProgress(20);
      
      const instructorsResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            instructors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  hourly_rate: { type: "number" },
                  specialty: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (instructorsResult.status === "success" && instructorsResult.output?.instructors?.length > 0) {
        setCurrentStep("Cadastrando Instrutores...");
        setProgress(30);
        await base44.entities.Instructor.bulkCreate(instructorsResult.output.instructors);
        importResults.instructors = instructorsResult.output.instructors.length;
      }

      // ===== IMPORTAR CURSOS =====
      setCurrentStep("Extraindo dados dos Cursos...");
      setProgress(40);
      
      const coursesResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            courses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  standard_value: { type: "number" },
                  duration_hours: { type: "number" },
                  description: { type: "string" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (coursesResult.status === "success" && coursesResult.output?.courses?.length > 0) {
        setCurrentStep("Cadastrando Cursos...");
        setProgress(55);
        await base44.entities.Course.bulkCreate(coursesResult.output.courses);
        importResults.courses = coursesResult.output.courses.length;
      }

      // ===== IMPORTAR CRONOGRAMA =====
      setCurrentStep("Extraindo dados do Cronograma...");
      setProgress(65);
      
      const schedulesResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
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
                  status: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (schedulesResult.status === "success" && schedulesResult.output?.schedules?.length > 0) {
        setCurrentStep("Cadastrando Cronograma...");
        setProgress(80);
        
        const schedules = schedulesResult.output.schedules.map(schedule => ({
          ...schedule,
          cost_difference: (schedule.instructor_cost || 0) - (schedule.standard_value || 0),
          status: schedule.status || "Planejado"
        }));

        await base44.entities.TrainingSchedule.bulkCreate(schedules);
        importResults.schedules = schedules.length;
      }

      // Invalidar queries para atualizar os dados
      setCurrentStep("Finalizando importação...");
      setProgress(95);
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });

      setProgress(100);
      setCurrentStep("Concluído!");
      setResult(importResults);

    } catch (err) {
      console.error("Error importing:", err);
      setError(err.message || "Erro ao importar arquivo. Verifique se a planilha contém as abas e colunas corretas.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Importar Excel</h1>
          <p className="text-stone-600">O sistema reconhece automaticamente todas as abas da planilha e alimenta o app</p>
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
              <div className="space-y-1">
                <p className="font-semibold mb-2">Importação concluída com sucesso!</p>
                {result.instructors > 0 && <p>✓ {result.instructors} instrutor(es) importado(s)</p>}
                {result.courses > 0 && <p>✓ {result.courses} curso(s) importado(s)</p>}
                {result.schedules > 0 && <p>✓ {result.schedules} treinamento(s) agendado(s)</p>}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              Upload Automático de Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-12 text-center hover:border-emerald-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
                      Arquivos Excel (.xlsx ou .xls)
                    </p>
                  </div>
                  {!uploading && (
                    <Button type="button" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                      Selecionar Arquivo Excel
                    </Button>
                  )}
                </div>
              </label>
            </div>

            {uploading && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-sm font-medium text-stone-700">{currentStep}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-stone-500 text-center">{progress}% concluído</p>
              </div>
            )}

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                O que o sistema faz automaticamente:
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-stone-900">1. Instrutores</p>
                    <p className="text-sm text-stone-600">Detecta e cadastra todos os instrutores com valores/hora</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <BookOpen className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-stone-900">2. Cursos</p>
                    <p className="text-sm text-stone-600">Identifica cursos com valores padrão e duração</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-stone-900">3. Cronograma</p>
                    <p className="text-sm text-stone-600">Importa todos os treinamentos e calcula diferenças de custos</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2 text-sm">💡 Dica:</h4>
              <p className="text-sm text-amber-800">
                A planilha pode ter múltiplas abas com diferentes informações. O sistema detecta automaticamente 
                os dados de instrutores, cursos e cronograma, reconhecendo as colunas relevantes em cada aba.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}