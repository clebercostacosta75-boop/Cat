import React from "react";
import { Card } from "@/components/ui/card";
import ExcedentesDetailBlock from "@/components/bmm/ExcedentesDetailBlock";

export default function BMMPreview({ content }) {
  // Adicionar estilos de impressão A4 Vertical (ABNT/NBR)
  React.useEffect(() => {
    const style = document.createElement('style');
    style.id = 'bmm-print-styles';
    style.textContent = `
      @page {
        size: A4 portrait;
        margin: 20mm;
      }
      
      @media print {
        * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* Ocultar sidebar e header */
        #app-sidebar,
        #app-header {
          display: none !important;
        }
        
        /* Resetar estilo padrão */
        body, html {
          visibility: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          width: 100% !important;
          height: 100% !important;
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
          color: #000 !important;
          line-height: 1.15 !important;
        }
        
        /* Container - Margens ABNT: 20mm */
        #bmm-print-container {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
        }
        
        #bmm-print-container > div {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        
        /* Fontes - ABNT/NBR */
        h1 {
          font-family: Arial, sans-serif !important;
          font-size: 14pt !important;
          font-weight: bold !important;
          text-align: center !important;
          margin: 0 0 8px 0 !important;
          page-break-after: avoid !important;
        }
        
        h2 {
          font-family: Arial, sans-serif !important;
          font-size: 11pt !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          margin: 12px 0 8px 0 !important;
          page-break-after: avoid !important;
        }
        
        p {
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
          margin: 2px 0 2px 0 !important;
          line-height: 1.15 !important;
        }
        
        /* Tabelas - ABNT: 8-9pt */
        table {
          width: 100% !important;
          font-family: Arial, sans-serif !important;
          font-size: 8.5pt !important;
          border-collapse: collapse !important;
          page-break-inside: avoid !important;
          margin: 8px 0 8px 0 !important;
        }
        
        thead {
          background-color: #10b981 !important;
          color: white !important;
          font-weight: bold !important;
          page-break-after: avoid !important;
        }
        
        th {
          padding: 3px 4px !important;
          border: 1px solid #333 !important;
          text-align: left !important;
          font-weight: bold !important;
          font-size: 8.5pt !important;
        }
        
        td {
          padding: 2px 4px !important;
          border: 0.5px solid #666 !important;
          font-size: 8.5pt !important;
        }
        
        /* Seções de dados */
        .bg-stone-50 {
          page-break-inside: avoid !important;
          margin: 8px 0 8px 0 !important;
          padding: 6px !important;
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
        }
        
        /* Grid de totais */
        .grid {
          page-break-inside: avoid !important;
          margin: 8px 0 8px 0 !important;
        }
        
        /* Imagens */
        img {
          max-height: 30px !important;
          page-break-inside: avoid !important;
        }
        
        /* Assinaturas */
        .signature-section {
          page-break-inside: avoid !important;
          margin: 12px 0 0 0 !important;
          padding-top: 8px !important;
          border-top: 1px solid #ccc !important;
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
        }
        
        /* Rodapé */
        footer, .mt-8 {
          page-break-before: avoid !important;
          margin-top: 8px !important;
          padding-top: 6px !important;
          border-top: 1px solid #ccc !important;
          font-family: Arial, sans-serif !important;
          font-size: 8pt !important;
          text-align: center !important;
        }
        
        /* Desativar margens padrão */
        .mb-6 { margin-bottom: 8px !important; }
        .mt-4 { margin-top: 8px !important; }
        .pt-6 { padding-top: 6px !important; }
        .pb-6 { padding-bottom: 6px !important; }
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

  if (!content) return null;

  const { company, contractor, period, classes, totals, template, additionalItems = [] } = content;
  const o = content.overrides || {};

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatCurrencyByExtent = (value) => {
    const num = Math.floor(value);
    const cents = Math.round((value - num) * 100);
    
    const ones = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const scales = ['', 'mil', 'milhão', 'bilhão', 'trilhão'];

    const convertBelowThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const t = Math.floor(n / 10);
        const o = n % 10;
        return o === 0 ? tens[t] : tens[t] + ' e ' + ones[o];
      }
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      const hundreds = h === 1 ? 'cento' : ones[h] + 'centos';
      return remainder === 0 ? hundreds : hundreds + ' e ' + convertBelowThousand(remainder);
    };

    const convertToWords = (n) => {
      if (n === 0) return 'zero';
      let words = [];
      let scaleIndex = 0;
      while (n > 0) {
        const group = n % 1000;
        if (group !== 0) {
          const groupWords = convertBelowThousand(group);
          if (scales[scaleIndex]) {
            if (group === 1 && scaleIndex > 1) {
              words.unshift(scales[scaleIndex]);
            } else if (scaleIndex === 1 && group === 1) {
              words.unshift('mil');
            } else {
              words.unshift(groupWords + ' ' + scales[scaleIndex]);
            }
          } else {
            words.unshift(groupWords);
          }
        }
        n = Math.floor(n / 1000);
        scaleIndex++;
      }
      return words.filter(w => w).join(' ').trim();
    };

    const reaisText = convertToWords(num);
    const centsText = cents === 0 ? '' : ` e ${convertToWords(cents)} centavo${cents === 1 ? '' : 's'}`;
    return reaisText + (centsText ? centsText : '');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Buscar contrato ativo da empresa (overrides têm prioridade)
  const activeContract = company?.company_contracts?.find(c => c.status === 'Ativo') || {};
  const bmmNumber = o.bmm_number ?? "";
  const contractNumber = o.contract_number ?? activeContract.contract_number;
  const amendmentNumber = o.amendment_number ?? activeContract.amendment_number;
  const contractObject = o.contract_object ?? company?.billing_info?.contract_object;
  const bmmTitle = o.title ?? "BOLETIM MENSAL DE MEDIÇÃO - BMM";
  const fiscalName = o.fiscal_name ?? company?.fiscal_name;
  const fiscalRole = o.fiscal_role ?? company?.fiscal_role;
  const contractManagerName = o.contract_manager_name ?? company?.contract_manager_name;
  const contractManagerRole = o.contract_manager_role ?? company?.contract_manager_role;

  // Detectar se empresa tem SAP habilitado (UNITAPAJÓS ou outra com config)
  const hasSAPConfig = company?.sap_config?.enabled || company?.nome_fantasia === 'UNITAPAJÓS';

  // Função para obter dados SAP baseado na modalidade
  const getSAPData = (classItem) => {
    if (!hasSAPConfig) return null;

    const sapCfg = company?.sap_config || {};
    const codigoMaterialPai = sapCfg.codigo_material_pai || '2010000491';
    
    // Normalizar modalidade (comparar presencial vs ead)
    const modality = (classItem.category || classItem.modality || '').toLowerCase();
    const isPresencial = modality.includes('presencial');
    
    if (isPresencial) {
      return {
        codigo_material: codigoMaterialPai,
        codigo_servico: sapCfg.presencial?.codigo_servico_filho || '3012507',
        descricao: sapCfg.presencial?.descricao || 'Serv. Treinamento\nFuncionário / Serv.\nTreinamento de NR'
      };
    } else {
      return {
        codigo_material: codigoMaterialPai,
        codigo_servico: sapCfg.ead?.codigo_servico_filho || '3012506',
        descricao: sapCfg.ead?.descricao || 'Serv. Treinamento\nFuncionário / Serv.\nTreinamento de NR'
      };
    }
  };

  return (
    <Card id="bmm-print-container" className="border-none shadow-xl bg-white p-8 print:shadow-none print:border-0 print:p-0">
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
            {bmmTitle}
          </h1>
          <p className="text-lg text-stone-600 mt-1">
            Período: <strong>{period}</strong>
          </p>
          {bmmNumber && (
            <p className="text-sm text-stone-600 mt-1">
              <strong>Nº:</strong> {bmmNumber}
            </p>
          )}
          {(contractNumber || amendmentNumber) && (
            <div className="text-sm text-stone-600 mt-2">
              <p>
                {contractNumber && <><strong>Contrato:</strong> {contractNumber}</>}
                {amendmentNumber && <span> | <strong>Aditivo:</strong> {amendmentNumber}</span>}
              </p>
              {contractObject && <p><strong>Objeto:</strong> {contractObject}</p>}
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
             {(hasSAPConfig && company?.sap_config?.codigo_material_pai) || company?.nome_fantasia === 'UNITAPAJÓS' ? (
               <p><strong>Código Material (PAI) - SAP:</strong> {company?.sap_config?.codigo_material_pai || '2010000491'}</p>
             ) : null}
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

      {/* Bloco de Detalhamento de Excedentes */}
      <ExcedentesDetailBlock classes={classes} additionalItems={additionalItems} />

      {/* Tabela de Treinamentos */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-stone-900 mb-3">DEMONSTRATIVO DE TREINAMENTOS</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="border border-emerald-700 px-3 py-2 text-left">Nº</th>
                <th className="border border-emerald-700 px-3 py-2 text-left">Treinamento / Datas de Realização</th>
                <th className="border border-emerald-700 px-3 py-2 text-center">C.H.</th>
                <th className="border border-emerald-700 px-3 py-2 text-center">Qtd. Alunos</th>
                <th className="border border-emerald-700 px-3 py-2 text-right">Valor Unit. / Turma</th>
                <th className="border border-emerald-700 px-3 py-2 text-right">Valor Total</th>
                {hasSAPConfig && (
                  <>
                    <th className="border border-emerald-700 px-3 py-2 text-center text-xs">Código Material (PAI) - SAP</th>
                    <th className="border border-emerald-700 px-3 py-2 text-center text-xs">Código Serviço (FILHO) - SAP</th>
                    <th className="border border-emerald-700 px-3 py-2 text-left text-xs">Descrição SAP</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem, index) => {
                const excedentesDaTurma = additionalItems.filter(
                  item => item.class_id === classItem.id && item.type === 'excedente_alunos'
                );
                
                const servicosExcedentesDaTurma = additionalItems.filter(
                  item => item.parent_excedente_id === classItem.id
                );

                const totalExcedentes = excedentesDaTurma.reduce((sum, e) => sum + e.total_value, 0) +
                                       servicosExcedentesDaTurma.reduce((sum, s) => sum + s.total_value, 0);

                const totalGeral = classItem.total_value + totalExcedentes;

                return (
                  <React.Fragment key={index}>
                    {/* Treinamento principal */}
                    {(() => {
                      const sapData = getSAPData(classItem);
                      return (
                        <tr className="bg-white">
                          <td className="border border-stone-300 px-3 py-2 font-bold">{index + 1}</td>
                          <td className="border border-stone-300 px-3 py-2 font-bold text-stone-900">
                            <div>{classItem.training_name} – Turma Fechada</div>
                            {classItem.realization_dates && classItem.realization_dates.length > 0 && (
                              <div className="text-xs text-stone-600 mt-1">
                                📅 {classItem.realization_dates.map(d => formatDate(d)).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-center font-bold">
                            {classItem.duration_hours || 0}h
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-center font-bold">
                            {classItem.students_count || 0}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-bold">
                            {formatCurrency(classItem.unit_value)}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-bold">
                            {formatCurrency(classItem.total_value)}
                          </td>
                          {hasSAPConfig && sapData && (
                            <>
                              <td className="border border-stone-300 px-3 py-2 text-center text-xs font-mono">
                                {sapData.codigo_material}
                              </td>
                              <td className="border border-stone-300 px-3 py-2 text-center text-xs font-mono">
                                {sapData.codigo_servico}
                              </td>
                              <td className="border border-stone-300 px-3 py-2 text-xs">
                                {sapData.descricao}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })()}

                    {/* Serviços adicionais da Turma Fechada (Coffee Break Manhã, Tarde, Almoço) */}
                    {(() => {
                      const servicos = [];
                      const additionalServices = content?.company?.additional_services || {};
                      const limiteContratado = classItem.students_count || 15;
                      
                      if (additionalServices.coffee_break_morning_enabled && additionalServices.coffee_break_morning_unit_value > 0) {
                        servicos.push({
                          description: `Coffee Break Manhã – Turma Fechada`,
                          quantity: limiteContratado,
                          unit_value: additionalServices.coffee_break_morning_unit_value,
                          total_value: limiteContratado * additionalServices.coffee_break_morning_unit_value
                        });
                      }
                      
                      if (additionalServices.coffee_break_afternoon_enabled && additionalServices.coffee_break_afternoon_unit_value > 0) {
                        servicos.push({
                          description: `Coffee Break Tarde – Turma Fechada`,
                          quantity: limiteContratado,
                          unit_value: additionalServices.coffee_break_afternoon_unit_value,
                          total_value: limiteContratado * additionalServices.coffee_break_afternoon_unit_value
                        });
                      }
                      
                      if (additionalServices.lunch_enabled && additionalServices.lunch_unit_value > 0) {
                        servicos.push({
                          description: `Almoço – Turma Fechada`,
                          quantity: limiteContratado,
                          unit_value: additionalServices.lunch_unit_value,
                          total_value: limiteContratado * additionalServices.lunch_unit_value
                        });
                      }
                      
                      return servicos.map((servico, svcIdx) => (
                        <tr key={`svc-base-${index}-${svcIdx}`} className="bg-white">
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-stone-700">
                            {servico.description}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-center">—</td>
                          <td className="border border-stone-300 px-3 py-2 text-center">
                            {servico.quantity}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-right">
                            {formatCurrency(servico.unit_value)}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-semibold">
                            {formatCurrency(servico.total_value)}
                          </td>
                        </tr>
                      ));
                    })()}

                    {/* Excedentes Aplicados - Seção */}
                    {excedentesDaTurma.length > 0 && (
                      <>
                        <tr className="bg-orange-50">
                          <td colSpan={6} className="border border-stone-300 px-3 py-2 font-bold text-orange-900">
                            Excedentes Aplicados
                          </td>
                        </tr>

                        {/* Participantes Excedentes */}
                        {excedentesDaTurma.map((excedente, excIdx) => (
                          <tr key={`exc-${index}-${excIdx}`} className="bg-white">
                            <td className="border border-stone-300 px-3 py-2"></td>
                            <td className="border border-stone-300 px-3 py-2 text-stone-900">
                              ↳ {excedente.description}
                            </td>
                            <td className="border border-stone-300 px-3 py-2 text-center">—</td>
                            <td className="border border-stone-300 px-3 py-2 text-center text-orange-700 font-semibold">
                              {excedente.quantity}
                            </td>
                            <td className="border border-stone-300 px-3 py-2 text-right text-orange-700">
                              {formatCurrency(excedente.unit_value)}
                            </td>
                            <td className="border border-stone-300 px-3 py-2 text-right font-semibold text-orange-700">
                              {formatCurrency(excedente.total_value)}
                            </td>
                          </tr>
                        ))}

                        {/* Serviços excedentes */}
                        {servicosExcedentesDaTurma.map((servico, svcIdx) => (
                          <tr key={`svc-${index}-${svcIdx}`} className="bg-white">
                            <td className="border border-stone-300 px-3 py-2"></td>
                            <td className="border border-stone-300 px-3 py-2 text-stone-700">
                              ↳ {servico.description}
                            </td>
                            <td className="border border-stone-300 px-3 py-2 text-center">—</td>
                            <td className="border border-stone-300 px-3 py-2 text-center text-orange-700">
                              {servico.quantity}
                            </td>
                            <td className="border border-stone-300 px-3 py-2 text-right text-orange-700">
                              {formatCurrency(servico.unit_value)}
                            </td>
                            <td className="border border-stone-300 px-3 py-2 text-right font-semibold text-orange-700">
                              {formatCurrency(servico.total_value)}
                            </td>
                          </tr>
                        ))}


                      </>
                    )}

                    {/* Total Final da Turma */}
                    {(() => {
                      const additionalServices = content?.company?.additional_services || {};
                      const limiteContratado = classItem.students_count || 15;
                      let totalTurma = classItem.total_value;
                      
                      if (additionalServices.coffee_break_morning_enabled && additionalServices.coffee_break_morning_unit_value > 0) {
                        totalTurma += limiteContratado * additionalServices.coffee_break_morning_unit_value;
                      }
                      if (additionalServices.coffee_break_afternoon_enabled && additionalServices.coffee_break_afternoon_unit_value > 0) {
                        totalTurma += limiteContratado * additionalServices.coffee_break_afternoon_unit_value;
                      }
                      if (additionalServices.lunch_enabled && additionalServices.lunch_unit_value > 0) {
                        totalTurma += limiteContratado * additionalServices.lunch_unit_value;
                      }
                      
                      const totalFinal = totalTurma + totalExcedentes;
                      
                      return (
                        <tr className="bg-emerald-100">
                          <td colSpan={4} className="border border-stone-300 px-3 py-2 font-bold text-emerald-900">
                            TOTAL
                          </td>
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-bold text-emerald-900">
                            {formatCurrency(totalFinal)}
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })}

              {/* Serviços adicionais de cobrança por aluno (não-excedentes) */}
              {(() => {
                const servicosPorAluno = additionalItems.filter(
                  item => !item.parent_excedente_id && item.type !== 'excedente_alunos'
                );
                
                if (servicosPorAluno.length === 0) return null;

                const grouped = {};
                for (const item of servicosPorAluno) {
                  if (!grouped[item.type]) {
                    grouped[item.type] = {
                      type: item.type,
                      description: item.description,
                      unit_value: item.unit_value,
                      quantity: 0,
                      total_value: 0,
                    };
                  }
                  grouped[item.type].quantity += item.quantity;
                  grouped[item.type].total_value += item.total_value;
                }

                return Object.values(grouped).map((item, idx) => (
                  <tr key={`add-${idx}`} className="bg-amber-50">
                    <td className="border border-stone-300 px-3 py-2"></td>
                    <td className="border border-stone-300 px-3 py-2 font-medium text-amber-800">
                      {item.description}
                    </td>
                    <td className="border border-stone-300 px-3 py-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="border border-stone-300 px-3 py-2 text-right">
                      {formatCurrency(item.unit_value)}
                    </td>
                    <td className="border border-stone-300 px-3 py-2 text-right font-semibold text-amber-700">
                      {formatCurrency(item.total_value)}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo */}
      {(() => {
        // Recalcular totais considerando Turma Fechada + Excedentes
        let totalTreinamento = 0;
        let totalServicos = 0;

        classes.forEach(classItem => {
          const excedentesDaTurma = additionalItems.filter(
            item => item.class_id === classItem.id && item.type === 'excedente_alunos'
          );
          const servicosExcedentesDaTurma = additionalItems.filter(
            item => item.parent_excedente_id === classItem.id
          );

          // Valor da turma base
          totalTreinamento += classItem.total_value;

          // Serviços da turma fechada
          const additionalServices = content?.company?.additional_services || {};
          const limiteContratado = classItem.students_count || 0;

          if (additionalServices.coffee_break_morning_enabled && additionalServices.coffee_break_morning_unit_value > 0) {
            totalServicos += limiteContratado * additionalServices.coffee_break_morning_unit_value;
          }
          if (additionalServices.coffee_break_afternoon_enabled && additionalServices.coffee_break_afternoon_unit_value > 0) {
            totalServicos += limiteContratado * additionalServices.coffee_break_afternoon_unit_value;
          }
          if (additionalServices.lunch_enabled && additionalServices.lunch_unit_value > 0) {
            totalServicos += limiteContratado * additionalServices.lunch_unit_value;
          }

          // Excedentes (alunos + serviços)
          excedentesDaTurma.forEach(exc => {
            totalTreinamento += exc.total_value;
          });
          servicosExcedentesDaTurma.forEach(svc => {
            totalServicos += svc.total_value;
          });
        });

        const totalGeral = totalTreinamento + totalServicos;

        return (
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
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalGeral)}</p>
              <p className="text-xs text-stone-500 mt-2 italic">
                {formatCurrencyByExtent(totalGeral)} reais
              </p>
              <p className="text-sm text-stone-600 mt-2">Valor Total do BMM</p>
            </div>
          </div>
        );
      })()}

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
              <p className="text-sm text-stone-600">{fiscalName || '______________________________'}</p>
              {fiscalRole && <p className="text-xs text-stone-500 mt-1">{fiscalRole}</p>}
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-stone-400 w-64 mx-auto pt-2">
              <p className="font-semibold text-stone-900">GESTOR DO CONTRATO</p>
              <p className="text-sm text-stone-600">{contractManagerName || '______________________________'}</p>
              {contractManagerRole && <p className="text-xs text-stone-500 mt-1">{contractManagerRole}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Observações do editor */}
      {o.notes && (
        <div className="mt-4 p-3 bg-stone-50 rounded border border-stone-200 text-sm text-stone-700">
          <strong>Observações:</strong> {o.notes}
        </div>
      )}

      {/* Rodapé */}
      <div className="mt-8 pt-4 border-t border-stone-200 text-center text-xs text-stone-500">
        <p>Documento gerado em {new Date().toLocaleString('pt-BR')}</p>
        <p>Este documento é válido como comprovante de serviços prestados</p>
      </div>
    </Card>
  );
}