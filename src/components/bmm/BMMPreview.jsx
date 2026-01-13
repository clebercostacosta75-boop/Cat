import React from "react";
import { Card } from "@/components/ui/card";

export default function BMMPreview({ content }) {
  if (!content) return null;

  const { company, contractor, period, classes, totals, template } = content;

  // Adicionar estilos de impressão A4 Paisagem
  React.useEffect(() => {
    const style = document.createElement('style');
    style.id = 'bmm-print-styles';
    style.textContent = `
      @media print {
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        
        * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
        
        body, html {
          height: auto !important;
          overflow: visible !important;
          background: white !important;
        }
        
        /* Ocultar elementos da interface da aplicação */
        body > div:not(#app-root),
        #app-sidebar, 
        #app-header,
        nav:not(#bmm-print-container nav), 
        header:not(#bmm-print-container header), 
        aside, 
        .sidebar,
        button:not(#bmm-print-container button),
        [role="navigation"], 
        [role="banner"] {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Garantir que o container raiz e o BMM sejam visíveis */
        #app-root {
          background: white !important;
          display: block !important;
          visibility: visible !important;
        }
        
        #app-root > * {
          display: none !important;
        }
        
        #app-root #bmm-print-container,
        #app-root #bmm-print-container * {
          display: block !important;
          visibility: visible !important;
        }
        
        /* Container principal do BMM */
        #bmm-print-container {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-after: avoid;
          position: static !important;
        }
        
        /* Card do preview */
        #bmm-print-container > div {
          box-shadow: none !important;
          border: none !important;
          padding: 10mm !important;
          background: white !important;
          margin: 0 !important;
        }
        
        /* Cabeçalho do BMM */
        #bmm-print-container .border-b-2 {
          border-bottom: 2px solid #10b981 !important;
          padding-bottom: 8px !important;
          margin-bottom: 10px !important;
        }
        
        /* Flexbox e Grid mantêm display */
        #bmm-print-container .flex {
          display: flex !important;
        }
        
        #bmm-print-container .grid {
          display: grid !important;
        }
        
        /* Tabela responsiva */
        #bmm-print-container table {
          display: table !important;
          width: 100% !important;
          font-size: 8.5pt !important;
          page-break-inside: avoid;
          border-collapse: collapse !important;
        }
        
        #bmm-print-container thead {
          display: table-header-group !important;
          background-color: #10b981 !important;
          color: white !important;
        }
        
        #bmm-print-container tbody {
          display: table-row-group !important;
        }
        
        #bmm-print-container tfoot {
          display: table-footer-group !important;
        }
        
        #bmm-print-container tr {
          display: table-row !important;
        }
        
        #bmm-print-container th,
        #bmm-print-container td {
          display: table-cell !important;
          padding: 3px 5px !important;
          font-size: 8.5pt !important;
          border: 1px solid #ccc !important;
        }
        
        #bmm-print-container th {
          background-color: #10b981 !important;
          color: white !important;
        }
        
        /* Logos */
        #bmm-print-container img {
          display: inline-block !important;
          max-height: 35px !important;
          page-break-inside: avoid;
        }
        
        /* Títulos e textos */
        #bmm-print-container h1 {
          font-size: 14pt !important;
          margin: 6px 0 !important;
        }
        
        #bmm-print-container h2 {
          font-size: 10pt !important;
          margin: 5px 0 !important;
          font-weight: bold !important;
        }
        
        #bmm-print-container p {
          display: block !important;
        }
        
        /* Seção de dados do cliente */
        #bmm-print-container .bg-stone-50 {
          background: #f5f5f4 !important;
          padding: 8px !important;
          margin-bottom: 10px !important;
        }
        
        /* Cards de resumo */
        #bmm-print-container .grid {
          page-break-inside: avoid;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 10px !important;
          margin: 10px 0 !important;
        }
        
        #bmm-print-container .bg-emerald-50,
        #bmm-print-container .bg-blue-50,
        #bmm-print-container .bg-amber-50 {
          padding: 8px !important;
          text-align: center !important;
          border-radius: 4px !important;
        }
        
        /* Assinaturas */
        #bmm-print-container .signature-section {
          page-break-inside: avoid;
          margin-top: 12mm !important;
          padding-top: 10px !important;
        }
        
        #bmm-print-container .signature-section .grid {
          margin-top: 8px !important;
        }
        
        #bmm-print-container .border-t-2 {
          border-top: 2px solid #e5e5e5 !important;
        }
        
        /* Rodapé */
        #bmm-print-container .border-t.border-stone-200 {
          margin-top: 10px !important;
          padding-top: 8px !important;
          font-size: 7pt !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('bmm-print-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Buscar contrato ativo da empresa
  const activeContract = company?.company_contracts?.find(c => c.status === 'Ativo');

  return (
    <Card id="bmm-print-container" className="border-none shadow-xl bg-white p-8">
      {/* Cabeçalho */}
      <div className="border-b-2 border-emerald-600 pb-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo da Contratada */}
            {contractor?.logo_url ? (
              <img 
                src={contractor.logo_url} 
                alt={contractor.company_name} 
                className="h-16 w-auto object-contain"
              />
            ) : (
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" 
                alt="Logo Padrão" 
                className="h-16 w-auto"
              />
            )}
            {contractor && (
              <div className="text-sm text-stone-600">
                <p className="font-bold text-stone-900">{contractor.company_name}</p>
                <p className="text-xs">{contractor.razao_social}</p>
                <p>CNPJ: {contractor.cnpj}</p>
              </div>
            )}
          </div>
          
          {/* Logo da Empresa Cliente */}
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.nome_fantasia} 
              className="h-14 w-auto object-contain"
            />
          )}
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-800">
            BOLETIM MENSAL DE MEDIÇÃO - BMM
          </h1>
          <p className="text-lg text-stone-600 mt-1">
            Período: <strong>{period}</strong>
          </p>
          {activeContract && (
            <div className="text-sm text-stone-600 mt-2">
              <p>
                <strong>Contrato:</strong> {activeContract.contract_number}
                {activeContract.amendment_number && (
                  <span> | <strong>Aditivo:</strong> {activeContract.amendment_number}</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dados da Empresa Cliente */}
      <div className="bg-stone-50 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-bold text-stone-900 mb-3">DADOS DO CLIENTE</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Razão Social:</strong> {company?.razao_social}</p>
            <p><strong>Nome Fantasia:</strong> {company?.nome_fantasia}</p>
            <p><strong>CNPJ:</strong> {company?.cnpj}</p>
          </div>
          <div>
            {company?.billing_info?.contact_reference && (
              <p><strong>Ref. Contato:</strong> {company.billing_info.contact_reference}</p>
            )}
            {company?.email_faturamento && (
              <p><strong>E-mail:</strong> {company.email_faturamento}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Treinamentos */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-stone-900 mb-3">DEMONSTRATIVO DE TREINAMENTOS</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-emerald-700 px-3 py-2 text-left">Nº</th>
                <th className="border border-emerald-700 px-3 py-2 text-left">Treinamento</th>
                <th className="border border-emerald-700 px-3 py-2 text-center">Data Início</th>
                <th className="border border-emerald-700 px-3 py-2 text-center">Data Fim</th>
                <th className="border border-emerald-700 px-3 py-2 text-center">C.H.</th>
                <th className="border border-emerald-700 px-3 py-2 text-center">Qtd. Alunos</th>
                <th className="border border-emerald-700 px-3 py-2 text-right">Valor Unit.</th>
                <th className="border border-emerald-700 px-3 py-2 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                  <td className="border border-stone-300 px-3 py-2">{index + 1}</td>
                  <td className="border border-stone-300 px-3 py-2 font-medium">
                    {classItem.training_name}
                  </td>
                  <td className="border border-stone-300 px-3 py-2 text-center">
                    {formatDate(classItem.start_date)}
                  </td>
                  <td className="border border-stone-300 px-3 py-2 text-center">
                    {formatDate(classItem.end_date)}
                  </td>
                  <td className="border border-stone-300 px-3 py-2 text-center">
                    {classItem.duration_hours || '-'}h
                  </td>
                  <td className="border border-stone-300 px-3 py-2 text-center">
                    {classItem.students_count || 0}
                  </td>
                  <td className="border border-stone-300 px-3 py-2 text-right">
                    {formatCurrency(classItem.unit_value)}
                  </td>
                  <td className="border border-stone-300 px-3 py-2 text-right font-semibold">
                    {formatCurrency(classItem.total_value)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-100 font-bold">
                <td colSpan={5} className="border border-stone-300 px-3 py-2 text-right">
                  TOTAIS:
                </td>
                <td className="border border-stone-300 px-3 py-2 text-center">
                  {totals.students}
                </td>
                <td className="border border-stone-300 px-3 py-2"></td>
                <td className="border border-stone-300 px-3 py-2 text-right text-emerald-700">
                  {formatCurrency(totals.value)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{totals.classes}</p>
          <p className="text-sm text-stone-600">Turmas Realizadas</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{totals.students}</p>
          <p className="text-sm text-stone-600">Total de Alunos</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.value)}</p>
          <p className="text-sm text-stone-600">Valor Total</p>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="signature-section border-t-2 border-stone-200 pt-6 mt-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="text-center">
            <div className="border-t-2 border-stone-400 w-64 mx-auto pt-2">
              <p className="font-semibold text-stone-900">CONTRATADA</p>
              <p className="text-sm text-stone-600">{contractor?.company_name || 'CAT Treinamentos'}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-stone-400 w-64 mx-auto pt-2">
              <p className="font-semibold text-stone-900">CONTRATANTE</p>
              <p className="text-sm text-stone-600">{company?.nome_fantasia || company?.razao_social}</p>
            </div>
          </div>
        </div>

        {/* Assinaturas Fiscalização e Gestor */}
        <div className="grid md:grid-cols-2 gap-8 mt-6">
          <div className="text-center">
            <div className="border-t-2 border-stone-400 w-64 mx-auto pt-2">
              <p className="font-semibold text-stone-900">FISCALIZAÇÃO</p>
              <p className="text-sm text-stone-600">{company?.fiscal_name || '______________________________'}</p>
              {company?.fiscal_role && (
                <p className="text-xs text-stone-500 mt-1">{company.fiscal_role}</p>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-stone-400 w-64 mx-auto pt-2">
              <p className="font-semibold text-stone-900">GESTOR DO CONTRATO</p>
              <p className="text-sm text-stone-600">{company?.contract_manager_name || '______________________________'}</p>
              {company?.contract_manager_role && (
                <p className="text-xs text-stone-500 mt-1">{company.contract_manager_role}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-8 pt-4 border-t border-stone-200 text-center text-xs text-stone-500">
        <p>Documento gerado em {new Date().toLocaleString('pt-BR')}</p>
        <p>Este documento é válido como comprovante de serviços prestados</p>
      </div>
    </Card>
  );
}