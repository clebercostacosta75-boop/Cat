import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, User, MapPin, FileText, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Dados Pessoais", "Endereço", "Documentos", "Confirmação"];

const EMPTY_FORM = {
  full_name: "", social_name: "", cpf: "", rg: "", rg_orgao_emissor: "",
  data_nascimento: "", sexo: "", email: "", whatsapp: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: ""
};

export default function AutoCadastroAluno() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [docs, setDocs] = useState({ rg_file: null, cpf_file: null, residencia_file: null });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [studentId, setStudentId] = useState(null);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleCEP = async (cep) => {
    set("cep", cep);
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(f => ({ ...f, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
        }
      } catch {}
    }
  };

  const uploadDoc = async (file, docType) => {
    if (!file) return null;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.cpf) { toast.error("Nome e CPF são obrigatórios"); return; }
    setSaving(true);
    try {
      // 1. Criar o aluno
      const student = await base44.entities.Student.create({ ...form, status: "Ativo" });
      setStudentId(student.id);

      // 2. Processar documentos com OCR
      const docEntries = [
        { key: "rg_file", type: "RG" },
        { key: "cpf_file", type: "CPF" },
        { key: "residencia_file", type: "Comprovante_Residencia" }
      ];

      for (const entry of docEntries) {
        const file = docs[entry.key];
        if (file) {
          setUploading(true);
          const fileUrl = await uploadDoc(file, entry.type);
          if (fileUrl) {
            await base44.functions.invoke("processarDocumentoOCR", {
              file_url: fileUrl,
              document_type: entry.type,
              student_id: student.id,
              student_name: form.full_name,
              student_cpf: form.cpf,
              auto_cadastro: true,
              uploaded_by_email: form.email || "auto_cadastro"
            });
          }
        }
      }

      setDone(true);
      toast.success("Cadastro enviado com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar cadastro: " + err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro Realizado!</h2>
            <p className="text-gray-600 mb-4">
              Seus dados foram enviados com sucesso. Nossa equipe irá revisar as informações e entrará em contato em breve.
            </p>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Seus documentos foram armazenados com segurança conforme a LGPD.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png"
            alt="CAT Logo" className="h-12 mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-gray-900">Auto-Cadastro de Aluno</h1>
          <p className="text-gray-500 text-sm mt-1">Preencha seus dados para se matricular</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${i < step ? "bg-green-600 text-white" : i === step ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"}`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-medium text-gray-700 mb-6">{STEPS[step]}</p>

        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-6 space-y-4">

            {/* STEP 0: Dados Pessoais */}
            {step === 0 && (
              <>
                <div>
                  <Label>Nome Completo *</Label>
                  <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Como consta no documento" />
                </div>
                <div>
                  <Label>Nome Social</Label>
                  <Input value={form.social_name} onChange={e => set("social_name", e.target.value)} placeholder="Opcional" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CPF *</Label>
                    <Input value={form.cpf} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>RG</Label>
                    <Input value={form.rg} onChange={e => set("rg", e.target.value)} />
                  </div>
                  <div>
                    <Label>Órgão Emissor</Label>
                    <Input value={form.rg_orgao_emissor} onChange={e => set("rg_orgao_emissor", e.target.value)} placeholder="SSP/PA" />
                  </div>
                </div>
                <div>
                  <Label>Sexo</Label>
                  <Select value={form.sexo} onValueChange={v => set("sexo", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                      <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>E-mail</Label>
                    <Input value={form.email} onChange={e => set("email", e.target.value)} type="email" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="(91) 99999-9999" />
                  </div>
                </div>
              </>
            )}

            {/* STEP 1: Endereço */}
            {step === 1 && (
              <>
                <div>
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={e => handleCEP(e.target.value)} placeholder="00000-000" maxLength={9} />
                  <p className="text-xs text-gray-400 mt-1">Preenchimento automático ao digitar o CEP</p>
                </div>
                <div>
                  <Label>Logradouro</Label>
                  <Input value={form.logradouro} onChange={e => set("logradouro", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Número</Label>
                    <Input value={form.numero} onChange={e => set("numero", e.target.value)} />
                  </div>
                  <div>
                    <Label>Complemento</Label>
                    <Input value={form.complemento} onChange={e => set("complemento", e.target.value)} placeholder="Apto, Bloco..." />
                  </div>
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input value={form.bairro} onChange={e => set("bairro", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.cidade} onChange={e => set("cidade", e.target.value)} />
                  </div>
                  <div>
                    <Label>Estado (UF)</Label>
                    <Input value={form.estado} onChange={e => set("estado", e.target.value)} placeholder="PA" maxLength={2} />
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Documentos */}
            {step === 2 && (
              <>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Seus documentos são armazenados com segurança e criptografia. Somente nossa equipe tem acesso, conforme a <strong>LGPD</strong>.
                  </p>
                </div>

                {[
                  { key: "rg_file", label: "RG (frente e verso ou foto)", required: true },
                  { key: "cpf_file", label: "CPF (opcional se constar no RG)" },
                  { key: "residencia_file", label: "Comprovante de Residência (opcional)" }
                ].map(({ key, label, required }) => (
                  <div key={key}>
                    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
                    <div className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                      ${docs[key] ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
                      onClick={() => document.getElementById(key).click()}>
                      <input id={key} type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => setDocs(d => ({ ...d, [key]: e.target.files[0] }))} />
                      {docs[key] ? (
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">{docs[key].name}</span>
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <Upload className="w-8 h-8 mx-auto mb-1" />
                          <p className="text-sm">Clique para selecionar o arquivo</p>
                          <p className="text-xs">JPG, PNG ou PDF</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* STEP 3: Confirmação */}
            {step === 3 && (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Confirme seus dados:</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Nome:</span><span className="font-medium">{form.full_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">CPF:</span><span className="font-medium">{form.cpf}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">E-mail:</span><span className="font-medium">{form.email || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">WhatsApp:</span><span className="font-medium">{form.whatsapp || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Cidade:</span><span className="font-medium">{form.cidade || "—"}</span></div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Documentos:</span>
                      <div className="flex gap-1">
                        {docs.rg_file && <Badge className="bg-green-100 text-green-800 text-xs">RG</Badge>}
                        {docs.cpf_file && <Badge className="bg-green-100 text-green-800 text-xs">CPF</Badge>}
                        {docs.residencia_file && <Badge className="bg-green-100 text-green-800 text-xs">Residência</Badge>}
                        {!docs.rg_file && !docs.cpf_file && !docs.residencia_file && <span className="text-gray-400">Nenhum</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      Ao confirmar, você concorda que seus dados serão tratados conforme nossa Política de Privacidade e a LGPD (Lei 13.709/2018).
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2 border-t">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>Voltar</Button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <Button
                  className="bg-gray-900 hover:bg-gray-800"
                  onClick={() => {
                    if (step === 0 && (!form.full_name || !form.cpf)) { toast.error("Nome e CPF são obrigatórios"); return; }
                    setStep(s => s + 1);
                  }}>
                  Próximo
                </Button>
              ) : (
                <Button
                  className="bg-green-700 hover:bg-green-800"
                  onClick={handleSubmit}
                  disabled={saving || uploading}>
                  {(saving || uploading) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Cadastro</>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}