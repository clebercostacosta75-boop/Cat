import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Upload, Search, Eye, Trash2, CheckCircle, XCircle,
  Clock, AlertTriangle, User, FileUp, ExternalLink, ShieldCheck, RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDate(d) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return d; }
}

const STATUS_LABELS = {
  Pendente_Revisao: { label: "Pendente Revisão", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  Aprovado: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  Rejeitado: { label: "Rejeitado", color: "bg-red-100 text-red-700", icon: XCircle },
};

const DOC_TYPES = ["RG", "CNH", "CPF", "Comprovante_Residencia", "Outros"];
const DOC_LABELS = { RG: "RG", CNH: "CNH", CPF: "CPF", Comprovante_Residencia: "Comprovante de Residência", Outros: "Outros" };

export default function GestaoDocumentosAluno() {
  const [activeTab, setActiveTab] = useState("upload");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Upload form
  const [cpfBusca, setCpfBusca] = useState("");
  const [studentFound, setStudentFound] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState("RG");
  const [buscando, setBuscando] = useState(false);

  // Detail modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    const all = await base44.entities.StudentDocument.list("-created_date", 100);
    setDocs(all);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleSearchStudent = async () => {
    const cleaned = cpfBusca.replace(/\D/g, "");
    if (cleaned.length !== 11) return;
    setBuscando(true);
    const students = await base44.entities.Student.filter({ cpf: cleaned });
    setStudentFound(students[0] || null);
    setBuscando(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || (!studentFound && !cpfBusca)) return;
    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const fileUrl = uploadRes.file_url;

      const doc = await base44.entities.StudentDocument.create({
        student_id: studentFound?.id || "",
        student_name: studentFound?.full_name || "",
        student_cpf: studentFound?.cpf || cpfBusca.replace(/\D/g, ""),
        document_type: docType,
        file_uri: fileUrl,
        file_name: selectedFile.name,
        status: "Pendente_Revisao",
        auto_cadastro: !studentFound
      });

      setSelectedFile(null);
      setCpfBusca("");
      setStudentFound(null);
      await loadDocs();
      alert("Documento enviado com sucesso!");

      // Se quiser processar OCR automaticamente
      if (confirm("Processar OCR agora?")) {
        await processOCR(doc.id, fileUrl);
      }
    } catch (err) {
      alert("Erro ao enviar: " + (err.message || "Tente novamente"));
    }
    setUploading(false);
  };

  const processOCR = async (docId, fileUrl) => {
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('processarDocumentoOCR', {
        file_url: fileUrl,
        document_type: docType
      });
      if (res.data?.student_document) {
        await base44.entities.StudentDocument.update(docId, {
          extracted_data: res.data.extracted_data,
          ocr_raw: res.data.raw_text,
          student_name: res.data.student_found?.full_name || res.data.extracted_data?.nome || "",
          student_cpf: res.data.extracted_data?.cpf || "",
          student_id: res.data.student_found?.id || ""
        });
        await loadDocs();
      }
    } catch (err) {
      alert("Erro no OCR: " + (err.message || "Tente novamente"));
    }
    setProcessing(false);
  };

  const handleStatus = async (docId, status, rejectionReason) => {
    await base44.entities.StudentDocument.update(docId, {
      status,
      reviewed_by_email: (await base44.auth.me()).email,
      reviewed_at: new Date().toISOString(),
      ...(rejectionReason ? { rejection_reason: rejectionReason } : {})
    });
    await loadDocs();
    setShowDetail(false);
    setSelectedDoc(null);
  };

  const filtered = docs.filter(d => {
    const s = search.toLowerCase();
    return (!s || d.student_name?.toLowerCase().includes(s) || d.student_cpf?.includes(s))
      && (filterStatus === "all" || d.status === filterStatus);
  });

  // Agrupar por aluno
  const grouped = {};
  filtered.forEach(d => {
    const key = d.student_name || d.student_cpf || "Sem identificação";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  const stats = {
    total: docs.length,
    pendentes: docs.filter(d => d.status === "Pendente_Revisao").length,
    aprovados: docs.filter(d => d.status === "Aprovado").length,
    rejeitados: docs.filter(d => d.status === "Rejeitado").length,
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Gestão de Documentos de Alunos
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload, OCR e revisão de documentos de matrícula</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Pendentes", value: stats.pendentes, color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
          { label: "Aprovados", value: stats.aprovados, color: "bg-green-50 text-green-700 border-green-100" },
          { label: "Rejeitados", value: stats.rejeitados, color: "bg-red-50 text-red-700 border-red-100" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-xs mb-0.5">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="upload" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Upload className="w-4 h-4 mr-1.5" />Upload
          </TabsTrigger>
          <TabsTrigger value="revisao" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShieldCheck className="w-4 h-4 mr-1.5" />Revisão ({stats.pendentes})
          </TabsTrigger>
          <TabsTrigger value="todos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="w-4 h-4 mr-1.5" />Todos
          </TabsTrigger>
        </TabsList>

        {/* Tab Upload */}
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload de Documento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="CPF do aluno"
                  value={cpfBusca}
                  onChange={e => setCpfBusca(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  maxLength={11}
                  className="flex-1 max-w-xs"
                />
                <Button onClick={handleSearchStudent} disabled={buscando || cpfBusca.length !== 11} variant="outline">
                  <Search className="w-4 h-4 mr-1" />Buscar
                </Button>
              </div>

              {studentFound && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                  <User className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm text-green-800">{studentFound.full_name}</p>
                    <p className="text-xs text-green-600">CPF: {studentFound.cpf}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Documento</label>
                  <select value={docType} onChange={e => setDocType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Arquivo</label>
                  <input type="file" onChange={handleFileChange} accept="image/*,.pdf"
                    className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                  {uploading ? <><RefreshCw className="w-4 h-4 animate-spin mr-1" />Enviando...</> : <><FileUp className="w-4 h-4 mr-1" />Enviar</>}
                </Button>
              </div>
              {selectedFile && <p className="text-xs text-gray-400">Arquivo: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tabs Revisão e Todos */}
        <TabsContent value="revisao" className="mt-4">
          <DocumentList
            docs={docs.filter(d => d.status === "Pendente_Revisao")}
            loading={loading}
            onView={d => { setSelectedDoc(d); setShowDetail(true); }}
            onDelete={async (id) => { await base44.entities.StudentDocument.delete(id); await loadDocs(); }}
            onProcessOCR={processOCR}
            processing={processing}
          />
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 text-sm" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">Todos status</option>
              <option value="Pendente_Revisao">Pendente Revisão</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>
          </div>
          <DocumentList
            docs={filtered}
            loading={loading}
            onView={d => { setSelectedDoc(d); setShowDetail(true); }}
            onDelete={async (id) => { await base44.entities.StudentDocument.delete(id); await loadDocs(); }}
            onProcessOCR={processOCR}
            processing={processing}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />Detalhes do Documento
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-gray-400 block">Aluno</span><span className="font-medium">{selectedDoc.student_name || "—"}</span></div>
                <div><span className="text-xs text-gray-400 block">CPF</span><span>{selectedDoc.student_cpf || "—"}</span></div>
                <div><span className="text-xs text-gray-400 block">Tipo</span><span>{DOC_LABELS[selectedDoc.document_type] || selectedDoc.document_type}</span></div>
                <div><span className="text-xs text-gray-400 block">Arquivo</span><span className="text-xs">{selectedDoc.file_name}</span></div>
                <div><span className="text-xs text-gray-400 block">Status</span>
                  <Badge className={`text-[10px] ml-1 ${STATUS_LABELS[selectedDoc.status]?.color}`}>
                    {STATUS_LABELS[selectedDoc.status]?.label}
                  </Badge>
                </div>
                <div><span className="text-xs text-gray-400 block">Enviado em</span><span className="text-xs">{formatDate(selectedDoc.created_date)}</span></div>
                {selectedDoc.uploaded_by_email && <div className="col-span-2"><span className="text-xs text-gray-400 block">Enviado por</span><span className="text-xs">{selectedDoc.uploaded_by_email}</span></div>}
              </div>

              {/* Dados OCR extraídos */}
              {selectedDoc.extracted_data && Object.keys(selectedDoc.extracted_data).length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-2">Dados Extraídos (OCR)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedDoc.extracted_data).filter(([k]) => k !== 'tipo_documento_detectado').map(([k, v]) => (
                      <div key={k}><span className="text-blue-500 capitalize">{k.replace(/_/g, ' ')}: </span><span className="text-blue-900">{v || "—"}</span></div>
                    ))}
                  </div>
                  {selectedDoc.auto_cadastro && (
                    <div className="mt-2 bg-yellow-100 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                      ⚠️ Este documento foi enviado via auto-cadastro — aluno ainda não possui registro.
                    </div>
                  )}
                </div>
              )}

              {/* Botões de revisão */}
              {selectedDoc.status === "Pendente_Revisao" && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleStatus(selectedDoc.id, "Aprovado")} className="bg-green-600 hover:bg-green-700 flex-1 gap-1.5">
                    <CheckCircle className="w-4 h-4" />Aprovar
                  </Button>
                  <Button onClick={() => {
                    const reason = prompt("Motivo da rejeição:");
                    if (reason) handleStatus(selectedDoc.id, "Rejeitado", reason);
                  }} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1.5">
                    <XCircle className="w-4 h-4" />Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Lista de documentos ──────────────────────────────────────────────────────
function DocumentList({ docs, loading, onView, onDelete, onProcessOCR, processing }) {
  if (loading) return (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
    </div>
  );

  if (docs.length === 0) return (
    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Nenhum documento encontrado</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {docs.map(d => {
        const statusInfo = STATUS_LABELS[d.status] || { label: d.status, color: "bg-gray-100 text-gray-600" };
        return (
          <div key={d.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-800">{d.student_name || "Sem nome"} • {d.document_type}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  {d.student_cpf && <span>CPF: {d.student_cpf}</span>}
                  <span>{d.file_name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
              {!d.extracted_data && (
                <Button size="sm" variant="ghost" onClick={() => onProcessOCR(d.id, d.file_uri)} disabled={processing} className="h-7 text-xs text-blue-600">
                  OCR
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onView(d)} className="h-7 w-7 p-0"><Eye className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir?")) onDelete(d.id); }} className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}