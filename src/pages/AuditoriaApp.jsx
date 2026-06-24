import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertTriangle, XCircle, Search, ChevronDown, ChevronRight } from "lucide-react";

// ─── Dados de Auditoria ────────────────────────────────────────────────────────
const MODULOS = [
  {
    grupo: "🎓 TREINAMENTOS & CERTIFICAÇÕES",
    cor: "blue",
    itens: [
      { nome: "Cronograma de Turmas (Schedule)", status: "homologado", descricao: "Criação, edição e gestão de turmas com datas, instrutores e clientes.", falta: [] },
      { nome: "Chamada Presencial (AttendanceCall)", status: "homologado", descricao: "Controle de presença com QR Code e registro diário.", falta: [] },
      { nome: "Gestão de Cursos (Courses)", status: "homologado", descricao: "Cadastro de cursos, carga horária, modalidade e conteúdo programático.", falta: [] },
      { nome: "Gestão de Instrutores (Instructors)", status: "homologado", descricao: "Cadastro de instrutores, qualificações e documentos.", falta: [] },
      { nome: "Agenda de Treinamentos (AgendaTreinamentos)", status: "homologado", descricao: "Calendário visual de treinamentos agendados.", falta: [] },
      { nome: "Matriz NR × Função (MatrizTreinamentos)", status: "parcial", descricao: "Matriz de treinamentos obrigatórios por função e NR.", falta: ["Integração automática com PGR extraído", "Conciliação com PCMSO"] },
      { nome: "Agendamento de Treinamentos SST", status: "parcial", descricao: "Agendamento de treinamentos SST vinculados às empresas.", falta: ["Notificação automática ao instrutor", "Integração calendário externo"] },
      { nome: "Solicitação de Treinamento (Empresa)", status: "pronto", descricao: "Portal para empresa solicitar treinamentos.", falta: [] },
    ]
  },
  {
    grupo: "📜 CERTIFICADOS",
    cor: "green",
    itens: [
      { nome: "Emissão de Certificados (CertificateEmissao)", status: "homologado", descricao: "Emissão individual e em massa com layout personalizado.", falta: [] },
      { nome: "Assinatura Digital de Certificados", status: "homologado", descricao: "Link de assinatura com expiração de 7 dias, IP e user-agent registrados.", falta: [] },
      { nome: "Validação Pública (/CertificateValidate)", status: "homologado", descricao: "Página pública de validação por código.", falta: [] },
      { nome: "Portal do Aluno (/StudentPortal)", status: "homologado", descricao: "Busca por CPF, download, carteira digital e QR Code.", falta: [] },
      { nome: "Alertas de Vencimento (CertificateAlerts)", status: "homologado", descricao: "Alertas automáticos por email e WhatsApp.", falta: [] },
      { nome: "Auditoria de Certificados", status: "homologado", descricao: "Painel de auditoria com histórico de ações.", falta: [] },
      { nome: "Designer de Certificados (CertDesigner)", status: "homologado", descricao: "Editor visual de layouts de certificados.", falta: [] },
      { nome: "Bloqueio por prazo (gerenciarPrazoDownload)", status: "homologado", descricao: "Bloqueio automático de download após prazo.", falta: [] },
      { nome: "Reemissão com controle de versão", status: "parcial", descricao: "Reemissão registrando versão anterior.", falta: ["UI de reemissão não exposta ao usuário final"] },
    ]
  },
  {
    grupo: "🏢 EMPRESAS & CLIENTES",
    cor: "purple",
    itens: [
      { nome: "Gestão de Empresas (Companies)", status: "homologado", descricao: "Cadastro completo de empresas clientes com contratos e cursos.", falta: [] },
      { nome: "Portal da Empresa (/CompanyPortal)", status: "homologado", descricao: "Acesso via CNPJ: certificados, colaboradores, documentos.", falta: [] },
      { nome: "Central de Empresas Mestre (EmpresaMestre)", status: "homologado", descricao: "Cadastro mestre identificado por CNPJ para o módulo SST.", falta: [] },
      { nome: "Gestão de Contratadas (Contractors)", status: "homologado", descricao: "Cadastro de empresas contratadas.", falta: [] },
      { nome: "Usuários por Empresa (UsuarioEmpresa)", status: "parcial", descricao: "Vínculo de usuários às empresas no módulo SST.", falta: ["Interface de gestão de usuários por empresa ainda limitada"] },
    ]
  },
  {
    grupo: "👥 ALUNOS & COLABORADORES",
    cor: "orange",
    itens: [
      { nome: "Alunos Individuais PF (GestaoAlunosIndividuais)", status: "homologado", descricao: "Cadastro de alunos PF com matrícula, pagamento e histórico.", falta: [] },
      { nome: "Auto-Cadastro de Aluno (/AutoCadastroAluno)", status: "homologado", descricao: "Formulário público de auto-cadastro.", falta: [] },
      { nome: "Prontuário Digital (ColaboradoresSST)", status: "homologado", descricao: "Ficha completa do colaborador SST com histórico médico.", falta: [] },
      { nome: "Documentos do Aluno (GestaoDocumentosAluno)", status: "homologado", descricao: "Upload e gestão de documentos por aluno.", falta: [] },
      { nome: "Timeline do Aluno (StudentTimeline)", status: "parcial", descricao: "Histórico de eventos do aluno.", falta: ["Não há página dedicada — embutida nas abas"] },
    ]
  },
  {
    grupo: "🛡️ SST — SEGURANÇA E SAÚDE DO TRABALHO",
    cor: "red",
    itens: [
      { nome: "Dashboard SST (DashboardSST)", status: "homologado", descricao: "Painel central do módulo SST com KPIs e alertas.", falta: [] },
      { nome: "PGR — Leitura Inteligente", status: "homologado", descricao: "Upload PDF → IA extrai 15 módulos completos (setores, GHE, riscos, EPIs, treinamentos, plano de ação).", falta: [] },
      { nome: "PCMSO — Leitura Inteligente", status: "homologado", descricao: "Upload PDF → IA extrai matriz de exames, médico, revisões.", falta: [] },
      { nome: "Conferência PGR × PCMSO", status: "pronto", descricao: "Tela de comparação e conciliação de dados entre PGR e PCMSO.", falta: ["Recém criado — aguardando teste em produção"] },
      { nome: "Conciliação CNPJ (dedup empresas)", status: "homologado", descricao: "Ao importar PGR/PCMSO, identifica empresa existente por CNPJ e nunca cria duplicata.", falta: [] },
      { nome: "LTCAT Detalhe", status: "parcial", descricao: "Módulo de LTCAT com dados básicos.", falta: ["Extração IA do PDF do LTCAT não implementada", "Sem integração automática com PPP"] },
      { nome: "Gestão de Exames Complementares", status: "homologado", descricao: "Registro, alertas de vencimento e filtros.", falta: [] },
      { nome: "ASO — Atestado de Saúde Ocupacional", status: "parcial", descricao: "Registro de ASOs com tipos e resultado.", falta: ["Sem extração IA do PDF do ASO", "Sem geração automática de ASO vinculada ao PCMSO"] },
      { nome: "eSocial S-2220 (estrutura)", status: "falta", descricao: "Exportação dos dados de ASO para o eSocial.", falta: ["Módulo não implementado", "Necessário mapear campos obrigatórios S-2220", "Validação de CRM, RQE e empresa elaboradora"] },
      { nome: "CAT — Comunicado de Acidente", status: "falta", descricao: "Registro de acidentes de trabalho.", falta: ["Entidade não criada", "Módulo não implementado"] },
      { nome: "PPP — Perfil Profissiográfico", status: "falta", descricao: "Geração do PPP por trabalhador.", falta: ["Módulo não implementado", "Depende de LTCAT + PGR + PCMSO integrados"] },
    ]
  },
  {
    grupo: "🦺 EPI — EQUIPAMENTOS DE PROTEÇÃO",
    cor: "yellow",
    itens: [
      { nome: "Cadastro de EPIs (EPICadastroTab)", status: "homologado", descricao: "Cadastro de EPIs com CA, fabricante e validade.", falta: [] },
      { nome: "Estoque de EPI (EPIEstoqueTab)", status: "homologado", descricao: "Controle de entrada e saída do estoque.", falta: [] },
      { nome: "Entregas de EPI (EPIEntregasTab)", status: "homologado", descricao: "Registro de entregas com assinatura digital.", falta: [] },
      { nome: "EPI por Função (EPIFuncaoMatrizTab)", status: "homologado", descricao: "Matriz de EPIs obrigatórios por função.", falta: [] },
      { nome: "Fichas de EPI por Colaborador (EPIFichasTab)", status: "homologado", descricao: "Histórico de entregas por colaborador.", falta: [] },
      { nome: "Alertas de Vencimento de CA (EPIVencimentosTab)", status: "homologado", descricao: "Controle de vencimento de CAs.", falta: [] },
      { nome: "Integração PGR → EPI", status: "parcial", descricao: "EPIs extraídos do PGR alimentam o cadastro de EPIs.", falta: ["Sem dedup automático por CA", "Não vincula ao EPIEstoque"] },
    ]
  },
  {
    grupo: "📄 DOCUMENTOS SST",
    cor: "slate",
    itens: [
      { nome: "DocumentoPGR (entidade legado)", status: "parcial", descricao: "Entidade antiga antes da LeituraInteligente.", falta: ["Há duas entidades para PGR: DocumentoPGR e PGRLeitura — unificação pendente"] },
      { nome: "DocumentoPCMSO", status: "homologado", descricao: "Entidade de PCMSO vinculada ao EmpresaMestre via CNPJ.", falta: [] },
      { nome: "DocumentoLTCAT", status: "parcial", descricao: "Entidade básica de LTCAT.", falta: ["Sem extração inteligente via IA"] },
      { nome: "DocumentoASA", status: "falta", descricao: "Análise de Segurança de Atividade (ASA).", falta: ["Entidade existe mas sem módulo de gestão"] },
      { nome: "Dossiê de Homologação", status: "homologado", descricao: "Geração automática de dossiê com todos os documentos de homologação.", falta: [] },
    ]
  },
  {
    grupo: "💰 FINANCEIRO & COMERCIAL",
    cor: "emerald",
    itens: [
      { nome: "Dashboard Financeiro (DashboardFinanceiro)", status: "homologado", descricao: "KPIs financeiros, receita por período, inadimplência.", falta: [] },
      { nome: "Dashboard Comercial (DashboardComercial)", status: "homologado", descricao: "Leads, funil de vendas, conversão.", falta: [] },
      { nome: "Gestão de Leads (GestaoLeads)", status: "homologado", descricao: "CRM leve com status e acompanhamento.", falta: [] },
      { nome: "Entrada de Propostas (ProposalEntry)", status: "homologado", descricao: "Cadastro de propostas comerciais.", falta: [] },
      { nome: "Gestão de Contratos (GestaoContratos)", status: "homologado", descricao: "Contratos com assinatura digital, modelo e status.", falta: [] },
      { nome: "Orçamento de Conformidade SST", status: "pronto", descricao: "Orçamento por categoria (PGR, PCMSO, EPI, Treinamentos…).", falta: ["Aguardando validação em produção com dados reais"] },
      { nome: "Integração Asaas (pagamentos)", status: "homologado", descricao: "Boletos, PIX e cobranças via Asaas.", falta: [] },
      { nome: "Geração de Recibo", status: "homologado", descricao: "Emissão de recibos para pagamentos.", falta: [] },
    ]
  },
  {
    grupo: "📊 RELATÓRIOS & ANALYTICS",
    cor: "indigo",
    itens: [
      { nome: "Dashboard Operacional (DashboardOperacionalV2)", status: "homologado", descricao: "KPIs operacionais, turmas, ocupação, carga horária.", falta: [] },
      { nome: "Analytics (Analytics)", status: "homologado", descricao: "Relatórios de certificados, instrutores, receita e leads.", falta: [] },
      { nome: "Compliance 360° (/Compliance360)", status: "homologado", descricao: "Painel de conformidade SST por empresa com 8 abas.", falta: [] },
      { nome: "Auditoria Completa (AuditoriaCompleta)", status: "homologado", descricao: "Log completo de todas as ações do sistema.", falta: [] },
      { nome: "Log de Acesso (AccessLog)", status: "homologado", descricao: "Registro de acessos de usuários.", falta: [] },
      { nome: "BMM — Boletim de Medição (GestaoBMM)", status: "homologado", descricao: "Geração, aprovação e envio de BMMs.", falta: [] },
    ]
  },
  {
    grupo: "🤖 INTEGRAÇÕES & AUTOMAÇÕES",
    cor: "violet",
    itens: [
      { nome: "WhatsApp (Meta API)", status: "homologado", descricao: "Envio de certificados, contratos e notificações via WhatsApp.", falta: [] },
      { nome: "Email (UOL SMTP + Resend)", status: "homologado", descricao: "Envio de emails transacionais e alertas.", falta: [] },
      { nome: "IA — Extração PGR (InvokeLLM)", status: "homologado", descricao: "IA extrai 15+ campos do PDF do PGR.", falta: [] },
      { nome: "IA — Extração PCMSO (InvokeLLM)", status: "homologado", descricao: "IA extrai matriz de exames e dados médicos do PCMSO.", falta: [] },
      { nome: "IA — Validação PGR", status: "homologado", descricao: "IA detecta funções sem GHE, riscos sem medida, EPIs sem CA.", falta: [] },
      { nome: "Backup Automático (backupAutomatico)", status: "homologado", descricao: "Backup agendado de todos os dados do sistema.", falta: [] },
      { nome: "Alertas de Vencimento Automáticos", status: "homologado", descricao: "Alertas automáticos de certificados, contratos e documentos.", falta: [] },
      { nome: "IA — Extração LTCAT", status: "falta", descricao: "Extração automática de dados do LTCAT via IA.", falta: ["Não implementado"] },
      { nome: "IA — Extração ASO PDF", status: "falta", descricao: "Extração de ASO em PDF via IA.", falta: ["Não implementado"] },
      { nome: "Integração eSocial (S-2220)", status: "falta", descricao: "Exportação XML para eSocial.", falta: ["Não implementado"] },
    ]
  },
  {
    grupo: "👤 USUÁRIOS & PERMISSÕES",
    cor: "gray",
    itens: [
      { nome: "Gestão de Usuários (Users)", status: "homologado", descricao: "CRUD de usuários com roles e permissões granulares.", falta: [] },
      { nome: "Sistema de Permissões por Menu", status: "homologado", descricao: "Controle de acesso por página baseado em role.", falta: [] },
      { nome: "Portal do Instrutor (/PortalInstrutor)", status: "homologado", descricao: "Portal autônomo para instrutores com login por CPF.", falta: [] },
      { nome: "Consentimento LGPD (ConsentForm)", status: "homologado", descricao: "Gate de consentimento no primeiro acesso.", falta: [] },
      { nome: "Troca de Senha Obrigatória", status: "homologado", descricao: "Obriga troca de senha no primeiro acesso.", falta: [] },
      { nome: "Admin Dashboard", status: "homologado", descricao: "Painel administrativo completo.", falta: [] },
    ]
  },
];

const STATUS_CONFIG = {
  homologado: { label: "Homologado", color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3.5 h-3.5" />, dot: "bg-green-500" },
  pronto:     { label: "Pronto / Teste", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="w-3.5 h-3.5 opacity-60" />, dot: "bg-blue-400" },
  parcial:    { label: "Parcial", color: "bg-amber-100 text-amber-800", icon: <AlertTriangle className="w-3.5 h-3.5" />, dot: "bg-amber-400" },
  falta:      { label: "Falta implementar", color: "bg-red-100 text-red-800", icon: <XCircle className="w-3.5 h-3.5" />, dot: "bg-red-500" },
};

const COR_MAP = {
  blue: "border-blue-200 bg-blue-50", green: "border-green-200 bg-green-50", purple: "border-purple-200 bg-purple-50",
  orange: "border-orange-200 bg-orange-50", red: "border-red-200 bg-red-50", yellow: "border-yellow-200 bg-yellow-50",
  slate: "border-slate-200 bg-slate-50", emerald: "border-emerald-200 bg-emerald-50", indigo: "border-indigo-200 bg-indigo-50",
  violet: "border-violet-200 bg-violet-50", gray: "border-gray-200 bg-gray-50",
};

export default function AuditoriaApp() {
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [abertos, setAbertos] = useState({});

  const toggle = (key) => setAbertos(s => ({ ...s, [key]: !s[key] }));

  const todosItens = MODULOS.flatMap(m => m.itens);
  const counts = {
    homologado: todosItens.filter(i => i.status === "homologado").length,
    pronto: todosItens.filter(i => i.status === "pronto").length,
    parcial: todosItens.filter(i => i.status === "parcial").length,
    falta: todosItens.filter(i => i.status === "falta").length,
  };
  const total = todosItens.length;
  const pct = Math.round(((counts.homologado + counts.pronto) / total) * 100);

  const modulosFiltrados = MODULOS.map(m => ({
    ...m,
    itens: m.itens.filter(i => {
      const matchSearch = !search || i.nome.toLowerCase().includes(search.toLowerCase()) || i.descricao.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filtroStatus || i.status === filtroStatus;
      return matchSearch && matchStatus;
    })
  })).filter(m => m.itens.length > 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📋 Auditoria do Sistema</h1>
        <p className="text-gray-500 text-sm">Mapeamento completo: o que está pronto, o que falta e o que está homologado.</p>
        <p className="text-xs text-gray-400 mt-0.5">Gerado em: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 sm:col-span-1 bg-white border rounded-xl p-4 text-center">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
                strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{pct}%</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Completude Geral</p>
        </div>
        {[
          { k: "homologado", label: "Homologados", c: "text-green-700 bg-green-50 border-green-200" },
          { k: "pronto", label: "Prontos/Teste", c: "text-blue-700 bg-blue-50 border-blue-200" },
          { k: "parcial", label: "Parciais", c: "text-amber-700 bg-amber-50 border-amber-200" },
          { k: "falta", label: "Falta Fazer", c: "text-red-700 bg-red-50 border-red-200" },
        ].map(s => (
          <div key={s.k} className={`border rounded-xl p-4 text-center cursor-pointer ${filtroStatus === s.k ? "ring-2 ring-offset-1 ring-gray-400" : ""} ${s.c}`}
            onClick={() => setFiltroStatus(filtroStatus === s.k ? "" : s.k)}>
            <p className="text-3xl font-bold">{counts[s.k]}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
            <p className="text-xs opacity-60">de {total} módulos</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar módulo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todos os status</option>
          <option value="homologado">✅ Homologado</option>
          <option value="pronto">🔵 Pronto/Teste</option>
          <option value="parcial">⚠️ Parcial</option>
          <option value="falta">❌ Falta implementar</option>
        </select>
        {(search || filtroStatus) && (
          <button onClick={() => { setSearch(""); setFiltroStatus(""); }} className="text-sm text-gray-500 underline">Limpar filtros</button>
        )}
      </div>

      {/* Módulos */}
      <div className="space-y-4">
        {modulosFiltrados.map((modulo) => {
          const key = modulo.grupo;
          const isOpen = abertos[key] !== false; // aberto por padrão
          const qtdOk = modulo.itens.filter(i => i.status === "homologado" || i.status === "pronto").length;
          const qtdFalta = modulo.itens.filter(i => i.status === "falta").length;
          const qtdParcial = modulo.itens.filter(i => i.status === "parcial").length;

          return (
            <div key={key} className={`border rounded-xl overflow-hidden ${COR_MAP[modulo.cor] || "border-gray-200 bg-gray-50"}`}>
              {/* Header do grupo */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => toggle(key)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800 text-sm">{modulo.grupo}</span>
                  <span className="text-xs text-gray-500">{modulo.itens.length} módulos</span>
                </div>
                <div className="flex items-center gap-2">
                  {qtdOk > 0 && <Badge className="text-xs bg-green-100 text-green-700">{qtdOk} ok</Badge>}
                  {qtdParcial > 0 && <Badge className="text-xs bg-amber-100 text-amber-700">{qtdParcial} parcial</Badge>}
                  {qtdFalta > 0 && <Badge className="text-xs bg-red-100 text-red-700">{qtdFalta} falta</Badge>}
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </div>
              </button>

              {/* Itens */}
              {isOpen && (
                <div className="bg-white border-t divide-y">
                  {modulo.itens.map((item) => {
                    const sc = STATUS_CONFIG[item.status];
                    return (
                      <div key={item.nome} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${sc.dot}`} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-800">{item.nome}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
                            </div>
                          </div>
                          <Badge className={`text-xs flex items-center gap-1 flex-shrink-0 ${sc.color}`}>
                            {sc.icon} {sc.label}
                          </Badge>
                        </div>
                        {item.falta.length > 0 && (
                          <div className="mt-2 ml-4 space-y-0.5">
                            {item.falta.map((f, i) => (
                              <p key={i} className="text-xs text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {f}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prioridades */}
      <div className="mt-8 bg-white border rounded-xl p-5">
        <h2 className="font-bold text-gray-900 mb-4 text-base">🎯 Próximas Prioridades de Desenvolvimento</h2>
        <div className="space-y-3">
          {[
            { prioridade: "CRÍTICO", cor: "bg-red-600 text-white", item: "eSocial S-2220", desc: "Exportação de ASO para o eSocial — obrigatório legalmente." },
            { prioridade: "CRÍTICO", cor: "bg-red-600 text-white", item: "CAT — Comunicado de Acidente", desc: "Registro de acidentes de trabalho com notificação ao eSocial." },
            { prioridade: "ALTO", cor: "bg-orange-500 text-white", item: "PPP — Perfil Profissiográfico", desc: "Geração automática por trabalhador com base no PGR + LTCAT + PCMSO." },
            { prioridade: "ALTO", cor: "bg-orange-500 text-white", item: "IA Extração LTCAT", desc: "Upload PDF → IA extrai inventário de agentes nocivos." },
            { prioridade: "MÉDIO", cor: "bg-amber-400 text-gray-900", item: "Unificação DocumentoPGR × PGRLeitura", desc: "Consolidar as duas entidades de PGR em uma só." },
            { prioridade: "MÉDIO", cor: "bg-amber-400 text-gray-900", item: "IA Extração ASO PDF", desc: "Leitura inteligente de ASOs para alimentar o prontuário." },
            { prioridade: "BAIXO", cor: "bg-green-500 text-white", item: "Conferência PGR×PCMSO — Teste Produção", desc: "Validar em produção com dados reais das empresas." },
            { prioridade: "BAIXO", cor: "bg-green-500 text-white", item: "Orçamento de Conformidade — Validação", desc: "Testar com dados reais e ajustar cálculos de orçamento." },
          ].map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <Badge className={`text-xs flex-shrink-0 ${p.cor}`}>{p.prioridade}</Badge>
              <div>
                <p className="text-sm font-medium text-gray-800">{p.item}</p>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 bg-gray-50 border rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">Legenda:</p>
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className={`w-2 h-2 rounded-full ${v.dot}`} /> {v.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}