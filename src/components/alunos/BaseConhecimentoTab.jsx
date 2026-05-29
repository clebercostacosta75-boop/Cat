import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Clock, CheckCircle } from "lucide-react";

export default function BaseConhecimentoTab() {
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["knowledge-base-entries"],
    queryFn: () => base44.entities.KnowledgeBaseEntry.list("-created_date", 100),
    initialData: [],
  });

  const activeEntries = entries.filter(e => e.is_active !== false);

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
  const searchNorm = norm(search);
  
  const filtered = !searchNorm 
    ? activeEntries 
    : activeEntries.filter(e => 
        norm(e.title).includes(searchNorm) || 
        norm(e.category).includes(searchNorm) ||
        (e.keywords || []).some(k => norm(k).includes(searchNorm))
      );

  const categoryColors = {
    "Curso": "bg-blue-100 text-blue-800",
    "Treinamento": "bg-purple-100 text-purple-800",
    "Preço": "bg-green-100 text-green-800",
    "Localização": "bg-orange-100 text-orange-800",
    "Calendário": "bg-pink-100 text-pink-800",
    "Política": "bg-indigo-100 text-indigo-800",
    "FAQ": "bg-yellow-100 text-yellow-800",
    "Processo de Matrícula": "bg-cyan-100 text-cyan-800",
    "Documentação": "bg-emerald-100 text-emerald-800",
    "Outros": "bg-gray-100 text-gray-800",
  };

  const targetAudienceIcons = {
    "Pessoa Física": "👤",
    "Pessoa Jurídica": "🏢",
    "Ambos": "👥",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Base de Conhecimento</p>
          <p className="text-xs text-indigo-700 mt-0.5">{activeEntries.length} entrada(s) ativa(s) — utilizada pelo Agente de IA Comercial</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input 
          placeholder="Buscar por título, categoria ou palavras-chave..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-10" 
        />
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{search ? `Nenhum resultado para "${search}"` : "Nenhuma entrada ativa"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(entry => (
                <div key={entry.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{entry.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{entry.content}</p>
                      </div>
                      <Badge className={`flex-shrink-0 text-xs ${categoryColors[entry.category] || categoryColors["Outros"]}`}>
                        {entry.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {entry.target_audience && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700">
                          {targetAudienceIcons[entry.target_audience] || "👥"} {entry.target_audience}
                        </span>
                      )}

                      {entry.keywords && entry.keywords.length > 0 && (
                        <span className="flex items-center gap-1 text-gray-500">
                          🏷️ {entry.keywords.slice(0, 2).join(", ")}{entry.keywords.length > 2 ? "..." : ""}
                        </span>
                      )}

                      {entry.valid_until && (
                        <span className={`flex items-center gap-1 ${new Date(entry.valid_until) < new Date() ? "text-red-600" : "text-green-600"}`}>
                          <Clock className="w-3 h-3" /> Até {new Date(entry.valid_until).toLocaleDateString("pt-BR")}
                        </span>
                      )}

                      {entry.is_active && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" /> Ativo
                        </span>
                      )}
                    </div>

                    {entry.price_info && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                        💰 <strong>Preço:</strong> PF: R$ {entry.price_info.price_pf} | PJ: R$ {entry.price_info.price_pj}
                        {entry.price_info.price_notes && <p className="mt-1 italic">{entry.price_info.price_notes}</p>}
                      </div>
                    )}

                    {entry.schedule_info && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                        📅 <strong>Agenda:</strong> {entry.schedule_info.duration} | {entry.schedule_info.modality}
                        {entry.schedule_info.location && <p>📍 {entry.schedule_info.location}</p>}
                        {entry.schedule_info.next_dates && (
                          <p>Próximas datas: {entry.schedule_info.next_dates.slice(0, 3).join(", ")}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 text-center pt-2">
        Exibindo {filtered.length} de {activeEntries.length} entrada(s) ativa(s)
      </div>
    </div>
  );
}