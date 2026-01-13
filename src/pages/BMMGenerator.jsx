import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Building2, Calendar, Eye, Download, Mail, 
  Loader2, CheckCircle, AlertCircle, RefreshCw, Sparkles, Send, Users, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import BMMPreview from "@/components/bmm/BMMPreview";
import BMMEmailSender from "@/components/bmm/BMMEmailSender";

export default function BMMGenerator() {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedContractor, setSelectedContractor] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const previewRef = useRef(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['bmmTemplates'],
    queryFn: () => base44.entities.BMMTemplate.list(),
    initialData: [],
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => base44.entities.Contractor.list(),
    initialData: [],
  });

  const saveBMMRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.BMMRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bmmRecords'] });
      toast.success('BMM salvo no histórico!');
    },
  });

  // Extrair períodos disponíveis
  const availablePeriods = [...new Set(classSchedules.map(s => s.month).filter(Boolean))].sort();

  // Quando selecionar empresa, pré-selecionar template padrão
  useEffect(() => {
    if (selectedCompany) {
      const company = companies.find(c => c.id === selectedCompany);
      if (company?.default_bmm_template_id) {
        setSelectedTemplate(company.default_bmm_template_id);
      }
    }
  }, [selectedCompany, companies]);

  // Filtrar turmas por empresa e período
  const filteredClasses = classSchedules.filter(classItem => {
    const matchCompany = classItem.company_id === selectedCompany;
    const matchPeriod = classItem.month === selectedPeriod;
    return matchCompany && matchPeriod;
  });

  const handleGenerate = async () => {
    if (!selectedCompany || !selectedPeriod) {
      toast.error('Selecione empresa e período');
      return;
    }

    setIsGenerating(true);
    try {
      const company = companies.find(c => c.id === selectedCompany);
      const template = templates.find(t => t.id === selectedTemplate);
      const contractor = contractors.find(c => c.id === selectedContractor) || contractors[0];

      // Mapear cursos com valores
      const courseMap = courses.reduce((acc, course) => {
        acc[course.name] = course;
        return acc;
      }, {});

      // Calcular dados das turmas
      const classesData = filteredClasses.map(classItem => {
        const unitValue = classItem.unit_value || 0;
        const studentsCount = classItem.students_count || 1;
        const courseData = courses.find(c => c.id === classItem.training_id);
        
        return {
          ...classItem,
          unit_value: unitValue,
          total_value: classItem.total_value || (unitValue * studentsCount),
          course_data: courseData
        };
      });

      const totalValue = classesData.reduce((sum, c) => sum + c.total_value, 0);
      const totalStudents = classesData.reduce((sum, c) => sum + (c.students_count || 0), 0);

      setGeneratedContent({
        company,
        contractor,
        template,
        period: selectedPeriod,
        classes: classesData,
        totals: {
          value: totalValue,
          students: totalStudents,
          classes: classesData.length
        },
        generatedAt: new Date().toISOString()
      });

      setActiveTab("preview");
      toast.success('BMM gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar BMM:', error);
      toast.error('Erro ao gerar BMM');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    if (!generatedContent) return;

    // Salvar registro primeiro
    saveBMMRecordMutation.mutate({
      company_id: selectedCompany,
      company_name: generatedContent.company?.nome_fantasia || generatedContent.company?.razao_social,
      period: selectedPeriod,
      template_id: selectedTemplate,
      template_name: generatedContent.template?.name,
      status: 'Gerado',
      total_value: generatedContent.totals.value,
      total_classes: generatedContent.totals.classes,
      total_students: generatedContent.totals.students
    });

    // Usar window.print() diretamente na janela atual para gerar PDF em A4 paisagem
    window.print();
    toast.success('Janela de impressão aberta. Configure como A4 Paisagem e selecione "Salvar como PDF".');
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Gerador de BMM
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Boletim Mensal de Medição • Gere documentos profissionais
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 h-auto">
            <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3">
              <Building2 className="w-4 h-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3" disabled={!generatedContent}>
              <Eye className="w-4 h-4" />
              Pré-visualização
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2 data-[state=active]:bg-gray-900 data-[state=active]:text-white py-3" disabled={!generatedContent}>
              <Mail className="w-4 h-4" />
              Enviar
            </TabsTrigger>
          </TabsList>

          {/* Tab Configuração */}
          <TabsContent value="config">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Seleção */}
              <Card className="border border-gray-300">
                <CardHeader className="bg-gray-100 border-b border-gray-200">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-black">
                    <FileText className="w-5 h-5" />
                    Configurar BMM
                  </h2>
                  <p className="text-gray-600 text-sm">Selecione os parâmetros</p>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Empresa Cliente *</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.filter(c => c.status === 'Ativo').map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            🏢 {company.nome_fantasia || company.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Empresa Contratada *</Label>
                    <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a contratada" />
                      </SelectTrigger>
                      <SelectContent>
                        {contractors.filter(c => c.status === 'Ativo').map(contractor => (
                          <SelectItem key={contractor.id} value={contractor.id}>
                            🏭 {contractor.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Período *</Label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePeriods.map(period => (
                          <SelectItem key={period} value={period}>
                            📅 {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo de BMM</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            📄 {template.name} {template.is_default ? '⭐' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerate}
                    className="w-full bg-gray-900 hover:bg-gray-800 mt-4"
                    disabled={!selectedCompany || !selectedContractor || !selectedPeriod || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando BMM...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar BMM
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card className="border border-gray-300">
                <CardHeader className="bg-gray-100 border-b border-gray-200">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-black">
                    <Calendar className="w-5 h-5" />
                    Resumo do Período
                  </h2>
                  <p className="text-gray-600 text-sm">Visão geral das turmas</p>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedCompany && selectedPeriod ? (
                    <div className="space-y-4">
                      {selectedCompanyData?.logo_url && (
                        <div className="flex justify-center">
                          <img 
                            src={selectedCompanyData.logo_url} 
                            alt="Logo" 
                            className="h-16 object-contain"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 border border-gray-300 rounded">
                          <FileText className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-black">{filteredClasses.length}</p>
                          <p className="text-xs text-gray-600">Turmas</p>
                        </div>
                        <div className="text-center p-4 border border-gray-300 rounded">
                          <Users className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-black">
                            {filteredClasses.reduce((sum, c) => sum + (c.students_count || 0), 0)}
                          </p>
                          <p className="text-xs text-gray-600">Alunos</p>
                        </div>
                      </div>
                      
                      {filteredClasses.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filteredClasses.map((classItem, idx) => (
                            <div key={idx} className="p-3 bg-stone-50 rounded-lg text-sm">
                              <p className="font-medium">{classItem.training_name}</p>
                              <p className="text-stone-500">
                                {classItem.start_date} • {classItem.students_count || 0} alunos
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-stone-500">
                          <AlertCircle className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                          <p>Nenhuma turma encontrada para este período</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-stone-500">
                      <Building2 className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                      <p>Selecione empresa e período para ver o resumo</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Pré-visualização */}
          <TabsContent value="preview">
            {generatedContent && (
              <div className="space-y-4">
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("config")}>
                    Voltar à Configuração
                  </Button>
                  <Button 
                    onClick={handleExportPDF}
                    className="bg-gray-900 hover:bg-gray-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("send")}
                    className="bg-gray-900 hover:bg-gray-800"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar por E-mail
                  </Button>
                </div>
                
                <div ref={previewRef}>
                  <BMMPreview content={generatedContent} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab Enviar */}
          <TabsContent value="send">
            {generatedContent && (
              <BMMEmailSender 
                content={generatedContent}
                previewRef={previewRef}
                onBack={() => setActiveTab("preview")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}