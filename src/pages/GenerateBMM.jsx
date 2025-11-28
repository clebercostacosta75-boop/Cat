import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Printer, Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GenerateBMM() {
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("model3");
  const [generating, setGenerating] = useState(false);
  const [bmmData, setBmmData] = useState(null);

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

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleGenerate = async () => {
    if (!selectedCompany || !selectedMonth || !selectedYear) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setGenerating(true);
    
    try {
      // CRUZAMENTO 1: Buscar turmas concluídas
      const allClasses = await base44.entities.ClassSchedule.list();
      
      const company = companies.find(c => c.id === selectedCompany);
      const period = `${selectedMonth}/${selectedYear}`;
      
      const completedClasses = allClasses.filter(classItem => 
        (classItem.company_name === company?.nome_fantasia || 
         classItem.company_name === company?.razao_social) &&
        classItem.month === period &&
        classItem.status === "Concluído"
      );

      // CRUZAMENTO 2: Buscar preços dos cursos e informações dos instrutores
      const courses = await base44.entities.Course.list();
      const instructors = await base44.entities.Instructor.list();
      
      const bmmItems = await Promise.all(completedClasses.map(async (classItem) => {
        const course = courses.find(c => c.name === classItem.training_name);
        const instructor = instructors.find(i => i.name === classItem.instructor_name);
        
        // Buscar preço específico para a empresa
        let unitPrice = course?.standard_value || 0;
        
        if (course?.company_prices) {
          const companyPrice = course.company_prices.find(cp => 
            cp.company_id === selectedCompany || 
            cp.company_name === company?.nome_fantasia ||
            cp.company_name === company?.razao_social
          );
          if (companyPrice) {
            unitPrice = companyPrice.negotiated_value;
          }
        }

        // Buscar registros diários para somar custos
        const dailyRecords = await base44.entities.ClassDailyRecord.filter({ 
          class_schedule_id: classItem.id 
        });

        const totalDailyCost = dailyRecords.reduce((sum, record) => 
          sum + (record.total_daily_cost || 0), 0
        );

        return {
          training_name: classItem.training_name,
          modality: classItem.modality,
          category: classItem.category,
          students_count: classItem.students_count || 0,
          duration_hours: classItem.duration_hours || 0,
          unit_price: unitPrice,
          total_price: unitPrice * (classItem.students_count || 1),
          start_date: classItem.start_date,
          end_date: classItem.end_date,
          instructor_name: instructor?.name, // Use instructor name from the `instructors` list
          instructor_cpf: instructor?.cpf || '-',
          training_schedule: classItem.training_schedule,
          location: classItem.location,
          total_daily_cost: totalDailyCost
        };
      }));

      const totalValue = bmmItems.reduce((sum, item) => sum + item.total_price, 0);

      // Buscar dados da contratada (CAT)
      const contractors = await base44.entities.Contractor.list();
      const contractor = contractors.length > 0 ? contractors[0] : null;

      setBmmData({
        company: company,
        contractor: contractor,
        period: period,
        month: selectedMonth,
        year: selectedYear,
        items: bmmItems,
        total: totalValue,
        generatedDate: new Date().toLocaleDateString('pt-BR')
      });

    } catch (error) {
      console.error('Erro ao gerar BMM:', error);
      alert('Erro ao gerar BMM. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!bmmData) {
      alert('Gere o BMM primeiro antes de baixar o PDF');
      return;
    }

    try {
      const response = await base44.functions.invoke('gerarBMMPDF', {
        bmmData: bmmData,
        templateType: selectedTemplate
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BMM_${bmmData.company?.nome_fantasia || 'empresa'}_${bmmData.period || 'periodo'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Logo e Título */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
          <div className="flex-shrink-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
              alt="CAT Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">Gerar BMM</h1>
            <p className="text-stone-600 mt-1">Boletim Mensal de Medição - Cruzamento Automático</p>
          </div>
          <Link to={createPageUrl("BMMTemplates")}>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Gerenciar Modelos
            </Button>
          </Link>
        </div>

        {/* Formulário de Seleção */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>Configuração do BMM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Selecione a Empresa (Cliente) *</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome_fantasia || company.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month">Mês *</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Ano *</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Modelo de BMM</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="model3">📋 BMM 01 - Modelo Allbras</SelectItem>
                    <SelectItem value="model4">🌿 BMM 02 - Agropalma Treinamentos</SelectItem>
                    <SelectItem value="model1">📄 Demonstrativo Físico-Financeiro (Legado)</SelectItem>
                    <SelectItem value="model2">📋 Lista Treinamentos Normativos (Legado)</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                onClick={handleGenerate}
                disabled={!selectedCompany || !selectedMonth || !selectedYear || generating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar BMM
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visualização do BMM ou Preview em Branco */}
        <Card className="border-none shadow-xl print:shadow-none">
          <CardContent className="p-0">
            {bmmData && (
              <div className="flex justify-end gap-2 p-4 print:hidden">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            )}

            {selectedTemplate === "model3" && (
              <BMMModel3 data={bmmData} />
            )}

            {selectedTemplate === "model4" && (
              <BMMModel4 data={bmmData} />
            )}

            {selectedTemplate === "model1" && bmmData && (
              <BMMModel1 data={bmmData} />
            )}

            {selectedTemplate === "model2" && bmmData && (
              <BMMModel2 data={bmmData} />
            )}
          </CardContent>
        </Card>

        {!bmmData && !['model3', 'model4'].includes(selectedTemplate) && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 mb-2">Nenhum BMM gerado ainda</p>
              <p className="text-sm text-stone-500">
                Preencha os campos acima e clique em "Gerar BMM"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Modelo 3: BMM 01 - Modelo Allbras
function BMMModel3({ data }) {
  const items = data?.items || [];
  const emptyRows = Math.max(0, 9 - items.length);

  return (
    <div className="bg-white p-8 print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="border-2 border-black">
        {/* Cabeçalho Principal */}
        <div className="grid grid-cols-[180px_1fr_250px] border-b-2 border-black">
          <div className="border-r-2 border-black p-4 flex items-center justify-center bg-gray-50">
            <div>
              <div className="text-2xl font-bold text-blue-900 text-center">▲</div>
              <div className="text-xs font-bold text-center text-blue-900">ALLBRAS</div>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center">
            <h1 className="text-xl font-bold text-center">BOLETIM MENSAL DE MEDIÇÃO (BMM)</h1>
          </div>
          <div className="border-l-2 border-black p-2 text-xs">
            <div className="border-b border-black p-1"><strong>Código:</strong> RG-ADM-UNI-025</div>
            <div className="border-b border-black p-1"><strong>Rev.:</strong> 03</div>
            <div className="p-1"><strong>Última revisão:</strong> {data?.generatedDate || '09/05/2022'}</div>
          </div>
        </div>

        {/* Subtítulo */}
        <div className="bg-gray-200 border-b border-black p-2 text-center font-bold text-sm">
          Demonstrativo Físico-Financeiro
        </div>

        {/* Seção de Informações Contratuais */}
        <div className="grid grid-cols-2 text-xs">
          {/* Coluna Esquerda */}
          <div className="border-r border-black">
            <div className="bg-gray-200 border-b border-black p-2 font-bold">REF. CONTRATO E ADITIVO</div>
            <div className="border-b border-black p-2">
              <div><strong>CONTRATADA:</strong></div>
              <div className="ml-4">{data?.contractor?.razao_social || 'V.S. NUNES CURSOS E TREINAMENTO'}</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>CNPJ:</strong></div>
              <div className="ml-4">{data?.contractor?.cnpj || '07.238.084/0001-45'}</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>OBJETO:</strong></div>
              <div className="ml-4 text-xs">Prestação de Serviços de treinamentos de capacitação e segurança pela parte CONTRATADA, em entendimento às Normas Regulamentadoras (NR's)</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>VALOR DO BMM</strong></div>
              <div className="ml-4">R$ {data?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '11.016,00'}</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>BMM nº:</strong></div>
              <div className="ml-4">{data?.period || '01/2025'}</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>MÊS DE EXECUÇÃO:</strong></div>
              <div className="ml-4">{data?.month || 'Outubro'}</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>PERÍODO DE MEDIÇÃO:</strong></div>
              <div className="ml-4">{data?.period ? `15/${data.period} a 20/${data.period}` : '15/10/2025 a 20/10/2025'}</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>INÍCIO DO CONTRATO:</strong></div>
            </div>
            <div className="p-2">
              <div><strong>TÉRMINO DO CONTRATO:</strong></div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div>
            <div className="bg-gray-200 border-b border-black p-2 font-bold">ACOMPANHAMENTO GESTOR CONTRATO</div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div>Valor total do contrato original</div>
              <div className="text-right">R$</div>
            </div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div>(+) Aditivo Valor Adicionado</div>
              <div className="text-right">R$</div>
            </div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div>(-) Aditivo Valor Reduzido</div>
              <div className="text-right">R$</div>
            </div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div className="font-bold">(=) Valor do Contrato Atual</div>
              <div className="text-right font-bold">R$</div>
            </div>
            <div className="border-b border-black p-2">
              <div><strong>BMM's Anteriores:</strong></div>
            </div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div>Este BMM:</div>
              <div className="text-right">R$ {data?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '11.016,00'}</div>
            </div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div>Total Realizado:</div>
              <div className="text-right">R$ {data?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '11.016,00'}</div>
            </div>
            <div className="border-b border-black p-2 grid grid-cols-2">
              <div>Saldo a Realizar:</div>
              <div className="text-right">Por demanda</div>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-[100px_80px_80px_1fr] gap-1 text-center font-bold mb-1">
                <div>AGÊNCIA</div>
                <div>C/C</div>
                <div>BANCO</div>
                <div></div>
              </div>
              <div className="border border-black p-1 mb-1">
                <div className="grid grid-cols-[100px_80px_80px_1fr] gap-1 text-center">
                  <div>{data?.contractor?.bank_data?.agency || '0327-1'}</div>
                  <div>{data?.contractor?.bank_data?.account || '164696-6'}</div>
                  <div>{data?.contractor?.bank_data?.bank_name || 'Bradesco'}</div>
                  <div></div>
                </div>
              </div>
              <div className="text-xs">Dados Bancários</div>
            </div>
          </div>
        </div>

        {/* Tabela de Itens */}
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-300">
              <th className="border border-black p-2 w-12">ITEM</th>
              <th className="border border-black p-2">DESCRIÇÃO</th>
              <th className="border border-black p-2 w-24">Unidade de medida</th>
              <th className="border border-black p-2 w-24">Quantidade medida</th>
              <th className="border border-black p-2 w-28">Unitário</th>
              <th className="border border-black p-2 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2">{item.training_name}</td>
                  <td className="border border-black p-2 text-center">QTD.</td>
                  <td className="border border-black p-2 text-center">{item.students_count}</td>
                  <td className="border border-black p-2 text-right">R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="border border-black p-2 text-right">R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2">Treinamento de RESGATE INDUSTRIAL</td>
                <td className="border border-black p-2 text-center">QTD.</td>
                <td className="border border-black p-2 text-center">4</td>
                <td className="border border-black p-2 text-right">R$ 2.754,00</td>
                <td className="border border-black p-2 text-right">R$ 11.016,00</td>
              </tr>
            )}
            
            {/* Linhas vazias */}
            {Array.from({ length: items.length > 0 ? emptyRows : 8 }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-2 text-center">{items.length > 0 ? items.length + i + 1 : i + 2}</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
              </tr>
            ))}
            
            <tr className="font-bold bg-gray-100">
              <td colSpan="4" className="border border-black p-2">VALOR POR EXTENSO:</td>
              <td className="border border-black p-2 text-center">Onze mil, e dezesseis reais</td>
              <td className="border border-black p-2 text-right">R$ {data?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '11.016,00'}</td>
            </tr>
          </tbody>
        </table>

        {/* Seção OBS */}
        <div className="border-t border-black p-2">
          <div className="font-bold mb-2">OBS:</div>
          <div className="border border-black p-4 min-h-[60px]">&nbsp;</div>
        </div>

        {/* Seção de Assinaturas */}
        <div className="border-t-2 border-black">
          <div className="bg-gray-200 text-center p-2 font-bold border-b border-black">ASSINATURAS</div>
          <div className="text-[10px] text-red-600 p-2 border-b border-black italic">
            *Obrigatoriamente as assinaturas têm que ser Eletrônicas ou Manuscritas validadas com Carimbo, para assinatura digital enviar o comprovante de certificação. As datas não podem ser digitadas.
          </div>
          
          <div className="grid grid-cols-3 text-center text-xs">
            <div className="border-r border-black p-4">
              <div className="font-bold mb-16">CONTRATADA</div>
              <div className="border-t border-black pt-2 mx-8 mb-2">&nbsp;</div>
              <div>DATA: ___/___/______</div>
            </div>
            <div className="border-r border-black p-4">
              <div className="font-bold mb-16">FISCALIZAÇÃO</div>
              <div className="border-t border-black pt-2 mx-8 mb-2">&nbsp;</div>
              <div>DATA: ___/___/______</div>
            </div>
            <div className="p-4">
              <div className="font-bold mb-16">GESTOR DO CONTRATO</div>
              <div className="border-t border-black pt-2 mx-8 mb-2">&nbsp;</div>
              <div>DATA: ___/___/______</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modelo 4: BMM 02 - Agropalma Treinamentos Normativos
function BMMModel4({ data }) {
  const items = data?.items || [];
  // Adjusted for default items in case data is empty
  const defaultItemsCount = 3; 
  const emptyRows = Math.max(0, 10 - items.length - (items.length === 0 ? defaultItemsCount : 0));

  return (
    <div className="bg-white p-8 print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Cabeçalho Verde Agropalma */}
      <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-4 mb-1 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-4xl">🌿</div>
        <div>
          <h2 className="text-2xl font-bold">{data?.company?.nome_fantasia || 'Empresa'}</h2>
        </div>
      </div>
      <div className="text-center flex-1">
        <h1 className="text-xl font-bold">
          Treinamentos Normativos - Mês de {data?.month || 'Janeiro'} de {data?.year || '2025'} - {data?.company?.nome_fantasia || data?.company?.razao_social || 'Empresa'}
        </h1>
      </div>
      <div className="flex gap-3">
        <div className="w-16 h-16 bg-white rounded"></div>
        <div className="w-16 h-16 bg-white rounded-full"></div>
      </div>
      </div>

      {/* Tabela de Treinamentos */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="border border-gray-400 p-2 font-bold">NOME DO TREINAMENTO</th>
              <th className="border border-gray-400 p-2 font-bold">MODALIDADE</th>
              <th className="border border-gray-400 p-2 font-bold">H - PRÁTICA</th>
              <th className="border border-gray-400 p-2 font-bold">PERÍODO</th>
              <th className="border border-gray-400 p-2 font-bold">HORÁRIO</th>
              <th className="border border-gray-400 p-2 font-bold">NOME DO INSTRUTOR</th>
              <th className="border border-gray-400 p-2 font-bold">CPF</th>
              <th className="border border-gray-400 p-2 font-bold">MÊS</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 p-2">{item.training_name}</td>
                  <td className="border border-gray-400 p-2 text-center">{item.modality || 'FORMAÇÃO'}</td>
                  <td className="border border-gray-400 p-2 text-center">{item.duration_hours || 0}</td>
                  <td className="border border-gray-400 p-2 text-center">{item.start_date || '08/10/2025'}</td>
                  <td className="border border-gray-400 p-2 text-center">{item.training_schedule || '07:00 às 15:00'}</td>
                  <td className="border border-gray-400 p-2">{item.instructor_name || '-'}</td>
                  <td className="border border-gray-400 p-2 text-center">{item.instructor_cpf || '845.321.812-91'}</td>
                  <td className="border border-gray-400 p-2 text-center">{data?.month || 'OUTUBRO'}</td>
                </tr>
              ))
            ) : (
              <>
                <tr>
                  <td className="border border-gray-400 p-2">NR13 Pv Caldeireiro</td>
                  <td className="border border-gray-400 p-2 text-center">FORMAÇÃO</td>
                  <td className="border border-gray-400 p-2 text-center">20</td>
                  <td className="border border-gray-400 p-2 text-center">08/10/2025</td>
                  <td className="border border-gray-400 p-2 text-center">07:00 às 15:00</td>
                  <td className="border border-gray-400 p-2">RAIMUNDO PAES DE OLIVEIRA</td>
                  <td className="border border-gray-400 p-2 text-center">845.321.812-91</td>
                  <td className="border border-gray-400 p-2 text-center">OUTUBRO</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-400 p-2">NR11 Retroescavadeira</td>
                  <td className="border border-gray-400 p-2 text-center">FORMAÇÃO</td>
                  <td className="border border-gray-400 p-2 text-center">20</td>
                  <td className="border border-gray-400 p-2 text-center">08/10/2025</td>
                  <td className="border border-gray-400 p-2 text-center">07:00 às 15:00</td>
                  <td className="border border-gray-400 p-2">RAIMUNDO PAES DE OLIVEIRA</td>
                  <td className="border border-gray-400 p-2 text-center">845.321.812-91</td>
                  <td className="border border-gray-400 p-2 text-center">OUTUBRO</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2">NR12 Segurança em Máquinas (agropalma)</td>
                  <td className="border border-gray-400 p-2 text-center">PERIÓDICO</td>
                  <td className="border border-gray-400 p-2 text-center">5</td>
                  <td className="border border-gray-400 p-2 text-center">14/10/2025</td>
                  <td className="border border-gray-400 p-2 text-center">07:00 às 12:00</td>
                  <td className="border border-gray-400 p-2">RAIMUNDO PAES DE OLIVEIRA</td>
                  <td className="border border-gray-400 p-2 text-center">845.321.812-91</td>
                  <td className="border border-gray-400 p-2 text-center">OUTUBRO</td>
                </tr>
              </>
            )}

            {/* Linhas vazias para completar */}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
                <td className="border border-gray-400 p-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé com totalizadores */}
      {data && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-stone-600">Total de Treinamentos:</p>
              <p className="text-xl font-bold text-green-700">{items.length}</p>
            </div>
            <div>
              <p className="text-stone-600">Carga Horária Total:</p>
              <p className="text-xl font-bold text-green-700">
                {items.reduce((sum, item) => sum + (item.duration_hours || 0), 0)}h
              </p>
            </div>
            <div>
              <p className="text-stone-600">Alunos Treinados:</p>
              <p className="text-xl font-bold text-green-700">
                {items.reduce((sum, item) => sum + (item.students_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modelo 1: Demonstrativo Físico-Financeiro (Legado)
function BMMModel1({ data }) {
  return (
    <div className="bg-white p-8 print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Cabeçalho */}
      <div className="border-2 border-black">
        <div className="grid grid-cols-3 border-b-2 border-black">
          <div className="border-r-2 border-black p-4 flex items-center justify-center">
            <div className="text-4xl font-bold text-blue-900">🏢</div>
          </div>
          <div className="col-span-2 p-4">
            <h1 className="text-center text-xl font-bold">BOLETIM MENSAL DE MEDIÇÃO (BMM)</h1>
            <div className="mt-2 text-sm">
              <div className="flex justify-between">
                <span>Código: RG-ADM-UNI-025</span>
              </div>
              <div className="flex justify-between">
                <span>Rev.: 03</span>
              </div>
              <div className="flex justify-between">
                <span>Última revisão: {data.generatedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações do Contrato */}
        <div className="p-4 text-sm">
          <div className="mb-2">
            <strong>Demonstrativo Físico-Financeiro</strong>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <strong>REF. CONTRATO E ADITIVO</strong>
            </div>
            <div>
              <strong>ACOMPANHAMENTO GESTOR CONTRATO</strong>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>CONTRATADA: <strong>{data.contractor?.razao_social || data.company?.nome_fantasia}</strong></div>
            <div>Valor total do contrato original: R$ -</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>CNPJ: {data.contractor?.cnpj || data.company?.cnpj || '-'}</div>
            <div>(+) Aditivo Valor Adicionado: R$ -</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>OBJETO: {data.company?.billing_info?.contract_object || 'Prestação de Serviços de treinamentos de capacitação e segurança'}</div>
            <div>(-) Aditivo Valor Reduzido: R$ -</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>VALOR DO BMM: <strong>R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
            <div>Este BMM: R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>BMM nº: {data.month}/{data.year}</div>
            <div>Total Realizado: R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>PERÍODO DE MEDIÇÃO: {data.period}</div>
            <div>Saldo a Realizar: R$ -</div>
          </div>
        </div>

        {/* Tabela de Itens */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2">ITEM</th>
              <th className="border border-black p-2">DESCRIÇÃO</th>
              <th className="border border-black p-2">Unidade de medida</th>
              <th className="border border-black p-2">Quantidade medida</th>
              <th className="border border-black p-2">Unitário</th>
              <th className="border border-black p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-black p-2 text-center">{index + 1}</td>
                <td className="border border-black p-2">{item.training_name}</td>
                <td className="border border-black p-2 text-center">QTD</td>
                <td className="border border-black p-2 text-center">{item.students_count}</td>
                <td className="border border-black p-2 text-right">
                  R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-black p-2 text-right">
                  R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 9 - data.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2">&nbsp;</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan="5" className="border border-black p-2 text-right">VALOR POR EXTENSO:</td>
              <td className="border border-black p-2 text-right">
                R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Observações */}
        <div className="p-4">
          <div className="mb-2"><strong>OBS:</strong></div>
          <div className="border border-black p-4 min-h-[60px]">&nbsp;</div>
        </div>

        {/* Assinaturas */}
        <div className="grid grid-cols-3 text-center text-sm">
          <div className="border-r border-t-2 border-black p-4">
            <div className="mb-12"><strong>CONTRATADA</strong></div>
            <div className="border-t border-black pt-2 mx-4">Assinatura e Carimbo</div>
            <div className="mt-4">DATA: ___/___/______</div>
          </div>
          <div className="border-r border-t-2 border-black p-4">
            <div className="mb-12"><strong>FISCALIZAÇÃO</strong></div>
            <div className="border-t border-black pt-2 mx-4">Assinatura e Carimbo</div>
            <div className="mt-4">DATA: ___/___/______</div>
          </div>
          <div className="border-t-2 border-black p-4">
            <div className="mb-12"><strong>GESTOR DO CONTRATO</strong></div>
            <div className="border-t border-black pt-2 mx-4">Assinatura e Carimbo</div>
            <div className="mt-4">DATA: ___/___/______</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modelo 2: Lista de Treinamentos Normativos (Legado)
function BMMModel2({ data }) {
  return (
    <div className="bg-white p-8 print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Cabeçalho */}
      <div className="bg-green-800 text-white p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🌿</div>
          <div>
            <h2 className="text-2xl font-bold">{data.company?.nome_fantasia || 'Empresa'}</h2>
            <p className="text-sm">{data.company?.razao_social || ''}</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">Treinamentos Normativos - {data.month} de {data.year}</h1>
          <p className="text-sm">{data.company?.nome_fantasia || data.company?.razao_social}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="bg-yellow-400 text-black px-3 py-1 rounded font-bold">BMM</div>
          <div className="w-16 h-16 bg-white"></div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-gray-400 p-2">NOME DO TREINAMENTO</th>
              <th className="border border-gray-400 p-2">MODALIDADE</th>
              <th className="border border-gray-400 p-2">H - PRÁTICA</th>
              <th className="border border-gray-400 p-2">PERÍODO</th>
              <th className="border border-gray-400 p-2">INSTRUTOR</th>
              <th className="border border-gray-400 p-2">HORÁRIO</th>
              <th className="border border-gray-400 p-2">NOME DO INSTRUTOR</th>
              <th className="border border-gray-400 p-2">CPF</th>
              <th className="border border-gray-400 p-2">MÊS</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                <td className="border border-gray-400 p-2">{item.training_name}</td>
                <td className="border border-gray-400 p-2 text-center">{item.modality}</td>
                <td className="border border-gray-400 p-2 text-center">{item.duration_hours}</td>
                <td className="border border-gray-400 p-2 text-center">
                  {item.start_date}
                </td>
                <td className="border border-gray-400 p-2 text-center">{item.instructor_name}</td>
                <td className="border border-gray-400 p-2 text-center">{item.training_schedule}</td>
                <td className="border border-gray-400 p-2">{item.instructor_name}</td>
                <td className="border border-gray-400 p-2 text-center">-</td>
                <td className="border border-gray-400 p-2 text-center">{data.month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-stone-600">
        <p><strong>Total de Treinamentos:</strong> {data.items.length}</p>
        <p><strong>Valor Total:</strong> R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
}