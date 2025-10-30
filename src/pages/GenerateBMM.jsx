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
  const [selectedTemplate, setSelectedTemplate] = useState("model1");
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
        classItem.company_name === company?.name &&
        classItem.month === period &&
        classItem.status === "Concluído"
      );

      // CRUZAMENTO 2: Buscar preços dos cursos
      const courses = await base44.entities.Course.list();
      
      const bmmItems = await Promise.all(completedClasses.map(async (classItem) => {
        const course = courses.find(c => c.name === classItem.training_name);
        
        // Buscar preço específico para a empresa
        let unitPrice = course?.standard_value || 0;
        
        if (course?.company_prices) {
          const companyPrice = course.company_prices.find(cp => 
            cp.company_id === selectedCompany || cp.company_name === company?.name
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
          instructor_name: classItem.instructor_name,
          training_schedule: classItem.training_schedule,
          location: classItem.location,
          total_daily_cost: totalDailyCost
        };
      }));

      const totalValue = bmmItems.reduce((sum, item) => sum + item.total_price, 0);

      setBmmData({
        company: company,
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

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
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
                        {company.name}
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
                    <SelectItem value="model1">📄 Demonstrativo Físico-Financeiro</SelectItem>
                    <SelectItem value="model2">📋 Lista de Treinamentos Normativos</SelectItem>
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

        {/* Visualização do BMM */}
        {bmmData && (
          <Card className="border-none shadow-xl print:shadow-none">
            <CardContent className="p-0">
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

              {selectedTemplate === "model1" && (
                <BMMModel1 data={bmmData} />
              )}

              {selectedTemplate === "model2" && (
                <BMMModel2 data={bmmData} />
              )}
            </CardContent>
          </Card>
        )}

        {!bmmData && (
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

// Modelo 1: Demonstrativo Físico-Financeiro
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
            <div>CONTRATADA: <strong>{data.company?.name}</strong></div>
            <div>Valor total do contrato original: R$ -</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>CNPJ: {data.company?.cnpj || '-'}</div>
            <div>(+) Aditivo Valor Adicionado: R$ -</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>OBJETO: Prestação de Serviços de treinamentos de capacitação e segurança</div>
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

// Modelo 2: Lista de Treinamentos Normativos
function BMMModel2({ data }) {
  return (
    <div className="bg-white p-8 print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Cabeçalho */}
      <div className="bg-green-800 text-white p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🌿</div>
          <div>
            <h2 className="text-2xl font-bold">agropalma</h2>
            <p className="text-sm">Sustainable Palm Oil</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">Treinamentos Normativos - {data.month} de {data.year}</h1>
          <p className="text-sm">{data.company?.name}</p>
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