import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Calendar, MapPin, Clock, AlertTriangle } from "lucide-react";
import { formatarCPF } from "@/lib/cpf";
import DocumentoFotoUpload from "@/components/inscricao/DocumentoFotoUpload";

const LGPD_TERMO = "Autorizo o uso dos meus dados pessoais e documentos para fins de cadastro, matrícula, emissão de certificado, validação acadêmica e cumprimento de obrigações legais da CAT Cursos.";
const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png";

const EMPTY_FORM = {
  nome_completo: "", cpf: "", telefone: "", email: "",
  endereco: "", cidade: "", estado: "", cep: "",
  data_nascimento: "", observacoes: "", indicacao: "", atendente_nome_manual: "",
};
const EMPTY_DOC = { tipo: "", arquivoFrente: null, arquivoVerso: null, cnh_numero: "", cnh_categoria: "", cnh_validade: "", cnh_renach: "", cnh_emissao: "" };

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function InscricaoAluno() {
  const params = new URLSearchParams(window.location.search);
  const tipoLink = params.get("tipo") || ""; // oferta | pacote | ""
  const linkId = params.get("id") || "";
  const atendenteId = params.get("atendente_id") || "";
  const atendenteNome = params.get("atendente") || "";

  const [ctx, setCtx] = useState(null);
  const [loadingCtx, setLoadingCtx] = useState(!!(tipoLink && linkId));
  const [form, setForm] = useState(EMPTY_FORM);
  const [doc, setDoc] = useState(EMPTY_DOC);
  const [lgpd, setLgpd] = useState(false);
  const [sending, setSending] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!tipoLink || !linkId) return;
    base44.functions.invoke("preCadastroPublico", {
      action: "contexto",
      ...(tipoLink === "pacote" ? { pacote_id: linkId } : { oferta_id: linkId }),
    }).then(res => setCtx(res.data)).catch(() => {}).finally(() => setLoadingCtx(false));
  }, [tipoLink, linkId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const oferta = ctx?.oferta;
  const pacote = ctx?.pacote;

  const handleEnviar = async () => {
    setErro("");
    if (!lgpd) { setErro("Para enviar, é necessário aceitar o termo de uso de dados (LGPD)."); return; }
    const faltando = [
      ["nome_completo", "Nome completo"], ["cpf", "CPF"], ["telefone", "Telefone/WhatsApp"], ["email", "E-mail"],
      ["endereco", "Endereço"], ["cidade", "Cidade"], ["estado", "Estado"], ["cep", "CEP"],
    ].filter(([k]) => !form[k].trim());
    if (faltando.length) { setErro(`Preencha os campos obrigatórios: ${faltando.map(([, l]) => l).join(", ")}.`); return; }

    setSending(true);
    try {
      const documentos = [];
      if (doc.arquivoFrente) {
        documentos.push({
          tipo: doc.tipo || "Outro", lado: doc.tipo === "CNH" ? "Frente" : "Único",
          mime: doc.arquivoFrente.type, base64: await fileToBase64(doc.arquivoFrente),
          cnh_numero: doc.cnh_numero, cnh_categoria: doc.cnh_categoria, cnh_validade: doc.cnh_validade,
          cnh_renach: doc.cnh_renach, cnh_emissao: doc.cnh_emissao,
        });
      }
      if (doc.tipo === "CNH" && doc.arquivoVerso) {
        documentos.push({ tipo: "CNH", lado: "Verso", mime: doc.arquivoVerso.type, base64: await fileToBase64(doc.arquivoVerso) });
      }

      const res = await base44.functions.invoke("preCadastroPublico", {
        action: "enviar",
        dados: {
          ...form,
          oferta_id: oferta?.id || "", oferta_nome: oferta?.nome_comercial || "",
          pacote_id: pacote?.id || "", pacote_nome: pacote?.nome || "",
          atendente_id: atendenteId,
          atendente_nome: atendenteNome || form.atendente_nome_manual,
          lgpd_aceito: true,
        },
        documentos,
      });
      if (res.data?.ok) setEnviado(true);
      else setErro(res.data?.error || "Não foi possível enviar. Tente novamente.");
    } catch (e) {
      setErro(e?.response?.data?.error || "Não foi possível enviar sua inscrição. Verifique os dados e tente novamente.");
    } finally {
      setSending(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-3">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Inscrição enviada!</h1>
          <p className="text-sm text-gray-600">
            Seu pré-cadastro foi recebido e está <strong>aguardando validação</strong> da equipe da CAT Cursos.
            Em breve um atendente entrará em contato pelo WhatsApp ou e-mail informado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Cabeçalho */}
      <div className="bg-gray-900 text-white px-4 py-6 text-center">
        <img src={LOGO} alt="CAT Cursos" className="h-14 mx-auto mb-2 object-contain" />
        <h1 className="text-lg font-bold">Inscrição de Aluno — CAT Cursos</h1>
        <p className="text-xs text-gray-300 mt-1">Preencha seus dados para se inscrever. Um atendente confirmará sua matrícula.</p>
      </div>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Curso/Pacote do QR Code */}
        {loadingCtx ? (
          <div className="bg-white rounded-xl p-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando informações do curso...
          </div>
        ) : oferta ? (
          <div className="bg-white rounded-xl p-4 border-l-4 border-emerald-500 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-emerald-700 uppercase">Você está se inscrevendo em:</p>
            <p className="font-bold text-gray-900">{oferta.nome_comercial}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {oferta.data_inicio} → {oferta.data_termino} {oferta.horario && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 ml-1" />{oferta.horario}</span>}</p>
            {oferta.local && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {oferta.local}</p>}
            <p className="text-sm font-bold text-emerald-700">R$ {(oferta.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            {oferta.vagas_disponiveis <= 0 && (
              <p className="text-xs text-orange-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Turma com vagas esgotadas — sua inscrição entrará em lista de espera.</p>
            )}
          </div>
        ) : pacote ? (
          <div className="bg-white rounded-xl p-4 border-l-4 border-purple-500 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-purple-700 uppercase">Você está se inscrevendo no pacote:</p>
            <p className="font-bold text-gray-900">{pacote.nome}</p>
            {(pacote.cursos || []).map((c, i) => (
              <p key={i} className="text-xs text-gray-500">• {c.course_name} — {c.data_inicio} → {c.data_termino}</p>
            ))}
            <p className="text-sm font-bold text-purple-700">R$ {(pacote.valor_final || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            {pacote.vagas_disponiveis <= 0 && (
              <p className="text-xs text-orange-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pacote com vagas esgotadas — sua inscrição entrará em lista de espera.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 border-l-4 border-blue-500 shadow-sm">
            <p className="text-sm text-gray-700">📋 <strong>Inscrição geral</strong> — o curso ou pacote será definido junto com o atendente após o envio.</p>
          </div>
        )}

        {atendenteNome && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800">
            👤 Atendente responsável: <strong>{atendenteNome}</strong>
          </div>
        )}

        {/* Dados pessoais */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-gray-800">Seus dados</p>
          <div><Label className="text-sm">Nome completo *</Label><Input className="h-11" value={form.nome_completo} onChange={e => set("nome_completo", e.target.value)} /></div>
          <div><Label className="text-sm">CPF *</Label><Input className="h-11" inputMode="numeric" value={form.cpf} onChange={e => set("cpf", formatarCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} /></div>
          <div><Label className="text-sm">Telefone / WhatsApp *</Label><Input className="h-11" inputMode="tel" value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(91) 99999-9999" /></div>
          <div><Label className="text-sm">E-mail *</Label><Input className="h-11" inputMode="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label className="text-sm">Data de nascimento</Label><Input className="h-11" type="date" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} /></div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-gray-800">Endereço</p>
          <div><Label className="text-sm">Endereço (rua, número, bairro) *</Label><Input className="h-11" value={form.endereco} onChange={e => set("endereco", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Label className="text-sm">Cidade *</Label><Input className="h-11" value={form.cidade} onChange={e => set("cidade", e.target.value)} /></div>
            <div><Label className="text-sm">UF *</Label><Input className="h-11" maxLength={2} value={form.estado} onChange={e => set("estado", e.target.value.toUpperCase())} placeholder="PA" /></div>
          </div>
          <div><Label className="text-sm">CEP *</Label><Input className="h-11" inputMode="numeric" value={form.cep} onChange={e => set("cep", e.target.value)} placeholder="00000-000" /></div>
        </div>

        {/* Documento */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-gray-800">Foto do documento <span className="font-normal text-gray-400 text-xs">(recomendado)</span></p>
          <p className="text-xs text-gray-500">Envie uma foto do seu RG, CPF ou CNH. O documento será conferido pela equipe.</p>
          <DocumentoFotoUpload doc={doc} setDoc={setDoc} />
        </div>

        {/* Opcionais */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-gray-800">Informações adicionais <span className="font-normal text-gray-400 text-xs">(opcional)</span></p>
          <div><Label className="text-sm">Quem indicou?</Label><Input className="h-11" value={form.indicacao} onChange={e => set("indicacao", e.target.value)} /></div>
          {!atendenteNome && (
            <div><Label className="text-sm">Atendente (se souber)</Label><Input className="h-11" value={form.atendente_nome_manual} onChange={e => set("atendente_nome_manual", e.target.value)} /></div>
          )}
          <div><Label className="text-sm">Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e => set("observacoes", e.target.value)} /></div>
        </div>

        {/* LGPD */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={lgpd} onChange={e => setLgpd(e.target.checked)} className="mt-1 w-5 h-5 accent-gray-900 flex-shrink-0" />
            <span className="text-xs text-gray-700 leading-relaxed">{LGPD_TERMO} <strong>*</strong></span>
          </label>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {erro}
          </div>
        )}

        <Button
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
          onClick={handleEnviar}
          disabled={sending || !lgpd}
        >
          {sending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</> : "Enviar inscrição"}
        </Button>
        <p className="text-center text-xs text-gray-400">Após o envio, sua inscrição ficará aguardando validação da equipe.</p>
      </div>
    </div>
  );
}