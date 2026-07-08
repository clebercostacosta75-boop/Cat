/**
 * Chamada Presencial — para instrutores registrarem presença de alunos.
 * Modos: Lista Rápida (check manual) ou QR Code (aluno escaneia e confirma).
 * Salva/atualiza ClassDailyRecord automaticamente.
 */
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, List, CheckCircle, Circle, Users, Calendar, MapPin, Clock, Save, RefreshCw, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import AttendanceQRPanel from "@/components/attendance/AttendanceQRPanel";

export default function AttendanceCall() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [mode, setMode] = useState("list"); // "list" | "qr"
  const [attendance, setAttendance] = useState({}); // { studentName: true/false }
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-attendance"],
    queryFn: () => base44.entities.ClassSchedule.list("-created_date", 200),
    initialData: [],
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["certs-attendance", selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const cls = classes.find(c => c.id === selectedClassId);
      if (!cls) return [];
      return base44.entities.Certificate.filter({ class_schedule_id: selectedClassId });
    },
    enabled: !!selectedClassId,
    initialData: [],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-attendance", selectedClassId],
    queryFn: () => base44.entities.StudentCourseEnrollment.filter({ class_schedule_id: selectedClassId }),
    enabled: !!selectedClassId,
    initialData: [],
  });

  const { data: existingRecord } = useQuery({
    queryKey: ["daily-record", selectedClassId, selectedDate],
    queryFn: async () => {
      if (!selectedClassId || !selectedDate) return null;
      const records = await base44.entities.ClassDailyRecord.filter({
        class_schedule_id: selectedClassId,
        specific_date: selectedDate,
      });
      return records[0] || null;
    },
    enabled: !!selectedClassId && !!selectedDate,
  });

  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  // Datas disponíveis da turma selecionada
  const availableDates = useMemo(() => {
    if (!selectedClass?.realization_dates?.length) return [];
    return selectedClass.realization_dates.filter(Boolean).sort();
  }, [selectedClass]);

  // Lista de alunos — prioridade: matrículas da turma → inscritos da Agenda → certificados → slots
  const studentList = useMemo(() => {
    if (!selectedClass) return [];
    if (enrollments.length > 0) {
      return enrollments.map(e => ({
        id: e.id,
        name: e.student_name,
        cpf: e.student_cpf || "",
        hasCert: !!e.certificate_id,
      }));
    }
    const inscritos = selectedClass.alunos_inscritos || [];
    if (inscritos.length > 0) {
      return inscritos.map((a, i) => ({
        id: a.cpf || `insc-${i}`,
        name: a.nome || `Aluno ${i + 1}`,
        cpf: a.cpf || "",
        hasCert: false,
      }));
    }
    if (certificates.length > 0) {
      return certificates.map(c => ({
        id: c.id,
        name: c.student_name,
        cpf: c.student_cpf,
        hasCert: true,
      }));
    }
    // Fallback: gerar slots pelo número de alunos
    const count = selectedClass.students_count || 0;
    return Array.from({ length: count }, (_, i) => ({
      id: `slot-${i}`,
      name: `Aluno ${i + 1}`,
      cpf: "",
      hasCert: false,
    }));
  }, [enrollments, certificates, selectedClass]);

  // Inicializar presença quando a lista muda
  React.useEffect(() => {
    if (studentList.length > 0) {
      setAttendance(prev => {
        const next = {};
        studentList.forEach(s => {
          next[s.id] = prev[s.id] ?? false;
        });
        return next;
      });
    }
  }, [studentList]);

  // Sincronizar presença com registro existente
  React.useEffect(() => {
    if (existingRecord?.attendance_list) {
      setAttendance(existingRecord.attendance_list);
    }
  }, [existingRecord]);

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = studentList.length;

  const toggleAttendance = (id) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const markAll = (value) => {
    const next = {};
    studentList.forEach(s => { next[s.id] = value; });
    setAttendance(next);
  };

  // Chamado pelo QR Panel quando aluno confirma presença
  const handleQRPresence = (studentId) => {
    setAttendance(prev => ({ ...prev, [studentId]: true }));
    toast.success("Presença confirmada via QR Code!");
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedDate) {
      toast.error("Selecione a turma e a data antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        class_schedule_id: selectedClassId,
        specific_date: selectedDate,
        instructor_name: selectedClass?.instructor_name || "",
        schedule_time: selectedClass?.training_schedule || "",
        attendance_list: attendance,
        present_count: presentCount,
        absent_count: totalCount - presentCount,
        total_students: totalCount,
        notes: `Chamada registrada em ${new Date().toLocaleString("pt-BR")}`,
      };

      if (existingRecord?.id) {
        await base44.entities.ClassDailyRecord.update(existingRecord.id, payload);
        toast.success("Chamada atualizada com sucesso!");
      } else {
        await base44.entities.ClassDailyRecord.create(payload);
        toast.success("Chamada registrada com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["daily-record", selectedClassId, selectedDate] });
    } catch (err) {
      toast.error("Erro ao salvar chamada: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Turmas ativas (agendadas ou em andamento)
  const activeClasses = classes.filter(c =>
    c.status === "Agendado" || c.status === "Confirmado" || c.status === "Em Andamento" || c.status === "Concluído"
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-600" />
          Chamada Presencial
        </h1>
        <p className="text-gray-500 text-sm mt-1">Registre a presença dos alunos por lista ou QR Code</p>
      </div>

      {/* Seleção de turma e data */}
      <Card className="border border-gray-200">
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Turma</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma..." />
                </SelectTrigger>
                <SelectContent>
                  {activeClasses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.training_name} — {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Data da Chamada</label>
              {availableDates.length > 0 ? (
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a data..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map(d => (
                      <SelectItem key={d} value={d}>
                        {new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              )}
            </div>
          </div>

          {/* Info da turma selecionada */}
          {selectedClass && (
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 border-t pt-3">
              {selectedClass.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedClass.location}</span>}
              {selectedClass.training_schedule && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedClass.training_schedule}</span>}
              {selectedClass.instructor_name && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selectedClass.instructor_name}</span>}
              <Badge variant="outline" className="text-xs">{selectedClass.status}</Badge>
              {existingRecord && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">Chamada já registrada — editando</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conteúdo principal — só aparece se turma selecionada */}
      {selectedClass && (
        <>
          {/* Modo de chamada */}
          <div className="flex gap-3">
            <Button
              variant={mode === "list" ? "default" : "outline"}
              className={mode === "list" ? "bg-gray-900 hover:bg-gray-800" : ""}
              onClick={() => setMode("list")}
            >
              <List className="w-4 h-4 mr-2" />
              Lista Rápida
            </Button>
            <Button
              variant={mode === "qr" ? "default" : "outline"}
              className={mode === "qr" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              onClick={() => setMode("qr")}
            >
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </Button>
          </div>

          {/* Barra de status */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
                <p className="text-xs text-gray-500">Presentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{totalCount - presentCount}</p>
                <p className="text-xs text-gray-500">Ausentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-700">{totalCount}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
            <div className="flex gap-2">
              {mode === "list" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => markAll(true)} className="text-xs">Marcar todos</Button>
                  <Button size="sm" variant="outline" onClick={() => markAll(false)} className="text-xs">Limpar</Button>
                </>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                Salvar Chamada
              </Button>
            </div>
          </div>

          {/* Modo Lista */}
          {mode === "list" && (
            <Card className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">Lista de Alunos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {studentList.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhum aluno cadastrado nesta turma.</p>
                    <p className="text-xs mt-1">Matricule alunos nesta turma ou inscreva-os pela Agenda para que apareçam aqui.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {studentList.map((student, idx) => {
                      const present = !!attendance[student.id];
                      return (
                        <li
                          key={student.id}
                          className={`flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${present ? "bg-emerald-50" : ""}`}
                          onClick={() => toggleAttendance(student.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}.</span>
                            <div>
                              <p className={`text-sm font-medium ${present ? "text-emerald-800" : "text-gray-800"}`}>{student.name}</p>
                              {student.cpf && <p className="text-xs text-gray-400">CPF: {student.cpf}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {present ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">Presente</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-400">Ausente</Badge>
                            )}
                            {present
                              ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                              : <Circle className="w-5 h-5 text-gray-300" />
                            }
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Modo QR Code */}
          {mode === "qr" && (
            <AttendanceQRPanel
              classSchedule={selectedClass}
              date={selectedDate}
              students={studentList}
              attendance={attendance}
              onPresenceConfirmed={handleQRPresence}
            />
          )}
        </>
      )}

      {!selectedClass && (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">Selecione uma turma para iniciar a chamada</p>
        </div>
      )}
    </div>
  );
}