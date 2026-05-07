import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Eye, CheckCircle, Clock, AlertCircle, Loader2, Plus, Trash2, Building2, Layers } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_CONFIG = {
  "Processando":        { color: "bg-blue-100 text-blue-800",   icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  "Aguardando Revisão": { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  "Revisado":           { color: "bg-purple-100 text-purple-800", icon: <Eye className="w-3 h-3" /> },
  "Finalizado":         { color: "bg-green-100 text-green-800",   icon: <CheckCircle className="w-3 h-3" /> },
  "Erro":               { color: "bg-red-100 text-red-800",       icon: <AlertCircle className="w-3 h-3" /> },
};

export default function ProposalEntry() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 50),
    refetchInterval: 5000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const deleteProposalMutation = useMutation({
    mutationFn: (id) => base44.entities.Proposal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta removida');
    },
  });

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo PDF');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const proposal = await base44.entities.Proposal.create({
        file_name: file.name,
        file_url,
        status: 'Processando',
      });

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta enviada! Processando com IA...');

      await base44.functions.invoke('processProposal', {
        file_url,
        proposal_id: proposal.id,
      });

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Extração concluída! Aguardando revisão.');
    } catch (err) {
      toast.error('Erro ao processar proposta: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const openReview = (proposal) => {
    setSelectedProposal(proposal);
    setEditData({
      company_name: proposal.company_name || '',
      company_cnpj: proposal.company_cnpj || '',
      company_id: proposal.company_id || '',
      total_value: proposal.total_value || '',
      notes: proposal.notes || '',
      courses: (proposal.courses || []).map(c => ({ ...c, num_turmas: c.num_turmas || 1 })),
    });
    setReviewOpen(true);
  };

  const updateCourse = (idx, field, value) => {
    const updated = [...editData.courses];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditData({ ...editData, courses: updated });
  };

  const addCourse = () => {
    setEditData({
      ...editData,
      courses: [...editData.courses, {
        course_name: '', workload_hours: '', students_count: '',
        unit_value: '', total_value: '', start_date: '',
        end_date: '', location: '', instructor_name: '', modality: 'Presencial',
        num_turmas: 1
      }]
    });
  };

  const getDisplayUnitValue = (course) => {
    const unit = parseFloat(course.unit_value) || 0;
    const turmas = parseInt(course.num_turmas) || 1;
    return unit / turmas;
  };

  const calculateTotalValue = (course) => {
    const unit = parseFloat(course.unit_value) || 0;
    const students = parseInt(course.students_count) || 0;
    const turmas = parseInt(course.num_turmas) || 1;
    return unit * students * turmas;
  };

  const removeCourse = (idx) => {
    const updated = editData.courses.filter((_, i) => i !== idx);
    setEditData({ ...editData, courses: updated });
  };

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await base44.entities.Proposal.update(selectedProposal.id, {
        ...editData,
        status: 'Revisado',
      });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta salva com sucesso!');
      setReviewOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    const missing = editData.courses.filter(c => !c.start_date || !c.end_date || !c.location);
    if (missing.length > 0) {
      toast.error('Preencha Data Início, Data Fim e Local em todos os cursos antes de finalizar.');
      return;
    }

    setFinalizing(true);
    try {
      const classIds = [];
      for (const course of editData.courses) {
        const cls = await base44.entities.ClassSchedule.create({
          training_name: course.course_name,
          company_name: editData.company_name,
          company_id: editData.company_id || null,
          location: course.location,
          students_count: course.students_count || 0,
          instructor_name: course.instructor_name || '',
          start_date: course.start_date,
          end_date: course.end_date,
          unit_value: course.unit_value || 0,
          total_value: course.total_value || 0,
          modality: course.modality || 'Presencial',
          status: 'Agendado',
          notes: `Criado via Proposta: ${selectedProposal.file_name}`,
        });
        classIds.push(cls.id);
      }

      await base44.entities.Proposal.update(selectedProposal.id, {
        ...editData,
        status: 'Finalizado',
        class_schedule_ids: classIds,
      });

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      toast.success(`${classIds.length} turma(s) criada(s) com sucesso!`);
      setReviewOpen(false);
    } catch (err) {
      toast.error('Erro ao finalizar: ' + err.message);
    } finally {
      setFinalizing(false);
    }
  };

  const statusCounts = proposals.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          Entrada de Propostas
        </h1>
        <p className="text-gray-500 text-sm mt-1">Upload de propostas PDF com extração automática por IA</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: proposals.length, color: "text-gray-900" },
          { label: "Aguardando Revisão", value: statusCounts["Aguardando Revisão"] || 0, color: "text-yellow-600" },
          { label: "Revisado", value: statusCounts["Revisado"] || 0, color: "text-purple-600" },
          { label: "Finalizado", value: statusCounts["Finalizado"] || 0, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label} className="border border-gray-200">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
        <CardContent className="p-8">
          <div
            className={`flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${dragOver ? 'opacity-70 scale-95' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('pdf-upload').click()}
          >
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-blue-600 font-medium">Processando com IA...</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-blue-400" />
                <div className="text-center">
                  <p className="text-blue-700 font-semibold text-lg">Arraste o PDF aqui ou clique para selecionar</p>
                  <p className="text-blue-500 text-sm mt-1">Somente arquivos PDF</p>
                </div>
              </>
            )}
          </div>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </CardContent>
      </Card>

      {/* Lista de Propostas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Propostas Recebidas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : proposals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma proposta enviada ainda</p>
            </div>
          ) : (
            <div className="divide-y">
              {proposals.map(p => {
                const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG["Erro"];
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.file_name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                          {p.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {p.company_name}
                            </span>
                          )}
                          {p.total_value && (
                            <span className="font-medium text-green-700">
                              R$ {p.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          {p.courses?.length > 0 && (
                            <span>{p.courses.length} curso(s)</span>
                          )}
                          <span>{p.created_date ? format(new Date(p.created_date), 'dd/MM/yyyy HH:mm') : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={`${cfg.color} flex items-center gap-1 text-xs`}>
                        {cfg.icon}
                        {p.status}
                      </Badge>
                      {(p.status === 'Aguardando Revisão' || p.status === 'Revisado') && (
                        <Button size="sm" variant="outline" onClick={() => openReview(p)}>
                          <Eye className="w-3 h-3 mr-1" /> Revisar
                        </Button>
                      )}
                      {p.status === 'Finalizado' && (
                        <Button size="sm" variant="ghost" onClick={() => openReview(p)}>
                          <Eye className="w-3 h-3 mr-1" /> Ver
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => deleteProposalMutation.mutate(p.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Revisão */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Revisão da Proposta — {selectedProposal?.file_name}
            </DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-6">
              {/* Dados da Empresa */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Dados da Empresa</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Empresa</Label>
                    <Input
                      value={editData.company_name}
                      onChange={e => setEditData({ ...editData, company_name: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>CNPJ</Label>
                    <Input
                      value={editData.company_cnpj}
                      onChange={e => setEditData({ ...editData, company_cnpj: e.target.value })}
                      placeholder="XX.XXX.XXX/XXXX-XX"
                    />
                  </div>
                </div>
              </div>

              {/* Cursos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">Cursos / Treinamentos</h3>
                  <Button size="sm" variant="outline" onClick={addCourse}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Curso
                  </Button>
                </div>

                {editData.courses.map((course, idx) => (
                  <Card key={idx} className={`border-2 ${!course.start_date || !course.end_date || !course.location ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">Curso #{idx + 1}</span>
                        {(!course.start_date || !course.end_date || !course.location) && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Preencher campos obrigatórios
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeCourse(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1 md:col-span-2">
                          <Label>Nome do Curso</Label>
                          <Input value={course.course_name || ''} onChange={e => updateCourse(idx, 'course_name', e.target.value)} placeholder="Ex: NR-35 Trabalho em Altura" />
                        </div>
                        <div className="space-y-1">
                          <Label>Modalidade</Label>
                          <Select value={course.modality || 'Presencial'} onValueChange={v => updateCourse(idx, 'modality', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Presencial">Presencial</SelectItem>
                              <SelectItem value="Online">Online</SelectItem>
                              <SelectItem value="Híbrido">Híbrido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <Label>Carga Horária (h)</Label>
                          <Input type="number" value={course.workload_hours || ''} onChange={e => updateCourse(idx, 'workload_hours', parseFloat(e.target.value) || '')} placeholder="8" />
                        </div>
                        <div className="space-y-1">
                          <Label>Nº de Alunos</Label>
                          <Input type="number" value={course.students_count || ''} onChange={e => updateCourse(idx, 'students_count', parseInt(e.target.value) || '')} placeholder="10" />
                        </div>
                        <div className="space-y-1">
                          <Label className="flex items-center gap-1"><Layers className="w-3 h-3" /> Nº Turmas</Label>
                          <Input type="number" value={course.num_turmas || 1} onChange={e => updateCourse(idx, 'num_turmas', parseInt(e.target.value) || 1)} placeholder="1" min="1" />
                        </div>
                        <div className="space-y-1">
                          <Label>Valor Unit. (R$)</Label>
                          <Input type="number" value={getDisplayUnitValue(course).toFixed(2)} disabled className="bg-gray-100 cursor-not-allowed" />
                          <input type="hidden" value={course.unit_value || ''} />
                        </div>
                        <div className="space-y-1">
                          <Label>Valor Total (R$)</Label>
                          <Input type="number" value={calculateTotalValue(course)} disabled className="bg-gray-100 cursor-not-allowed" />
                        </div>
                      </div>

                      {/* Campos logísticos obrigatórios */}
                      <div className="grid md:grid-cols-3 gap-3 pt-2 border-t border-yellow-200">
                        <div className="space-y-1">
                          <Label className="text-yellow-700 font-semibold">📅 Data Início *</Label>
                          <Input type="date" value={course.start_date || ''} onChange={e => updateCourse(idx, 'start_date', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-yellow-700 font-semibold">📅 Data Fim *</Label>
                          <Input type="date" value={course.end_date || ''} onChange={e => updateCourse(idx, 'end_date', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-yellow-700 font-semibold">📍 Local *</Label>
                          <Input value={course.location || ''} onChange={e => updateCourse(idx, 'location', e.target.value)} placeholder="Ex: Belém/PA" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Instrutor</Label>
                        <Select value={course.instructor_name || ''} onValueChange={v => updateCourse(idx, 'instructor_name', v)}>
                          <SelectTrigger><SelectValue placeholder="Selecionar instrutor..." /></SelectTrigger>
                          <SelectContent>
                            {instructors.map(i => (
                              <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  value={editData.notes}
                  onChange={e => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre a proposta..."
                  rows={3}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3 justify-end pt-2 border-t flex-wrap">
                <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  onClick={handleSaveReview}
                  disabled={saving}
                  className="border-blue-300 text-blue-700"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Salvar Rascunho
                </Button>
                {selectedProposal?.status !== 'Finalizado' && (
                  <>
                    <Button
                      onClick={handleFinalize}
                      disabled={finalizing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {finalizing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Finalizar e Criar Turmas
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = `/AgendaTreinamentos?company_id=${editData.company_id || ''}&company_name=${encodeURIComponent(editData.company_name || '')}`;
                      }}
                      className="border-purple-300 text-purple-700"
                    >
                      📅 Agendar Treinamento
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}