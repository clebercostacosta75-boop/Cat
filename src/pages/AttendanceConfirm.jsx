/**
 * Página pública — o aluno confirma a presença ao escanear o QR Code.
 * Funciona sem login.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, Users, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceConfirm() {
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("classId");
  const date = params.get("date");
  const studentId = params.get("studentId");
  const studentName = params.get("studentName");
  const className = params.get("className");
  const company = params.get("company");

  const isGeneral = !studentId; // QR geral: aluno digita o nome
  const [name, setName] = useState(studentName || "");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | already
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    if (!name.trim()) return;
    setStatus("loading");

    try {
      // Buscar registro diário existente
      const records = await base44.entities.ClassDailyRecord.filter({
        class_schedule_id: classId,
        specific_date: date,
      });

      const existing = records[0];
      const attendanceList = existing?.attendance_list || {};

      // Verificar se já confirmou
      const key = studentId || name.trim();
      if (attendanceList[key] === true) {
        setStatus("already");
        setMessage("Sua presença já havia sido confirmada anteriormente.");
        return;
      }

      // Atualizar presença
      attendanceList[key] = true;
      const presentCount = Object.values(attendanceList).filter(Boolean).length;

      if (existing?.id) {
        await base44.entities.ClassDailyRecord.update(existing.id, {
          attendance_list: attendanceList,
          present_count: presentCount,
        });
      } else {
        await base44.entities.ClassDailyRecord.create({
          class_schedule_id: classId,
          specific_date: date,
          attendance_list: attendanceList,
          present_count: presentCount,
          notes: `Chamada iniciada via QR Code em ${new Date().toLocaleString("pt-BR")}`,
        });
      }

      setStatus("success");
      setMessage("Sua presença foi registrada com sucesso!");
    } catch (err) {
      setStatus("error");
      setMessage("Erro ao registrar presença. Tente novamente ou informe ao instrutor.");
    }
  };

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-5 text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT" className="h-8 mx-auto mb-3 object-contain brightness-0 invert"
          />
          <h1 className="text-lg font-bold">Confirmação de Presença</h1>
          <p className="text-emerald-200 text-xs mt-0.5">CAT Cursos — Chamada Digital</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Info do treinamento */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="font-medium text-gray-800">{className || "Treinamento"}</span>
            </div>
            {company && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">{company}</span>
              </div>
            )}
            {date && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 capitalize">{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Estados */}
          {status === "success" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-emerald-600" />
              </div>
              <p className="font-bold text-gray-900 text-lg">Presença Confirmada!</p>
              <p className="text-sm text-gray-500">{message}</p>
              {name && <p className="text-xs text-gray-400 font-medium">{name}</p>}
            </div>
          )}

          {status === "already" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-blue-500" />
              </div>
              <p className="font-bold text-gray-900">Já registrado!</p>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9 text-red-500" />
              </div>
              <p className="font-bold text-gray-900">Erro ao registrar</p>
              <p className="text-sm text-gray-500">{message}</p>
              <Button onClick={() => setStatus("idle")} variant="outline" size="sm">Tentar novamente</Button>
            </div>
          )}

          {(status === "idle" || status === "loading") && (
            <div className="space-y-4">
              {/* Nome do aluno */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  {isGeneral ? "Seu nome completo" : "Confirmar identidade"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  readOnly={!isGeneral && !!studentName}
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${!isGeneral && studentName ? "bg-gray-50 text-gray-600" : ""}`}
                />
              </div>

              <Button
                onClick={handleConfirm}
                disabled={!name.trim() || status === "loading"}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Confirmar Presença
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 text-center">
          <p className="text-xs text-gray-400">CAT Cursos • Sistema de Chamada Digital</p>
        </div>
      </div>
    </div>
  );
}