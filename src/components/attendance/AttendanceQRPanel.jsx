/**
 * Painel de chamada via QR Code.
 * O instrutor exibe um QR Code por aluno (ou um geral da turma).
 * O aluno escaneia, abre a página pública /AttendanceConfirm e confirma a presença.
 */
import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ChevronLeft, ChevronRight, QrCode, Users } from "lucide-react";

export default function AttendanceQRPanel({ classSchedule, date, students, attendance, onPresenceConfirmed }) {
  const [activeIndex, setActiveIndex] = useState(0); // qual aluno está exibindo QR
  const [mode, setMode] = useState("individual"); // "individual" | "general"

  const baseUrl = window.location.origin;

  // URL para QR individual
  const buildStudentUrl = (student) => {
    const params = new URLSearchParams({
      classId: classSchedule.id,
      date,
      studentId: student.id,
      studentName: student.name,
    });
    return `${baseUrl}/AttendanceConfirm?${params.toString()}`;
  };

  // URL geral da turma (aluno digita o nome)
  const buildGeneralUrl = () => {
    const params = new URLSearchParams({
      classId: classSchedule.id,
      date,
      className: classSchedule.training_name,
      company: classSchedule.company_name,
    });
    return `${baseUrl}/AttendanceConfirm?${params.toString()}`;
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const activeStudent = students[activeIndex];

  return (
    <div className="space-y-4">
      {/* Toggle modo */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "individual" ? "default" : "outline"}
          className={mode === "individual" ? "bg-gray-900 hover:bg-gray-800" : ""}
          onClick={() => setMode("individual")}
        >
          QR por Aluno
        </Button>
        <Button
          size="sm"
          variant={mode === "general" ? "default" : "outline"}
          className={mode === "general" ? "bg-gray-900 hover:bg-gray-800" : ""}
          onClick={() => setMode("general")}
        >
          QR Geral da Turma
        </Button>
      </div>

      {/* QR Individual */}
      {mode === "individual" && students.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* QR Display */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center gap-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">QR Code do Aluno</p>
            <div className="p-4 bg-white rounded-xl border-2 border-gray-100 shadow-inner">
              <QRCodeSVG
                value={buildStudentUrl(activeStudent)}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">{activeStudent?.name}</p>
              {activeStudent?.cpf && <p className="text-xs text-gray-400">CPF: {activeStudent.cpf}</p>}
            </div>

            {attendance[activeStudent?.id] ? (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-sm px-4 py-1">
                <CheckCircle className="w-4 h-4 mr-1" /> Presença Confirmada
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400 text-sm px-4 py-1">
                <Circle className="w-4 h-4 mr-1" /> Aguardando leitura...
              </Badge>
            )}

            {/* Navegação */}
            <div className="flex items-center gap-4 mt-2">
              <Button
                variant="outline"
                size="icon"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex(i => i - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500">{activeIndex + 1} / {students.length}</span>
              <Button
                variant="outline"
                size="icon"
                disabled={activeIndex === students.length - 1}
                onClick={() => setActiveIndex(i => i + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Lista lateral */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Lista de Presença
              </p>
              <span className="text-xs text-emerald-600 font-bold">{presentCount}/{students.length} presentes</span>
            </div>
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {students.map((s, i) => {
                const present = !!attendance[s.id];
                return (
                  <li
                    key={s.id}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${i === activeIndex ? "bg-blue-50 border-l-2 border-blue-400" : ""}`}
                    onClick={() => setActiveIndex(i)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 w-5">{i + 1}.</span>
                      <span className={`text-sm ${present ? "text-emerald-700 font-medium" : "text-gray-700"}`}>{s.name}</span>
                    </div>
                    {present
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : <Circle className="w-4 h-4 text-gray-200" />
                    }
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* QR Geral */}
      {mode === "general" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">QR Code Geral — {classSchedule.training_name}</p>
          <div className="p-5 bg-white rounded-xl border-2 border-gray-100 shadow-inner">
            <QRCodeSVG
              value={buildGeneralUrl()}
              size={240}
              level="H"
              includeMargin
            />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-gray-800">{classSchedule.training_name}</p>
            <p className="text-sm text-gray-500">{classSchedule.company_name}</p>
            <p className="text-xs text-gray-400">
              {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
          </div>
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Mostre este QR Code para todos os alunos escanearem com o celular e confirmarem a presença.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
            <p className="text-xs text-emerald-600">confirmações recebidas</p>
          </div>
        </div>
      )}

      {/* Se não há alunos */}
      {mode === "individual" && students.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Nenhum aluno cadastrado ainda.</p>
          <p className="text-xs mt-1">Emita os certificados para os alunos aparecerem aqui.</p>
        </div>
      )}
    </div>
  );
}