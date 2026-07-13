import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const fmt = (d) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

export default function AbaLogsComunicacao() {
  const [msgs, setMsgs] = useState(null);
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    base44.entities.MensagemComunicacao.list("-created_date", 50).then(setMsgs).catch(() => setMsgs([]));
    base44.entities.LogNotificacoes.list("-created_date", 50).then(setLogs).catch(() => setLogs([]));
  }, []);

  if (!msgs || !logs) {
    return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de mensagens (Gestão Acadêmica) — últimas {msgs.length}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {msgs.length === 0 && <p className="text-sm text-gray-500">Nenhum registro.</p>}
          {msgs.map((m) => (
            <div key={m.id} className="border-b last:border-0 pb-2 text-sm flex flex-wrap gap-2 items-center">
              <Badge variant="outline">{m.canal}</Badge>
              <span className="font-medium">{m.student_name}</span>
              <span className="text-gray-500">{m.evento_label}</span>
              <Badge className={m.status?.includes("Falha") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}>{m.status}</Badge>
              <span className="text-xs text-gray-400 ml-auto">{fmt(m.created_date)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Log de notificações (alertas/certificados) — últimas {logs.length}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-gray-500">Nenhum registro.</p>}
          {logs.map((l) => (
            <div key={l.id} className="border-b last:border-0 pb-2 text-sm flex flex-wrap gap-2 items-center">
              <Badge variant="outline">{l.tipo}</Badge>
              <span className="font-medium">{l.aluno_nome || l.empresa_nome || "—"}</span>
              <span className="text-gray-500">{l.evento}</span>
              <Badge className={l.status === "erro" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>{l.status}</Badge>
              <span className="text-xs text-gray-400 ml-auto">{fmt(l.data_envio || l.created_date)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}