import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText, Upload, CheckCircle, XCircle, Clock, Eye, Loader2,
  ShieldCheck, Search, RefreshCw, User
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  "Pendente_Revisao": "bg-yellow-100 text-yellow-800",
  "Aprovado": "bg-green-100 text-green-800",
  "Rejeitado": "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  "Pendente_Revisao": "Pendente Revisão",
  "Aprovado": "Aprovado",
  "Rejeitado": "Rejeitado",
};

const DOC_TYPES = ["RG", "CNH", "CPF", "Comprovante_Residencia", "Outros"];

function UploadDocModal({ open, onClose, studentId, studentName, studentCpf }) {
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState("RG");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) { toast.error("Selecione um arquivo"); return; }
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke("processarDocumentoOCR", {
        file_url,
        document_type: docType,
        student_id: studentId,
        student_name: studentName,
        student_cpf: studentCpf,
        auto_cadastro: false
      });
      toast.success("Documento enviado e OCR iniciado!");
      queryClient.invalidateQueries({ queryKey: ["docs-aluno", studentId] });
      onClose();
    } catch (err) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Enviar Documento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivo (imagem ou PDF)</Label>
            <div
              className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                ${file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
              onClick={() => document.getElementById("doc-upload-input").click()}>
              <input id="doc-upload-input" type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-sm">Clique para selecionar</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            OCR será executado automaticamente para extrair os dados.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-gray-900 hover:bg-gray-800" onClick={handleUpload} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Enviando...</> : "Enviar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocDetailModal({ doc, open, onClose, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState("");
  const [signedUrl, setSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const loadSignedUrl = async () => {
    if (signedUrl) return;
    setLoadingUrl(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri, expires_in: 300 });
      setSignedUrl(signed_url);
    } catch {
      toast.error("Erro ao gerar link do arquivo");
    } finally {
      setLoadingUrl(false);
    }
  };

  React.useEffect(() => {
    if (open && doc) loadSignedUrl();
  }, [open, doc]);

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {doc.document_type?.replace("_", " ")} — {doc.student_name || "Aluno"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={STATUS_COLORS[doc.status]}>{STATUS_LABELS[doc.status]}</Badge>
            <span className="text-xs text-gray-400">{doc.auto_cadastro ? "Via Auto-Cadastro" : "Upload Manual"}</span>
          </div>

          {/* Visualizar arquivo */}
          {loadingUrl ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : signedUrl ? (
            <div className="border rounded-lg overflow-hidden">
              {signedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={signedUrl} alt="Documento" className="w-full object-contain max-h-64" />
              ) : (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 text-blue-600 hover:bg-blue-50">
                  <Eye className="w-4 h-4" /> Abrir documento (PDF)
                </a>
              )}
            </div>
          ) : null}

          {/* Dados extraídos pelo OCR */}
          {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dados Extraídos (OCR)</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {Object.entries(doc.extracted_data).map(([key, val]) => val && (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="font-medium text-gray-800">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          {doc.status === "Pendente_Revisao" && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-700 hover:bg-green-800" onClick={() => onApprove(doc.id)}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Motivo da rejeição..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => { if (rejectReason) onReject(doc.id, rejectReason); else toast.error("Informe o motivo"); }}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentosAluno({ studentId, studentName, studentCpf }) {
  const queryClient = useQueryClient();
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["docs-aluno", studentId],
    queryFn: () => studentId
      ? base44.entities.StudentDocument.filter({ student_id: studentId })
      : base44.entities.StudentDocument.list("-created_date", 100),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudentDocument.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["docs-aluno", studentId] }); toast.success("Documento atualizado!"); setSelectedDoc(null); },
  });

  const handleApprove = async (id) => {
    const user = await base44.auth.me();
    updateMutation.mutate({ id, data: { status: "Aprovado", reviewed_by_email: user?.email, reviewed_at: new Date().toISOString() } });
  };

  const handleReject = async (id, reason) => {
    const user = await base44.auth.me();
    updateMutation.mutate({ id, data: { status: "Rejeitado", rejection_reason: reason, reviewed_by_email: user?.email, reviewed_at: new Date().toISOString() } });
  };

  const filtered = filterStatus === "all" ? docs : docs.filter(d => d.status === filterStatus);
  const pendentes = docs.filter(d => d.status === "Pendente_Revisao").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Cofre de Documentos LGPD</h3>
          {pendentes > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800">{pendentes} pendente{pendentes > 1 ? "s" : ""}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Pendente_Revisao">Pendentes</SelectItem>
              <SelectItem value="Aprovado">Aprovados</SelectItem>
              <SelectItem value="Rejeitado">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["docs-aluno", studentId] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setUploadModal(true)}>
            <Upload className="w-4 h-4 mr-1" /> Enviar Documento
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum documento encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedDoc(doc)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{doc.document_type?.replace("_", " ")}</p>
                      {!studentId && doc.student_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> {doc.student_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(doc.created_date).toLocaleDateString("pt-BR")}
                        {doc.auto_cadastro && " · Auto-cadastro"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[doc.status]}>{STATUS_LABELS[doc.status]}</Badge>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDocModal
        open={uploadModal}
        onClose={() => setUploadModal(false)}
        studentId={studentId}
        studentName={studentName}
        studentCpf={studentCpf}
      />

      <DocDetailModal
        doc={selectedDoc}
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}