import React from "react";
import { Card } from "@/components/ui/card";

export default function BMMPreview({ content }) {
  if (!content) return null;

  const { company, contractor, period, classes, totals, template } = content;

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
    <Card className="border-none shadow-xl bg-white p-8">
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
      <div className="border-t-2 border-stone-200 pt-6 mt-8">
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