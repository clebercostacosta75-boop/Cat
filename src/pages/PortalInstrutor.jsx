/**
 * Portal do Instrutor — página pública.
 * O instrutor busca seus treinamentos pelo CPF.
 * Permite: ver agenda, turmas, registrar frequência, anexar evidências.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar, Search, Users, CheckCircle, Clock, Camera,
  Upload, ClipboardList, MapPin, BookOpen, AlertCircle,
  Loader2, ArrowLeft, Image, FileText, X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDate(d) {
  if (!d) return "—";
  try { return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

const STATUS_BADGE = {
  "Agendado": "bg-blue-100 text-blue-700 border-blue-200",
  "Em Andamento": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Concluído": "bg-green-100 text-green-700 border-green-200",
  "Cancelado": "bg-red-100 text-red-700 border-red-200",
  "Pendente": "bg-gray-100 text-gray-600 border-gray-200",
};

function ClassDetail({ classItem, cpf, onBack, onAttendance }) {
  const [activeTab, setActiveTab] = useState("info");
  const [evidences, setEvidences] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(classItem.notes || "");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEvidences(prev => [...prev, { name: file.name, url: file_url, type: file.type.startsWith("image") ? "image" : "file", uploadedAt: new Date().toISOString() }]);
    } catch (err) {
      alert("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      await base44.functions.invoke("portalInstrutor", {
        action: "save_report",
        cpf: cpf.replace(/\D/g, ""),
        class_id: classItem.id,
        notes: report,
      });
      alert("Relatório salvo com sucesso!");
    } catch { alert("Erro ao salvar relatório."); }
  };

  const handleAttendance = () => onAttendance(classItem);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800">
        <ArrowLeft className="w-4 h-4" /> Voltar para agenda
      </button>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{classItem.training_name}</h2>
              <p className="text-sm text-gray-500 mt-1">{classItem.company_name}</p>
            </div>
            <Badge className={STATUS_BADGE[classItem.status] || "bg-gray-100"}>{classItem.status}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <Calendar className="w-4 h-4 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Datas</p>
              <p className="text-sm font-medium text-gray-800">
                {classItem.realization_dates?.length > 0
                  ? `${formatDate(classItem.realization_dates[0])} — ${formatDate(classItem.realization_dates[classItem.realization_dates.length - 1])}`
                  : formatDate(classItem.start_date)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <Clock className="w-4 h-4 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Horário</p>
              <p className="text-sm font-medium text-gray-800">{classItem.training_schedule || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <MapPin className="w-4 h-4 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Local</p>
              <p className="text-sm font-medium text-gray-800">{classItem.location || "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <Users className="w-4 h-4 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Alunos</p>
              <p className="text-sm font-medium text-gray-800">{classItem.students_count || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: "info", label: "Informações", icon: BookOpen },
          { key: "attendance", label: "Frequência", icon: ClipboardList },
          { key: "evidences", label: "Evidências", icon: Camera },
          { key: "report", label: "Relatório", icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Modalidade</p>
              <p className="text-sm text-gray-800">{classItem.modality || classItem.category || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Carga Horária</p>
              <p className="text-sm text-gray-800">{classItem.duration_hours ? `${classItem.duration_hours}h` : "—"}</p>
            </div>
            {classItem.specific_days && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Dias Específicos</p>
                <p className="text-sm text-gray-800">{classItem.specific_days}</p>
              </div>
            )}
            {classItem.realization_dates?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Cronograma</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {classItem.realization_dates.map((d, i) => (
                    <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded">{formatDate(d)}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">Registro de Frequência</p>
                <p className="text-xs text-gray-500">Marque a presença dos alunos desta turma</p>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAttendance}>
                <ClipboardList className="w-3.5 h-3.5 mr-1" /> Abrir Chamada
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{classItem.students_count || "Número não informado"} alunos vinculados</p>
              <p className="text-xs text-gray-400 mt-1">Acesse a chamada completa pelo botão acima</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "evidences" && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">Evidências da Aula</p>
                <p className="text-xs text-gray-500">Fotos, documentos e anexos do treinamento</p>
              </div>
              <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium ${uploading ? "bg-gray-300 text-gray-500" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Enviando..." : "Anexar"}
                <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>

            {evidences.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhuma evidência anexada ainda</p>
                <p className="text-xs text-gray-400 mt-1">Envie fotos da turma, lista de presença ou outros documentos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {evidences.map((ev, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 relative group">
                    {ev.type === "image" ? (
                      <img src={ev.url} alt={ev.name} className="w-full h-24 object-cover rounded mb-2" />
                    ) : (
                      <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <p className="text-xs text-gray-600 truncate">{ev.name}</p>
                    <button
                      onClick={() => setEvidences(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "report" && (
        <Card>
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-3">Relatório da Aula</p>
            <textarea
              value={report}
              onChange={e => setReport(e.target.value)}
              placeholder="Descreva como foi a aula, tópicos abordados, observações sobre os alunos, dificuldades encontradas..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm min-h-[180px] focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
            />
            <div className="flex justify-end mt-3">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveReport}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Salvar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PortalInstrutor() {
  const [cpf, setCpf] = useState("");
  const [instructor, setInstructor] = useState(null);
  const [classes, setClasses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);

  const handleSearch = async () => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) { setError("Digite um CPF válido com 11 dígitos."); return; }
    setError("");
    setLoading(true);
    setClasses(null);
    setInstructor(null);
    setSelectedClass(null);
    try {
      const response = await base44.functions.invoke("portalInstrutor", { action: "lookup", cpf: cleaned });
      const inst = response.data.instructor;
      setInstructor(inst);

      const allClasses = response.data.classes || [];
      allClasses.sort((a, b) => {
        const order = { "Em Andamento": 0, "Agendado": 1, "Concluído": 2, "Cancelado": 3, "Pendente": 4 };
        return (order[a.status] || 5) - (order[b.status] || 5);
      });
      setClasses(allClasses);
    } catch {
      setError("Erro ao buscar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const upcoming = classes?.filter(c => ["Agendado", "Em Andamento", "Pendente"].includes(c.status)) ?? [];
  const completed = classes?.filter(c => ["Concluído", "Cancelado"].includes(c.status)) ?? [];

  const formatCpf = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      .replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3")
      .replace(/(\d{3})(\d{3})/, "$1.$2")
      .replace(/(\d{3})/, "$1");
  };

  if (selectedClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" alt="CAT Logo" className="h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Portal do Instrutor</h1>
              <p className="text-xs text-gray-500">{instructor?.name}</p>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <ClassDetail classItem={selectedClass} cpf={cpf} onBack={() => setSelectedClass(null)} onAttendance={(c) => window.open(`/AttendanceCall?classId=${c.id}`, "_blank")} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png" alt="CAT Logo" className="h-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Portal do Instrutor</h1>
            <p className="text-xs text-gray-500">CAT Cursos — Agenda & Frequência</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="border border-amber-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" />
              Acessar minha agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Digite seu CPF para visualizar suas turmas, registrar frequência e anexar evidências.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="000.000.000-00"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                maxLength={14}
              />
              <Button onClick={handleSearch} disabled={loading} className="bg-amber-600 hover:bg-amber-700 px-6">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1" />Buscar</>}
              </Button>
            </div>
            {error && <p className="text-sm text-red-500 flex items-center gap-1 mt-2"><AlertCircle className="w-4 h-4" />{error}</p>}
          </CardContent>
        </Card>

        {instructor && classes !== null && (
          <>
            <div className="bg-amber-600 text-white rounded-2xl p-5">
              <h2 className="text-lg font-bold">{instructor.name}</h2>
              <p className="text-amber-200 text-sm">{instructor.specialty || "Instrutor"} • {instructor.email || ""}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-800">{upcoming.length}</p>
                <p className="text-xs text-blue-600">Próximos</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-800">{completed.length}</p>
                <p className="text-xs text-green-600">Concluídos</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{classes.length}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma turma encontrada.</p>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Próximas Turmas</h2>
                    <div className="space-y-3">
                      {upcoming.map(c => (
                        <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedClass(c)}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{c.training_name}</p>
                              <p className="text-sm text-gray-500">{c.company_name} • {c.location || ""}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{formatDate(c.start_date)}</span>
                                {c.training_schedule && <span className="text-xs text-gray-400">{c.training_schedule}</span>}
                              </div>
                            </div>
                            <Badge className={STATUS_BADGE[c.status] || "bg-gray-100"}>{c.status}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {completed.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Histórico</h2>
                    <div className="space-y-2 opacity-75">
                      {completed.slice(0, 5).map(c => (
                        <Card key={c.id} className="cursor-pointer hover:shadow-sm" onClick={() => setSelectedClass(c)}>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">{c.training_name}</p>
                              <p className="text-xs text-gray-400">{c.company_name} • {formatDate(c.start_date)}</p>
                            </div>
                            <Badge className={STATUS_BADGE[c.status] || "bg-gray-100"}>{c.status}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!instructor && classes === null && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Informe seu CPF acima para acessar sua agenda.</p>
          </div>
        )}
      </div>
    </div>
  );
}