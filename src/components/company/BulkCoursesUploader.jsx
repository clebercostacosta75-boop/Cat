import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BulkCoursesUploader({ companyId, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    const templateData = [
      ['course_id', 'course_name', 'workload_hours', 'modality', 'theoretical_hours', 'practical_hours', 'specific_price'],
      ['ID_DO_CURSO', 'Nome do Curso', '8', 'Presencial', '0', '0', '150.00'],
      ['ID_DO_CURSO', 'Nome do Curso', '8', 'Híbrido', '4', '4', '180.00'],
      ['ID_DO_CURSO', 'Nome do Curso', '16', 'Online', '0', '0', '120.00']
    ];

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Cursos</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000000; padding: 8px; }
          th { 
            background-color: #10B981; 
            color: #FFFFFF; 
            font-weight: bold; 
            text-align: center;
          }
          td { text-align: left; }
        </style>
      </head>
      <body>
        <table>
          ${templateData.map((row, idx) => `
            <tr>
              ${row.map(cell => `<${idx === 0 ? 'th' : 'td'}>${cell}</${idx === 0 ? 'th' : 'td'}>`).join('')}
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_cursos_empresa.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Modelo de planilha baixado com sucesso!');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      // Upload do arquivo
      const uploadData = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadData.file_url) {
        throw new Error('Erro ao fazer upload do arquivo');
      }

      // Processar o arquivo
      setProcessing(true);
      const processResult = await base44.functions.invoke('bulkCreateCompanyCourses', {
        file_url: uploadData.file_url,
        company_id: companyId
      });

      setResult(processResult.data);

      if (processResult.data.success) {
        toast.success(processResult.data.message);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('Erros encontrados no arquivo');
      }

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo', {
        description: error.message || 'Ocorreu um erro ao processar o arquivo'
      });
      setResult({
        success: false,
        message: error.message || 'Erro ao processar arquivo'
      });
    } finally {
      setUploading(false);
      setProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <Card className="border-2 border-dashed border-stone-300 bg-stone-50">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-stone-900">Cadastro em Massa</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar Modelo
            </Button>
          </div>

          <p className="text-sm text-stone-600">
            Baixe o modelo de planilha, preencha com os dados dos cursos e faça o upload para cadastrar múltiplos cursos de uma vez.
          </p>

          <div className="space-y-2">
            <div className="text-xs text-stone-500 space-y-1">
              <p><strong>Instruções:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>course_id:</strong> ID do curso (obtenha na página de Cursos)</li>
                <li><strong>modality:</strong> Use apenas: Presencial, Híbrido ou Online</li>
                <li><strong>theoretical_hours e practical_hours:</strong> Apenas para modalidade Híbrido</li>
                <li>Linhas 2-4 são exemplos, podem ser removidas</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex-1">
              <Input
                type="file"
                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileUpload}
                disabled={uploading || processing}
                className="cursor-pointer"
              />
            </label>
            {(uploading || processing) && (
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploading ? 'Enviando...' : 'Processando...'}
              </div>
            )}
          </div>

          {result && (
            <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <p className={result.success ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                      {result.message}
                    </p>
                    {result.success && (
                      <div className="text-xs text-green-700 mt-1">
                        <p>✓ {result.added} curso(s) adicionado(s)</p>
                        {result.skipped > 0 && (
                          <p>⚠ {result.skipped} curso(s) ignorado(s) (já existentes)</p>
                        )}
                      </div>
                    )}
                    {result.errors && result.errors.length > 0 && (
                      <div className="text-xs text-red-700 mt-2 space-y-1">
                        <p className="font-medium">Erros encontrados:</p>
                        {result.errors.slice(0, 5).map((err, idx) => (
                          <p key={idx}>• Linha {err.line}: {err.error}</p>
                        ))}
                        {result.errors.length > 5 && (
                          <p>... e mais {result.errors.length - 5} erro(s)</p>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}