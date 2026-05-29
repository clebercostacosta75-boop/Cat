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
  const [isDragging, setIsDragging] = useState(false);

  const downloadTemplate = () => {
    const templateData = [
      ['course_id', 'course_name', 'workload_hours', 'modality', 'theoretical_hours', 'practical_hours', 'billing_type', 'specific_price', 'class_fixed_value', 'included_students_limit', 'extra_student_unit_value'],
      ['ID_CURSO', 'Nome do Curso', '8', 'Presencial', '', '', 'per_student', '150.00', '', '', ''],
      ['ID_CURSO', 'Nome do Curso', '8', 'Híbrido', '4', '4', 'per_student', '180.00', '', '', ''],
      ['ID_CURSO', 'Nome do Curso', '16', 'Online', '', '', 'per_closed_class', '', '2000.00', '15', '133.33']
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const processFile = async (file) => {
    if (!file) return;

    console.log('=== UPLOAD INICIADO ===');
    console.log('Arquivo selecionado:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);

    setUploading(true);
    setResult(null);

    try {
      // Validar tipo de arquivo
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const validExtensions = ['xls', 'xlsx', 'csv'];
      
      if (!validExtensions.includes(fileExtension) && !validTypes.includes(file.type)) {
        throw new Error('Formato de arquivo inválido. Use arquivos .xls, .xlsx ou .csv');
      }

      console.log('Validação do arquivo OK');

      // Upload do arquivo
      console.log('Iniciando upload do arquivo...');
      const uploadData = await base44.integrations.Core.UploadFile({ file });
      console.log('Upload concluído:', uploadData);
      
      if (!uploadData.file_url) {
        throw new Error('Erro ao fazer upload do arquivo - URL não retornada');
      }

      console.log('file_url recebido:', uploadData.file_url);

      // Processar o arquivo
      setUploading(false);
      setProcessing(true);
      console.log('Chamando função backend com:', { file_url: uploadData.file_url, company_id: companyId });
      
      const processResult = await base44.functions.invoke('bulkCreateCompanyCourses', {
        file_url: uploadData.file_url,
        company_id: companyId
      });

      console.log('Resultado da função:', processResult);

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
      console.error('=== ERRO NO UPLOAD/PROCESSAMENTO ===');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      const errorMessage = error.response?.data?.error || error.message || 'Ocorreu um erro ao processar o arquivo';
      const errorDetails = error.response?.data?.details || error.response?.data?.hint || '';
      
      toast.error('Erro ao processar arquivo', {
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage
      });
      
      setResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
        fullError: error.response?.data
      });
    } finally {
      setUploading(false);
      setProcessing(false);
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
              <p><strong>Instruções de Preenchimento:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>course_id:</strong> ID do curso (obtenha na página de Cursos)</li>
                <li><strong>course_name:</strong> Nome do curso (referência)</li>
                <li><strong>workload_hours:</strong> Carga horária total</li>
                <li><strong>modality:</strong> Presencial, Híbrido ou Online</li>
                <li><strong>theoretical_hours/practical_hours:</strong> Apenas para modalidade Híbrido</li>
                <li><strong>billing_type:</strong> per_student (unitário) ou per_closed_class (turma fechada)</li>
              </ul>
              <p className="mt-2"><strong>Cobrança por Aluno (billing_type = per_student):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Preencha apenas: specific_price (valor unitário)</li>
                <li>Deixe em branco: class_fixed_value, included_students_limit, extra_student_unit_value</li>
              </ul>
              <p className="mt-2"><strong>Turma Fechada (billing_type = per_closed_class):</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>class_fixed_value: Valor fixo da turma</li>
                <li>included_students_limit: Quantidade máxima de alunos inclusos (padrão: 15)</li>
                <li>extra_student_unit_value: Valor por aluno acima do limite</li>
                <li>Deixe em branco: specific_price</li>
              </ul>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 transition-all duration-200
              ${isDragging 
                ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' 
                : 'border-stone-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'
              }
              ${(uploading || processing) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
            `}
          >
            <input
              type="file"
              accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileSelect}
              disabled={uploading || processing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-upload"
            />
            
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              {(uploading || processing) ? (
                <>
                  <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                  <p className="text-sm font-medium text-stone-700">
                    {uploading ? 'Enviando arquivo...' : 'Processando dados...'}
                  </p>
                </>
              ) : (
                <>
                  <Upload className={`w-12 h-12 transition-colors ${isDragging ? 'text-emerald-600' : 'text-stone-400'}`} />
                  <div>
                    <p className="text-base font-semibold text-stone-900 mb-1">
                      {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo Excel aqui'}
                    </p>
                    <p className="text-sm text-stone-600">
                      ou <label htmlFor="file-upload" className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer underline">clique para selecionar</label>
                    </p>
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    Formatos aceitos: .xls, .xlsx, .csv (máx. 10MB)
                  </p>
                </>
              )}
            </div>
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