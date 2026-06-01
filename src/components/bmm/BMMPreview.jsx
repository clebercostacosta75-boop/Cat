import React from "react";
import { Card } from "@/components/ui/card";
import ExcedentesDetailBlock from "@/components/bmm/ExcedentesDetailBlock";

export default function BMMPreview({ content }) {
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
        
        /* Ocultar apenas sidebar e header */
        #app-sidebar,
        #app-header {
          display: none !important;
        }
        
        /* Garantir que tudo seja impresso */
        body, html, * {
          visibility: visible !important;
        }
        
        body {
          background: white !important;
        }
        
        /* Container do BMM */
        #bmm-print-container {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Card */
        #bmm-print-container > div {
          box-shadow: none !important;
          border: none !important;
          padding: 10mm !important;
        }
        
        /* Tabela */
        table {
          width: 100% !important;
          font-size: 8.5pt !important;
          border-collapse: collapse !important;
        }
        
        th, td {
          padding: 3px 5px !important;
          border: 1px solid #ccc !important;
        }
        
        thead {
          background-color: #10b981 !important;
          color: white !important;
        }
        
        /* Textos */
        h1 { font-size: 14pt !important; }
        h2 { font-size: 10pt !important; }
        
        /* Imagens */
        img {
          max-height: 35px !important;
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

  if (!content) return null;

  const { company, contractor, period, classes, totals, template, additionalItems = [] } = content;
  const o = content.overrides || {};

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

  // Buscar contrato ativo da empresa (overrides têm prioridade)
  const activeContract = company?.company_contracts?.find(c => c.status === 'Ativo') || {};
  const contractNumber = o.contract_number ?? activeContract.contract_number;
  const amendmentNumber = o.amendment_number ?? activeContract.amendment_number;
  const contractObject = o.contract_object ?? company?.billing_info?.contract_object;
  const bmmTitle = o.title ?? "BOLETIM MENSAL DE MEDIÇÃO - BMM";
  const fiscalName = o.fiscal_name ?? company?.fiscal_name;
  const fiscalRole = o.fiscal_role ?? company?.fiscal_role;
  const contractManagerName = o.contract_manager_name ?? company?.contract_manager_name;
  const contractManagerRole = o.contract_manager_role ?? company?.contract_manager_role;

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
            {bmmTitle}
          </h1>
          <p className="text-lg text-stone-600 mt-1">
            Período: <strong>{period}</strong>
          </p>
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
                        {15}
                      </td>
                      <td className="border border-stone-300 px-3 py-2 text-right font-bold">
                        {formatCurrency(classItem.unit_value)}
                      </td>
                      <td className="border border-stone-300 px-3 py-2 text-right font-bold">
                        {formatCurrency(classItem.total_value)}
                      </td>
                    </tr>

                    {/* Serviços adicionais da Turma Fechada (Coffee Break Manhã, Tarde, Almoço) */}
                    {(() => {
                      const servicos = [];
                      const additionalServices = content?.company?.additional_services || {};
                      const limiteContratado = 15;
                      
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

                    {/* Subtotal Turma Fechada */}
                    {(() => {
                      const additionalServices = content?.company?.additional_services || {};
                      const limiteContratado = 15;
                      let subtotal = classItem.total_value;
                      
                      if (additionalServices.coffee_break_morning_enabled && additionalServices.coffee_break_morning_unit_value > 0) {
                        subtotal += limiteContratado * additionalServices.coffee_break_morning_unit_value;
                      }
                      if (additionalServices.coffee_break_afternoon_enabled && additionalServices.coffee_break_afternoon_unit_value > 0) {
                        subtotal += limiteContratado * additionalServices.coffee_break_afternoon_unit_value;
                      }
                      if (additionalServices.lunch_enabled && additionalServices.lunch_unit_value > 0) {
                        subtotal += limiteContratado * additionalServices.lunch_unit_value;
                      }
                      
                      return (
                        <tr className="bg-stone-100">
                          <td colSpan={2} className="border border-stone-300 px-3 py-2 font-bold text-stone-900">
                            Subtotal Turma Fechada
                          </td>
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-center font-bold">
                            {15}
                          </td>
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-bold">
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                      );
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

                        {/* Subtotal Excedentes */}
                        <tr className="bg-orange-100">
                          <td colSpan={2} className="border border-stone-300 px-3 py-2 font-bold text-orange-900">
                            Subtotal Excedentes
                          </td>
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-center font-bold text-orange-700">
                            {excedentesDaTurma[0]?.quantity || 0}
                          </td>
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-bold text-orange-900">
                            {formatCurrency(totalExcedentes)}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Total de Participantes Realizados */}
                    {(() => {
                      const additionalServices = content?.company?.additional_services || {};
                      const limiteContratado = 15;
                      let subtotalBase = classItem.total_value;
                      
                      if (additionalServices.coffee_break_morning_enabled && additionalServices.coffee_break_morning_unit_value > 0) {
                        subtotalBase += limiteContratado * additionalServices.coffee_break_morning_unit_value;
                      }
                      if (additionalServices.coffee_break_afternoon_enabled && additionalServices.coffee_break_afternoon_unit_value > 0) {
                        subtotalBase += limiteContratado * additionalServices.coffee_break_afternoon_unit_value;
                      }
                      if (additionalServices.lunch_enabled && additionalServices.lunch_unit_value > 0) {
                        subtotalBase += limiteContratado * additionalServices.lunch_unit_value;
                      }
                      
                      const totalGeral2 = subtotalBase + totalExcedentes;
                      
                      return (
                        <tr className="bg-emerald-100">
                          <td colSpan={2} className="border border-stone-300 px-3 py-2 font-bold text-emerald-900">
                            TOTAL DE PARTICIPANTES REALIZADOS
                          </td>
                          <td className="border border-stone-300 px-3 py-2"></td>
                          <td className="border border-stone-300 px-3 py-2 text-center font-bold text-emerald-900">
                            {(classItem.students_count || 0)}
                          </td>
                          <td className="border border-stone-300 px-3 py-2 font-bold text-emerald-900">
                            TOTAL GERAL
                          </td>
                          <td className="border border-stone-300 px-3 py-2 text-right font-bold text-emerald-900">
                            {formatCurrency(totalGeral2)}
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
            <tfoot>
              <tr className="bg-emerald-100 font-bold">
                <td colSpan={3} className="border border-stone-300 px-3 py-2 text-right">
                  TOTAIS:
                </td>
                <td className="border border-stone-300 px-3 py-2 text-center">
                  {classes.reduce((sum, c) => sum + (c.students_count || 0), 0)}
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
          <p className="text-sm text-stone-600">Valor Total do BMM</p>
          {totals.additionalValue > 0 && (
            <p className="text-xs text-amber-500 mt-1">
              Treinamentos: {formatCurrency(totals.trainingValue)} + Serviços: {formatCurrency(totals.additionalValue)}
            </p>
          )}
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