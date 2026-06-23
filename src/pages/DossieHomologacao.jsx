import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Building2, Users, BookOpen, Award, Calendar, Shield, CheckCircle, AlertTriangle, Clock, FileCheck, ChevronDown, ChevronUp, Printer, HardDrive, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function DossieHomologacao() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState(false);
  const [expandedBackend, setExpandedBackend] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('gerarDossieHomologacao', {});
      if (res.data && !res.data.error) setDados(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exportarPDF = () => {
    if (!dados) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 15;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('DOSSIÊ DE HOMOLOGAÇÃO', 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('CAT Soluções Integradas — Sistema de Treinamento', 105, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Gerado em: ${dados.gerado_em} | Por: ${dados.gerado_por}`, 105, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 8;

    // Resumo
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumo Geral do Sistema', 15, y);
    y += 8;

    const r = dados.resumo_geral;
    const resumoRows = [
      ['Empresas', `${r.empresas.total} (${r.empresas.ativas} ativas)`, 'Alunos', String(r.alunos.total)],
      ['Cursos', String(r.cursos.total), 'Instrutores', String(r.instrutores.total)],
      ['Turmas', String(r.turmas.total), 'Certificados', `${r.certificados.total} (${r.certificados_vencidos} vencidos)`],
      ['Contratos', String(r.contratos.total), 'Matriz (vínculos)', String(r.matriz_treinamentos.vinculos)],
      ['Funções', String(r.funcoes.total), 'Normas (NRs)', String(r.normas.total)],
      ['Usuários', String(r.usuarios.total), 'Homologações', String(r.homologacoes.total)],
      ['Auditoria', `${r.auditoria.registros} registros`, 'Leads', String(r.leads.total)],
    ];
    doc.autoTable({
      startY: y, margin: { left: 15 }, tableWidth: 180,
      head: [['Métrica', 'Valor', 'Métrica', 'Valor']],
      body: resumoRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 8;

    // Módulos
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`Módulos (${dados.modulos_operacionais}/${dados.total_modulos} operacionais)`, 15, y);
    y += 8;

    const modRows = dados.modulos.map(m => [m.nome, m.status === 'operacional' ? 'Operacional' : m.status, m.descricao]);
    doc.autoTable({
      startY: y, margin: { left: 15 }, tableWidth: 180,
      head: [['Módulo', 'Status', 'Descrição']],
      body: modRows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: { 1: { halign: 'center' } },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 8;

    // Sistema
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Entidades: ${dados.entidades} (${dados.entidades_com_dados} com dados) | Backend Functions: ${dados.funcoes_backend}`, 15, y);
    y += 6;
    doc.text(`Conformidade: ${dados.status_conformidade.requer_atencao}`, 15, y);
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Documento gerado automaticamente pelo sistema CAT Soluções Integradas. Versão 1.0.', 105, y, { align: 'center' });

    doc.save(`Dossie_Homologacao_CAT_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const imprimir = () => { window.print(); };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Coletando dados do sistema...</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Erro ao carregar o dossiê</p>
        <p className="text-gray-400 text-sm mt-1">Verifique a conexão e tente novamente</p>
        <Button onClick={load} variant="outline" className="mt-4 gap-2"><RefreshCw className="w-4 h-4" />Tentar novamente</Button>
      </div>
    );
  }

  const r = dados.resumo_geral;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-indigo-600" />
            Dossiê de Homologação
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerado em {dados.gerado_em} por {dados.gerado_por}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button onClick={exportarPDF} size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
            <Download className="w-4 h-4" />Exportar PDF
          </Button>
          <Button onClick={imprimir} size="sm" variant="outline" className="gap-1.5">
            <Printer className="w-4 h-4" />Imprimir
          </Button>
          <Button onClick={load} size="sm" variant="ghost" className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{dados.modulos_operacionais}/{dados.total_modulos}</p>
              <p className="text-xs text-green-600">Módulos Operacionais</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{dados.entidades}</p>
              <p className="text-xs text-blue-600">Entidades ({dados.entidades_com_dados} c/ dados)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-700">{dados.funcoes_backend}</p>
              <p className="text-xs text-purple-600">Funções Backend</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border ${dados.status_conformidade.certificados_vencidos > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {dados.status_conformidade.certificados_vencidos > 0 ? (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            ) : (
              <Shield className="w-8 h-8 text-green-600" />
            )}
            <div>
              <p className={`text-sm font-bold ${dados.status_conformidade.certificados_vencidos > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {dados.status_conformidade.requer_atencao}
              </p>
              <p className="text-xs text-gray-500">Conformidade</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Geral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Resumo Geral do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Metrica icon={Building2} label="Empresas" value={`${r.empresas.total} (${r.empresas.ativas} ativas)`} color="blue" />
            <Metrica icon={Users} label="Alunos" value={r.alunos.total} color="indigo" />
            <Metrica icon={BookOpen} label="Cursos" value={r.cursos.total} color="purple" />
            <Metrica icon={Users} label="Instrutores" value={r.instrutores.total} color="green" />
            <Metrica icon={Calendar} label="Turmas" value={r.turmas.total} color="amber" />
            <Metrica icon={Award} label="Certificados" value={`${r.certificados.total}`} color="rose" />
            <Metrica icon={FileText} label="Contratos" value={r.contratos.total} color="teal" />
            <Metrica icon={Shield} label="Matriz" value={`${r.matriz_treinamentos.vinculos} vínculos`} color="orange" />
            <Metrica icon={Users} label="Funções" value={r.funcoes.total} color="cyan" />
            <Metrica icon={Shield} label="NRs" value={r.normas.total} color="red" />
            <Metrica icon={Users} label="Usuários" value={r.usuarios.total} color="slate" />
            <Metrica icon={CheckCircle} label="Homologações" value={r.homologacoes.total} color="emerald" />
            <Metrica icon={Clock} label="Auditoria" value={`${r.auditoria.registros}`} color="gray" />
            <Metrica icon={Users} label="Leads" value={r.leads.total} color="violet" />
          </div>

          {/* Status detalhado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Certificados por Status</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(r.certificados.por_status).map(([status, count]) => (
                  <Badge key={status} className={status === 'active' ? 'bg-green-100 text-green-700' : status === 'expired' ? 'bg-red-100 text-red-700' : status === 'pending_signature' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}>
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Turmas por Status</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(r.turmas.por_status).map(([status, count]) => (
                  <Badge key={status} className={status === 'Concluído' ? 'bg-green-100 text-green-700' : status === 'Agendado' ? 'bg-blue-100 text-blue-700' : status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}>
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Módulos */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedModules(!expandedModules)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-600" />
              Módulos do Sistema ({dados.modulos_operacionais}/{dados.total_modulos})
            </CardTitle>
            {expandedModules ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </CardHeader>
        {expandedModules && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {dados.modulos.map((m, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-white">
                  <div className={`w-2 h-2 rounded-full ${m.status === 'operacional' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.nome}</p>
                    <p className="text-[10px] text-gray-400 truncate">{m.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Infraestrutura */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedBackend(!expandedBackend)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Infraestrutura Técnica
            </CardTitle>
            {expandedBackend ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </CardHeader>
        {expandedBackend && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Entidades ({dados.entidades} total, {dados.entidades_com_dados} com dados)</h4>
              <p className="text-xs text-gray-500">Company, Student, Course, CourseCategory, Instructor, ClassSchedule, AgendaTreinamento, Certificate, CertificateModel, Contract, ContractTemplate, BMMRecord, BMMTemplate, Homologacao, MatrizTreinamento, FuncaoCargo, NormaRegulamentadora, UserProfile, AuditLog, AccessLog e outras entidades auxiliares.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Backend Functions ({dados.funcoes_backend})</h4>
              <div className="flex flex-wrap gap-1.5">
                {['alertarVencimentoCertificados', 'enviarCertificadoWhatsApp', 'gerarContrato', 'assinarContrato', 'finalizarTurma', 'gerarRecibo', 'whatsappWebhook', 'backupAutomatico', 'validarIntegridadeDados', 'verificarConformidadeMatriz', 'processarDocumentoOCR', 'bloquearCertificadosExpirados', 'gerenciarPrazoDownloadCertificado', 'reenviarLinkAssinatura48h'].map(fn => (
                  <Badge key={fn} variant="outline" className="text-[10px] border-gray-200 text-gray-600 font-mono">{fn}</Badge>
                ))}
                <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-400">+{dados.funcoes_backend - 14} outras</Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Rodapé */}
      <div className="text-center text-xs text-gray-400 pb-6 no-print">
        Documento gerado automaticamente — CAT Soluções Integradas — Versão 1.0
      </div>

      {/* CSS para impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .p-6 { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function Metrica({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-50 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-50 text-gray-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color] || colors.indigo}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-[10px] text-gray-400">{label}</p>
      </div>
    </div>
  );
}