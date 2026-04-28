import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Award, CheckCircle, XCircle, PenLine, Trash2,
  Search, ChevronRight, ChevronLeft, Filter,
  Loader2, AlertTriangle, Users
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try { return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return dateStr; }
}

// Componente do pad de assinatura reutilizável
function SignaturePad({ onSigned, onSkip, certName, certCourse }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasDrawn(false);
  }, [certName]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => { e.preventDefault(); isDrawing.current = true; lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos; setHasDrawn(true);
  };
  const endDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!hasDrawn) return;
    setSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(signatureDataUrl)).blob();
      const file = new File([blob], "assinatura.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onSigned(file_url);
    } catch {
      toast.error("Erro ao salvar assinatura. Tente novamente.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center mb-2">
        <p className="font-semibold text-gray-800">{certName}</p>
        <p className="text-sm text-emerald-700">{certCourse}</p>
      </div>
      <div className="border-2 border-dashed border-emerald-300 rounded-xl overflow-hidden bg-gray-50">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full touch-none cursor-crosshair"
          style={{ display: "block", background: "#fff" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400">
          {hasDrawn ? "✓ Assinatura desenhada" : "Desenhe sua assinatura acima"}
        </p>
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <Trash2 className="w-3 h-3 mr-1" /> Limpar
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onSkip}>
          Pular
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          disabled={!hasDrawn || signing}
          onClick={handleSign}
        >
          {signing
            ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</>
            : <><CheckCircle className="w-4 h-4 mr-1" /> Assinar</>
          }
        </Button>
      </div>
    </div>
  );
}

export default function BulkSign() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("todos");
  const [currentIdx, setCurrentIdx] = useState(null); // índice do cert sendo assinado
  const [signedIds, setSignedIds] = useState(new Set());
  const [skippedIds, setSkippedIds] = useState(new Set());

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["bulk-sign-certs"],
    queryFn: () => base44.entities.Certificate.filter({ status: "pending_signature" }, "-created_date", 200),
  });

  const signMutation = useMutation({
    mutationFn: ({ certId, signatureUrl }) =>
      base44.entities.Certificate.update(certId, {
        status: "signed",
        signature_url: signatureUrl,
        signed_at: new Date().toISOString(),
        signed_device: navigator.userAgent,
      }),
    onSuccess: (_, { certId }) => {
      setSignedIds(prev => new Set([...prev, certId]));
      toast.success("Certificado assinado!");
      goNext();
    },
    onError: () => toast.error("Erro ao assinar. Tente novamente."),
  });

  // Filtros
  const courses = [...new Set(certs.map(c => c.course_name).filter(Boolean))].sort();

  const filtered = certs.filter(c => {
    const matchSearch = !search ||
      c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.student_cpf?.includes(search) ||
      c.certificate_code?.toLowerCase().includes(search.toLowerCase());
    const matchCourse = filterCourse === "todos" || c.course_name === filterCourse;
    return matchSearch && matchCourse;
  });

  const pending = filtered.filter(c => !signedIds.has(c.id) && !skippedIds.has(c.id));
  const signed = filtered.filter(c => signedIds.has(c.id));

  const openFirst = () => {
    if (pending.length > 0) setCurrentIdx(0);
  };

  const goNext = () => {
    // Após assinar/pular, avança para o próximo pendente
    setCurrentIdx(prev => {
      const nextPending = pending.filter(c => !signedIds.has(c.id) && !skippedIds.has(c.id));
      if (nextPending.length <= 1) return null;
      return 0; // sempre pega o primeiro da lista atualizada
    });
  };

  const handleSigned = (certId, signatureUrl) => {
    signMutation.mutate({ certId, signatureUrl });
  };

  const handleSkip = (certId) => {
    setSkippedIds(prev => new Set([...prev, certId]));
    toast.info("Certificado pulado.");
    goNext();
  };

  const currentCerts = pending.filter(c => !signedIds.has(c.id) && !skippedIds.has(c.id));
  const activeCert = currentIdx !== null ? currentCerts[currentIdx] ?? currentCerts[0] : null;

  const resetSession = () => {
    setSignedIds(new Set());
    setSkippedIds(new Set());
    setCurrentIdx(null);
    queryClient.invalidateQueries({ queryKey: ["bulk-sign-certs"] });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PenLine className="w-6 h-6 text-emerald-600" />
            Assinatura em Massa
          </h1>
          <p className="text-gray-500 text-sm mt-1">Assine múltiplos certificados pendentes de forma rápida</p>
        </div>
        {signedIds.size > 0 && (
          <Button variant="outline" size="sm" onClick={resetSession}>
            Reiniciar sessão
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pendentes", value: certs.length, color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Nesta sessão", value: pending.filter(c => !signedIds.has(c.id) && !skippedIds.has(c.id)).length, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Assinados agora", value: signedIds.size, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Pulados", value: skippedIds.size, color: "bg-gray-50 border-gray-200 text-gray-600" },
        ].map(s => (
          <div key={s.label} className={`border rounded-lg p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Painel de assinatura ativa */}
      {activeCert ? (
        <div className="bg-white border-2 border-emerald-300 rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <PenLine className="w-5 h-5 text-emerald-600" />
              Assinando agora
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-1">
              {currentCerts.indexOf(activeCert) + 1} de {currentCerts.length}
            </span>
          </div>
          <SignaturePad
            key={activeCert.id}
            certName={activeCert.student_name}
            certCourse={activeCert.course_name}
            onSigned={(url) => handleSigned(activeCert.id, url)}
            onSkip={() => handleSkip(activeCert.id)}
          />
        </div>
      ) : currentCerts.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">{currentCerts.length} certificado{currentCerts.length !== 1 ? "s" : ""} aguardando assinatura</h3>
          <p className="text-sm text-gray-500 mb-4">Clique em iniciar para assinar um por um</p>
          <Button onClick={openFirst} className="bg-emerald-600 hover:bg-emerald-700">
            <PenLine className="w-4 h-4 mr-2" /> Iniciar Assinaturas
          </Button>
        </div>
      ) : signedIds.size > 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-semibold text-emerald-800 mb-1">Sessão concluída!</h3>
          <p className="text-sm text-emerald-600">{signedIds.size} certificado{signedIds.size !== 1 ? "s" : ""} assinado{signedIds.size !== 1 ? "s" : ""} com sucesso</p>
          <Button className="mt-4" variant="outline" onClick={resetSession}>Nova sessão</Button>
        </div>
      ) : null}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar aluno, CPF, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white text-gray-700"
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
        >
          <option value="todos">Todos os cursos</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Lista de certificados */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          Nenhum certificado pendente encontrado.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{filtered.length} certificado{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map(cert => {
            const isSigned = signedIds.has(cert.id);
            const isSkipped = skippedIds.has(cert.id);
            const isActive = activeCert?.id === cert.id;

            return (
              <div
                key={cert.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all
                  ${isActive ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300" : ""}
                  ${isSigned ? "border-emerald-200 bg-emerald-50/40" : ""}
                  ${isSkipped ? "border-gray-200 bg-gray-50 opacity-60" : ""}
                  ${!isSigned && !isSkipped && !isActive ? "border-gray-200 bg-white hover:border-emerald-200" : ""}
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{cert.student_name}</span>
                    {isSigned && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Assinado ✓</Badge>}
                    {isSkipped && <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Pulado</Badge>}
                    {isActive && <Badge className="bg-emerald-600 text-white border-0 text-xs">Assinando agora</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{cert.course_name} {cert.client_name ? `• ${cert.client_name}` : ""}</p>
                  {cert.certificate_code && <p className="text-xs text-gray-400 font-mono">{cert.certificate_code}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 hidden sm:block">{formatDate(cert.end_date)}</span>
                  {!isSigned && !isSkipped && !isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => {
                        const idx = currentCerts.indexOf(cert);
                        setCurrentIdx(idx >= 0 ? idx : 0);
                      }}
                    >
                      <PenLine className="w-3 h-3 mr-1" /> Assinar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}