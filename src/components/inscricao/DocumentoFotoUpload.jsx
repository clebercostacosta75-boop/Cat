import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CheckCircle, X } from "lucide-react";

const MAX_MB = 8;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function FileButton({ label, file, onPick, onClear }) {
  const inputId = `doc-file-${label.replace(/\W/g, "")}`;
  return (
    <div>
      <input id={inputId} type="file" accept={ACCEPT} capture="environment" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > MAX_MB * 1024 * 1024) { alert(`Arquivo muito grande. Máximo ${MAX_MB}MB.`); e.target.value = ""; return; }
          onPick(f);
          e.target.value = "";
        }} />
      {file ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-300 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 truncate flex-1">{label}: {file.name}</span>
          <button type="button" onClick={onClear} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label htmlFor={inputId} className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 cursor-pointer hover:border-gray-400 active:bg-gray-50">
          <Camera className="w-5 h-5" /> {label}
        </label>
      )}
    </div>
  );
}

export default function DocumentoFotoUpload({ doc, setDoc }) {
  const set = (k, v) => setDoc(d => ({ ...d, [k]: v }));
  const isCNH = doc.tipo === "CNH";

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Tipo de documento</Label>
        <Select value={doc.tipo} onValueChange={v => set("tipo", v)}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o documento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RG">RG</SelectItem>
            <SelectItem value="CPF">CPF</SelectItem>
            <SelectItem value="CNH">CNH</SelectItem>
            <SelectItem value="Outro">Outro documento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <FileButton
        label={isCNH ? "📷 Foto da CNH (frente)" : "📷 Foto do documento"}
        file={doc.arquivoFrente}
        onPick={f => set("arquivoFrente", f)}
        onClear={() => set("arquivoFrente", null)}
      />

      {isCNH && (
        <>
          <FileButton
            label="📷 Foto da CNH (verso) — se necessário"
            file={doc.arquivoVerso}
            onPick={f => set("arquivoVerso", f)}
            onClear={() => set("arquivoVerso", null)}
          />
          <p className="text-xs text-gray-500">Dados da CNH (opcionais — podem ser conferidos depois pelo atendente):</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Nº da CNH</Label><Input className="h-10" value={doc.cnh_numero} onChange={e => set("cnh_numero", e.target.value)} /></div>
            <div><Label className="text-xs">Categoria</Label><Input className="h-10" value={doc.cnh_categoria} onChange={e => set("cnh_categoria", e.target.value)} placeholder="Ex: AB" /></div>
            <div><Label className="text-xs">Validade</Label><Input className="h-10" type="date" value={doc.cnh_validade} onChange={e => set("cnh_validade", e.target.value)} /></div>
            <div><Label className="text-xs">RENACH (se houver)</Label><Input className="h-10" value={doc.cnh_renach} onChange={e => set("cnh_renach", e.target.value)} /></div>
            <div className="col-span-2"><Label className="text-xs">Data de emissão (se houver)</Label><Input className="h-10" type="date" value={doc.cnh_emissao} onChange={e => set("cnh_emissao", e.target.value)} /></div>
          </div>
        </>
      )}
    </div>
  );
}