import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const STATUS_CLS = {
  "Pendente": "bg-yellow-100 text-yellow-800",
  "Processando": "bg-blue-100 text-blue-800",
  "Enviada": "bg-green-100 text-green-800",
  "Falha no envio": "bg-red-100 text-red-800",
  "Cancelada": "bg-gray-100 text-gray-600",
};

export default function AbaFila() {
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acaoId, setAcaoId] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const lista = await base44.entities.FilaMensagem.list("-created_date", 100).catch(() => []);
    setMensagens(lista);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const reenviar = async (msg) => {
    setAcaoId(msg.id);
    try {
      const res = await base44.functions.invoke("processarFilaMensagens", { message_id: msg.id });
      const r = res.data?.resultados?.[0];
      if (r?.status === "Enviada") toast.success("Mensagem reenviada com sucesso");
      else toast.error(`Reenvio falhou: ${r?.erro || "erro desconhecido"}`);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    }
    setAcaoId("");
    carregar();
  };

  const cancelar = async (msg) => {
    setAcaoId(msg.id);
    await base44.entities.FilaMensagem.update(msg.id, { status: "Cancelada" });
    toast.success("Mensagem cancelada");
    setAcaoId("");
    carregar();
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Fila de mensagens ({mensagens.length})</CardTitle>
        <Button variant="outline" size="sm" onClick={carregar}><RefreshCw className="w-4 h-4" /> Atualizar</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : mensagens.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Nenhuma mensagem na fila. A fila é processada automaticamente a cada 5 minutos.</p>
        ) : (
          <div className="space-y-2">
            {mensagens.map((m) => (
              <div key={m.id} className="border rounded-md p-3 flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{m.canal}</Badge>
                    <Badge className={STATUS_CLS[m.status] || ""}>{m.status}</Badge>
                    <span className="text-sm font-medium text-gray-800">{m.destinatario}</span>
                    {m.student_name && <span className="text-xs text-gray-500">({m.student_name})</span>}
                    <span className="text-xs text-gray-400">tentativas: {m.tentativas || 0}/{m.max_tentativas || 3}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate max-w-xl mt-1">{m.mensagem}</p>
                  {m.erro && <p className="text-xs text-red-600 mt-1">Erro: {m.erro}</p>}
                </div>
                <div className="flex gap-2">
                  {["Falha no envio", "Cancelada"].includes(m.status) && (
                    <Button size="sm" variant="outline" disabled={acaoId === m.id} onClick={() => reenviar(m)}>
                      {acaoId === m.id && <Loader2 className="w-3 h-3 animate-spin" />} Reenviar
                    </Button>
                  )}
                  {m.status === "Pendente" && (
                    <Button size="sm" variant="ghost" disabled={acaoId === m.id} onClick={() => cancelar(m)}>Cancelar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}