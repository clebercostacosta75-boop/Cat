/**
 * CanvasEditor — Editor visual drag-and-drop para certificados
 * Suporta frente e verso separados, salvar layout global ou individual.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Type, Image, QrCode, PenLine, Plus, Trash2,
  Copy, ChevronUp, ChevronDown, Grid3X3, Save,
  Eye, EyeOff, Lock, Unlock, AlignCenter, AlignLeft, AlignRight,
  Bold, Italic, Underline as UnderlineIcon, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const MM_TO_PX = 3.7795;
const CANVAS_W = Math.round(297 * MM_TO_PX);
const CANVAS_H = Math.round(210 * MM_TO_PX);
const SNAP = 4;

function snapToGrid(val) {
  return Math.round(val / SNAP) * SNAP;
}

// ─── Default elements for FRONT ────────────────────────────────────────────
const DEFAULT_FRONT = (model) => {
  const hl = model?.text_formatting?.highlightColor || "#059669";
  const dark = "#222222";
  const font = "Arial, sans-serif";
  return [
    { id: "title", type: "text", label: "Título", x: 200, y: 30, w: 720, h: 60, text: model?.front_title || "CERTIFICADO", fontSize: 36, bold: true, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 10 },
    { id: "subtitle", type: "text", label: "Subtítulo", x: 200, y: 90, w: 720, h: 36, text: model?.front_subtitle || "CAPACITAÇÃO PROFISSIONAL", fontSize: 14, bold: false, italic: false, underline: false, color: hl, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 11 },
    { id: "cert_label", type: "text", label: "Certificamos que", x: 200, y: 160, w: 720, h: 28, text: model?.front_certification_label || "CERTIFICAMOS QUE", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 12 },
    { id: "student_name", type: "text", label: "Nome do Aluno", x: 100, y: 200, w: 920, h: 50, text: "JOÃO DA SILVA SANTOS", fontSize: 26, bold: true, italic: false, underline: true, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 13 },
    { id: "body_text", type: "text", label: "Texto do Corpo", x: 100, y: 270, w: 920, h: 100, text: "concluiu com êxito o treinamento, sendo considerado APTO para o desempenho seguro de suas atividades.", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "justify", fontFamily: font, locked: false, visible: true, zIndex: 14 },
    { id: "location_date", type: "text", label: "Local e Data", x: 200, y: 390, w: 720, h: 28, text: model?.front_location_date || "Barcarena/PA, [DATA_EMISSAO]", fontSize: 11, bold: false, italic: false, underline: false, color: dark, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 15 },
    { id: "footer_url", type: "text", label: "Rodapé", x: 20, y: 740, w: 400, h: 24, text: model?.front_footer_line2 || "www.catcursos.com.br", fontSize: 8, bold: false, italic: false, underline: false, color: "#9ca3af", align: "left", fontFamily: font, locked: false, visible: true, zIndex: 16 },
    { id: "qrcode", type: "qrcode", label: "QR Code", x: 1010, y: 710, w: 80, h: 80, locked: false, visible: true, zIndex: 9 },
  ];
};

// ─── Default elements for BACK ─────────────────────────────────────────────
const DEFAULT_BACK = (model) => {
  const hl = model?.text_formatting?.highlightColor || "#059669";
  const dark = "#222222";
  const font = "Arial, sans-serif";
  return [
    { id: "back_header", type: "text", label: "Cabeçalho do Verso", x: 50, y: 30, w: 1020, h: 36, text: model?.back_header_text || "Este certificado possui registro interno para verificação de autenticidade.", fontSize: 9, bold: false, italic: false, underline: false, color: "#6b7280", align: "justify", fontFamily: font, locked: false, visible: true, zIndex: 10 },
    { id: "back_course_name", type: "text", label: "Nome do Curso", x: 50, y: 80, w: 1020, h: 32, text: "NR-35 – TRABALHO EM ALTURA", fontSize: 12, bold: true, italic: false, underline: false, color: hl, align: "center", fontFamily: font, locked: false, visible: true, zIndex: 11 },
    { id: "back_content_title", type: "text", label: "Título Conteúdo", x: 50, y: 120, w: 500, h: 28, text: model?.back_content_title || "CONTEÚDO PROGRAMÁTICO", fontSize: 10, bold: true, italic: false, underline: false, color: dark, align: "left", fontFamily: font, locked: false, visible: true, zIndex: 12 },
    { id: "back_responsibles_title", type: "text", label: "Título Responsáveis", x: 50, y: 460, w: 1020, h: 28, text: model?.back_responsibles_title || "AUTORIDADE E RESPONSABILIDADE TÉCNICA", fontSize: 10, bold: true, italic: false, underline: false, color: dark, align: "left", fontFamily: font, locked: false, visible: true, zIndex: 13 },
    { id: "back_footer", type: "text", label: "Rodapé Verso", x: 50, y: 740, w: 700, h: 24, text: (model?.back_footer_line1 || "eadcatcursos.com.br") + " · " + (model?.back_footer_line2 || "www.catcursos.com.br"), fontSize: 8, bold: false, italic: false, underline: false, color: "#9ca3af", align: "left", fontFamily: font, locked: false, visible: true, zIndex: 14 },
    { id: "back_qrcode", type: "qrcode", label: "QR Code Verso", x: 1010, y: 710, w: 80, h: 80, locked: false, visible: true, zIndex: 9 },
  ];
};

// ─── Element Renderer ───────────────────────────────────────────────────────
function ElementRenderer({ el, isSelected, onSelect, onDragStart, onResizeStart }) {
  const handleMouseDown = (e) => {
    if (el.locked) return;
    e.stopPropagation();
    onSelect(el.id);
    onDragStart(e, el.id);
  };

  const style = {
    position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h,
    zIndex: el.zIndex || 10, opacity: el.visible ? 1 : 0.3,
    cursor: el.locked ? "not-allowed" : "move",
    outline: isSelected ? "2px solid #059669" : "1px dashed transparent",
    outlineOffset: "1px", userSelect: "none", boxSizing: "border-box",
  };

  let content = null;
  if (el.type === "text") {
    content = (
      <div style={{ width: "100%", height: "100%", fontFamily: el.fontFamily || "Arial, sans-serif", fontSize: el.fontSize || 12, fontWeight: el.bold ? "bold" : "normal", fontStyle: el.italic ? "italic" : "normal", textDecoration: el.underline ? "underline" : "none", color: el.color || "#222", textAlign: el.align || "left", lineHeight: 1.4, whiteSpace: "pre-wrap", overflow: "hidden", padding: "2px", pointerEvents: "none" }}>
        {el.text}
      </div>
    );
  } else if (el.type === "image") {
    content = <img src={el.src} alt={el.label} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} draggable={false} />;
  } else if (el.type === "qrcode") {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://catcursos.com.br/validar&format=svg&margin=2`;
    content = <img src={qrUrl} alt="QR Code" style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} draggable={false} />;
  } else if (el.type === "signature") {
    content = (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", pointerEvents: "none" }}>
        {el.src && <img src={el.src} alt="Assinatura" style={{ maxHeight: "60%", objectFit: "contain" }} draggable={false} />}
        <div style={{ borderTop: "1.5px solid #374151", width: "100%", paddingTop: 2, textAlign: "center" }}>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: 9, color: "#374151" }}>{el.text || "Assinatura"}</span>
        </div>
      </div>
    );
  }

  const handles = [
    { cursor: "nw-resize", pos: { top: -5, left: -5 }, dir: "nw" },
    { cursor: "ne-resize", pos: { top: -5, right: -5 }, dir: "ne" },
    { cursor: "sw-resize", pos: { bottom: -5, left: -5 }, dir: "sw" },
    { cursor: "se-resize", pos: { bottom: -5, right: -5 }, dir: "se" },
    { cursor: "n-resize", pos: { top: -5, left: "50%", transform: "translateX(-50%)" }, dir: "n" },
    { cursor: "s-resize", pos: { bottom: -5, left: "50%", transform: "translateX(-50%)" }, dir: "s" },
    { cursor: "w-resize", pos: { left: -5, top: "50%", transform: "translateY(-50%)" }, dir: "w" },
    { cursor: "e-resize", pos: { right: -5, top: "50%", transform: "translateY(-50%)" }, dir: "e" },
  ];

  return (
    <div style={style} onMouseDown={handleMouseDown} title={el.label}>
      {content}
      {isSelected && !el.locked && handles.map(({ cursor, pos, dir }) => (
        <div key={dir} style={{ position: "absolute", ...pos, width: 10, height: 10, background: "#059669", border: "2px solid #fff", borderRadius: dir.length === 2 ? "50%" : "2px", cursor, zIndex: 100 }}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, el.id, dir); }}
        />
      ))}
    </div>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────────────
function Toolbar({ selected, elements, onChange, onDelete, onDuplicate, onLayer, onDeselect, showGrid, setShowGrid }) {
  const el = elements.find(e => e.id === selected);
  const upd = (key, val) => onChange(selected, key, val);

  if (!el) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 text-xs min-h-[36px]">
        <span>Clique em um elemento para editar • Arraste para mover • Alças para redimensionar</span>
        <div className="ml-auto">
          <button onClick={() => setShowGrid(g => !g)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${showGrid ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}>
            <Grid3X3 className="w-3 h-3" /> Grid
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-gray-800 text-white text-xs overflow-x-auto min-h-[36px]">
      <span className="font-semibold text-emerald-400 shrink-0 mr-1">{el.label}</span>
      <div className="w-px h-4 bg-gray-600" />

      {/* Position arrows */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => upd("y", el.y - 1)} className="p-0.5 rounded bg-gray-700 hover:bg-gray-600"><ArrowUp className="w-3 h-3" /></button>
        <button onClick={() => upd("y", el.y + 1)} className="p-0.5 rounded bg-gray-700 hover:bg-gray-600"><ArrowDown className="w-3 h-3" /></button>
        <button onClick={() => upd("x", el.x - 1)} className="p-0.5 rounded bg-gray-700 hover:bg-gray-600"><ArrowLeft className="w-3 h-3" /></button>
        <button onClick={() => upd("x", el.x + 1)} className="p-0.5 rounded bg-gray-700 hover:bg-gray-600"><ArrowRight className="w-3 h-3" /></button>
      </div>

      {/* X Y W H */}
      <label className="flex items-center gap-0.5 shrink-0">X:<input type="number" value={Math.round(el.x)} onChange={e => upd("x", +e.target.value)} className="w-14 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" /></label>
      <label className="flex items-center gap-0.5 shrink-0">Y:<input type="number" value={Math.round(el.y)} onChange={e => upd("y", +e.target.value)} className="w-14 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" /></label>
      <label className="flex items-center gap-0.5 shrink-0">W:<input type="number" value={Math.round(el.w)} onChange={e => upd("w", +e.target.value)} className="w-14 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" /></label>
      <label className="flex items-center gap-0.5 shrink-0">H:<input type="number" value={Math.round(el.h)} onChange={e => upd("h", +e.target.value)} className="w-14 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" /></label>
      <div className="w-px h-4 bg-gray-600" />

      {/* mm indicator */}
      <span className="text-gray-500 shrink-0 text-[10px]">{Math.round(el.x / MM_TO_PX)}mm, {Math.round(el.y / MM_TO_PX)}mm</span>
      <div className="w-px h-4 bg-gray-600" />

      {el.type === "text" && <>
        <label className="flex items-center gap-0.5 shrink-0">Pt:<input type="number" value={el.fontSize || 12} onChange={e => upd("fontSize", +e.target.value)} className="w-12 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" /></label>
        <label className="shrink-0">Cor:<input type="color" value={el.color || "#222"} onChange={e => upd("color", e.target.value)} className="w-8 h-5 rounded cursor-pointer bg-transparent border-0 ml-0.5" /></label>
        <button onClick={() => upd("bold", !el.bold)} className={`p-1 rounded ${el.bold ? "bg-emerald-600" : "bg-gray-700"}`}><Bold className="w-3 h-3" /></button>
        <button onClick={() => upd("italic", !el.italic)} className={`p-1 rounded ${el.italic ? "bg-emerald-600" : "bg-gray-700"}`}><Italic className="w-3 h-3" /></button>
        <button onClick={() => upd("underline", !el.underline)} className={`p-1 rounded ${el.underline ? "bg-emerald-600" : "bg-gray-700"}`}><UnderlineIcon className="w-3 h-3" /></button>
        <button onClick={() => upd("align", "left")} className={`p-1 rounded ${el.align === "left" ? "bg-emerald-600" : "bg-gray-700"}`}><AlignLeft className="w-3 h-3" /></button>
        <button onClick={() => upd("align", "center")} className={`p-1 rounded ${el.align === "center" ? "bg-emerald-600" : "bg-gray-700"}`}><AlignCenter className="w-3 h-3" /></button>
        <button onClick={() => upd("align", "right")} className={`p-1 rounded ${el.align === "right" ? "bg-emerald-600" : "bg-gray-700"}`}><AlignRight className="w-3 h-3" /></button>
        <div className="w-px h-4 bg-gray-600" />
      </>}

      <button onClick={() => onLayer(selected, "up")} className="p-1 rounded bg-gray-700 hover:bg-gray-600" title="Trazer para frente"><ChevronUp className="w-3 h-3" /></button>
      <button onClick={() => onLayer(selected, "down")} className="p-1 rounded bg-gray-700 hover:bg-gray-600" title="Enviar para trás"><ChevronDown className="w-3 h-3" /></button>
      <button onClick={() => upd("visible", !el.visible)} className={`p-1 rounded ${el.visible ? "bg-gray-700" : "bg-yellow-600"}`}>{el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</button>
      <button onClick={() => upd("locked", !el.locked)} className={`p-1 rounded ${el.locked ? "bg-red-600" : "bg-gray-700"}`}>{el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}</button>
      <button onClick={() => onDuplicate(selected)} className="p-1 rounded bg-gray-700 hover:bg-gray-600"><Copy className="w-3 h-3" /></button>
      <button onClick={() => onDelete(selected)} className="p-1 rounded bg-red-700 hover:bg-red-600"><Trash2 className="w-3 h-3" /></button>
      <div className="w-px h-4 bg-gray-600" />
      <button onClick={() => setShowGrid(g => !g)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${showGrid ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}><Grid3X3 className="w-3 h-3" /> Grid</button>
      <button onClick={onDeselect} className="ml-auto px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs">✕</button>
    </div>
  );
}

// ─── Element Props Panel ─────────────────────────────────────────────────────
function ElementPropsPanel({ selected, elements, onChange, signatures }) {
  const el = elements.find(e => e.id === selected);
  if (!el) return <div className="p-3 text-xs text-gray-400 text-center pt-6">Selecione um elemento para editar</div>;
  const upd = (key, val) => onChange(selected, key, val);

  return (
    <div className="p-3 space-y-3 text-xs">
      {el.type === "text" && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Texto</span>
            <textarea className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-sm min-h-[60px] resize-y" value={el.text || ""} onChange={e => upd("text", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Fonte</span>
            <select className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs" value={el.fontFamily || "Arial, sans-serif"} onChange={e => upd("fontFamily", e.target.value)}>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Times New Roman, serif">Times New Roman</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="Courier New, monospace">Courier New</option>
            </select>
          </label>
        </div>
      )}
      {el.type === "image" && (
        <label className="block">
          <span className="text-gray-500 uppercase tracking-wider text-[10px]">URL da Imagem</span>
          <input className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs" value={el.src || ""} onChange={e => upd("src", e.target.value)} placeholder="https://..." />
        </label>
      )}
      {el.type === "signature" && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Assinatura</span>
            <select className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs" value={el.signatureId || ""} onChange={e => { const sig = signatures.find(s => s.id === e.target.value); upd("signatureId", e.target.value); if (sig) { upd("src", sig.signature_url); upd("text", sig.name); } }}>
              <option value="">— Selecionar —</option>
              {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Nome exibido</span>
            <input className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs" value={el.text || ""} onChange={e => upd("text", e.target.value)} />
          </label>
        </div>
      )}

      {/* Position fine-tune */}
      <div className="border-t pt-2">
        <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-1.5">Posição precisa</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[["X (px)", "x"], ["Y (px)", "y"], ["Largura", "w"], ["Altura", "h"]].map(([lbl, key]) => (
            <label key={key} className="block">
              <span className="text-[10px] text-gray-400">{lbl}</span>
              <div className="flex items-center gap-0.5">
                <button className="px-1 py-0.5 bg-gray-100 rounded text-xs hover:bg-gray-200" onClick={() => upd(key, (el[key] || 0) - 1)}>−</button>
                <input type="number" className="flex-1 border border-gray-200 rounded px-1 py-0.5 text-xs w-0" value={Math.round(el[key] || 0)} onChange={e => upd(key, +e.target.value)} />
                <button className="px-1 py-0.5 bg-gray-100 rounded text-xs hover:bg-gray-200" onClick={() => upd(key, (el[key] || 0) + 1)}>+</button>
              </div>
              <span className="text-[9px] text-gray-400">{Math.round((el[key] || 0) / MM_TO_PX)} mm</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Save Modal ──────────────────────────────────────────────────────────────
function SaveModal({ onSaveGlobal, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-80 space-y-4">
        <h3 className="font-bold text-gray-800 text-base">Salvar Layout</h3>
        <p className="text-sm text-gray-500">Como deseja aplicar este layout?</p>
        <div className="space-y-3">
          <button
            className="w-full flex flex-col items-start p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            onClick={() => { onSaveGlobal("global"); onClose(); }}
          >
            <span className="font-semibold text-emerald-800 text-sm">Aplicar para TODOS os certificados</span>
            <span className="text-xs text-emerald-600 mt-0.5">Salva como padrão global do modelo</span>
          </button>
          <button
            className="w-full flex flex-col items-start p-3 rounded-lg border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => { onSaveGlobal("model_only"); onClose(); }}
          >
            <span className="font-semibold text-gray-800 text-sm">Salvar no modelo atual</span>
            <span className="text-xs text-gray-500 mt-0.5">Layout salvo neste modelo de certificado</span>
          </button>
        </div>
        <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 pt-1">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Main CanvasEditor ────────────────────────────────────────────────────────
export default function CanvasEditor({ model, signatures = [], onSaveCanvas }) {
  const [page, setPage] = useState("front");
  const [zoom, setZoom] = useState(0.65);
  const [showGrid, setShowGrid] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Separate state for front and back elements
  const [frontElements, setFrontElements] = useState(() => {
    const saved = model?.editor_canvas_data?.front;
    return saved?.length > 0 ? saved : DEFAULT_FRONT(model);
  });
  const [backElements, setBackElements] = useState(() => {
    const saved = model?.editor_canvas_data?.back;
    return saved?.length > 0 ? saved : DEFAULT_BACK(model);
  });

  const elements = page === "front" ? frontElements : backElements;
  const setElements = page === "front" ? setFrontElements : setBackElements;

  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  // Reload when model changes
  useEffect(() => {
    if (model?.editor_canvas_data?.front?.length > 0) setFrontElements(model.editor_canvas_data.front);
    if (model?.editor_canvas_data?.back?.length > 0) setBackElements(model.editor_canvas_data.back);
  }, [model?.id]);

  // Switch page → deselect
  const switchPage = (p) => { setSelected(null); setPage(p); };

  const bgUrl = page === "front" ? (model?.front_background_url || "") : (model?.back_background_url || "");

  const updateElement = useCallback((id, key, val) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, [key]: val } : e));
  }, [setElements]);

  const deleteElement = useCallback((id) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setSelected(null);
  }, [setElements]);

  const duplicateElement = useCallback((id) => {
    setElements(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      return [...prev, { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 }];
    });
  }, [setElements]);

  const changeLayer = useCallback((id, dir) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, zIndex: (e.zIndex || 10) + (dir === "up" ? 1 : -1) } : e));
  }, [setElements]);

  const addElement = useCallback((type) => {
    const id = `el_${Date.now()}`;
    const base = { id, locked: false, visible: true, zIndex: 20, x: 100, y: 100 };
    let el;
    if (type === "text") el = { ...base, type: "text", label: "Novo Texto", w: 300, h: 40, text: "Texto aqui", fontSize: 14, bold: false, italic: false, underline: false, color: "#222", align: "left", fontFamily: "Arial, sans-serif" };
    else if (type === "image") el = { ...base, type: "image", label: "Imagem", w: 120, h: 80, src: "" };
    else if (type === "qrcode") el = { ...base, type: "qrcode", label: "QR Code", w: 80, h: 80 };
    else if (type === "signature") el = { ...base, type: "signature", label: "Assinatura", w: 200, h: 80, text: "Nome do Responsável", src: "" };
    setElements(prev => [...prev, el]);
    setSelected(id);
  }, [setElements]);

  // ── DRAG ──
  const onDragStart = useCallback((e, id) => {
    const el = elements.find(el => el.id === id);
    if (!el || el.locked) return;
    e.preventDefault();
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      const nx = Math.max(0, Math.min(CANVAS_W - (el.w || 100), snapToGrid(dragRef.current.elX + dx)));
      const ny = Math.max(0, Math.min(CANVAS_H - (el.h || 30), snapToGrid(dragRef.current.elY + dy)));
      setElements(prev => prev.map(e => e.id === dragRef.current.id ? { ...e, x: nx, y: ny } : e));
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [elements, zoom, setElements]);

  // ── RESIZE ──
  const onResizeStart = useCallback((e, id, dir) => {
    const el = elements.find(el => el.id === id);
    if (!el) return;
    e.preventDefault();
    resizeRef.current = { id, dir, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h };

    const onMove = (ev) => {
      if (!resizeRef.current) return;
      const { dir: d, startX, startY, origX, origY, origW, origH } = resizeRef.current;
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      let nx = origX, ny = origY, nw = origW, nh = origH;
      if (d.includes("e")) nw = Math.max(30, snapToGrid(origW + dx));
      if (d.includes("s")) nh = Math.max(20, snapToGrid(origH + dy));
      if (d.includes("w")) { nw = Math.max(30, snapToGrid(origW - dx)); nx = snapToGrid(origX + dx); }
      if (d.includes("n")) { nh = Math.max(20, snapToGrid(origH - dy)); ny = snapToGrid(origY + dy); }
      setElements(prev => prev.map(e => e.id === resizeRef.current.id ? { ...e, x: nx, y: ny, w: nw, h: nh } : e));
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [elements, zoom, setElements]);

  const handleSave = (mode) => {
    onSaveCanvas({ front: frontElements, back: backElements, mode });
    toast.success(mode === "global" ? "Layout salvo como padrão global!" : "Layout salvo no modelo!");
  };

  const sortedEls = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {showSaveModal && <SaveModal onSaveGlobal={handleSave} onClose={() => setShowSaveModal(false)} />}

      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 flex-wrap">
        {/* Page toggle */}
        <div className="flex rounded overflow-hidden border border-gray-600">
          <button onClick={() => switchPage("front")} className={`px-3 py-1 text-xs font-medium flex items-center gap-1 ${page === "front" ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            <ChevronLeft className="w-3 h-3" /> Frente
          </button>
          <button onClick={() => switchPage("back")} className={`px-3 py-1 text-xs font-medium flex items-center gap-1 ${page === "back" ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            Verso <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="w-px h-5 bg-gray-600" />

        {/* Add elements */}
        {[["text", <Type className="w-3 h-3" />, "+ Texto"], ["image", <Image className="w-3 h-3" />, "+ Imagem"], ["qrcode", <QrCode className="w-3 h-3" />, "+ QR Code"], ["signature", <PenLine className="w-3 h-3" />, "+ Assinatura"]].map(([type, icon, label]) => (
          <button key={type} onClick={() => addElement(type)} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded">
            {icon} {label}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-600" />

        {/* Zoom */}
        <label className="flex items-center gap-1 text-white text-xs shrink-0">
          Zoom:
          <input type="range" min="0.3" max="1.2" step="0.05" value={zoom} onChange={e => setZoom(+e.target.value)} className="w-20" />
          <span className="w-10">{Math.round(zoom * 100)}%</span>
        </label>

        <div className="ml-auto">
          <Button onClick={() => setShowSaveModal(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7">
            <Save className="w-3 h-3 mr-1" /> Salvar Layout
          </Button>
        </div>
      </div>

      {/* Element toolbar */}
      <Toolbar
        selected={selected} elements={elements} onChange={updateElement}
        onDelete={deleteElement} onDuplicate={duplicateElement} onLayer={changeLayer}
        onDeselect={() => setSelected(null)} showGrid={showGrid} setShowGrid={setShowGrid}
      />

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-900 p-8 flex items-start justify-center">
          <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: "relative", flexShrink: 0 }}>
            <div
              ref={canvasRef}
              style={{ width: CANVAS_W, height: CANVAS_H, position: "relative", transform: `scale(${zoom})`, transformOrigin: "top left", overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.5)", cursor: "default", backgroundImage: bgUrl ? `url('${bgUrl}')` : undefined, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: bgUrl ? undefined : "#ffffff" }}
              onClick={e => { if (e.target === canvasRef.current) setSelected(null); }}
            >
              {showGrid && (
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}>
                  <defs>
                    <pattern id="sg" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                      <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="rgba(5,150,105,0.2)" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="bg" width={SNAP * 8} height={SNAP * 8} patternUnits="userSpaceOnUse">
                      <rect width={SNAP * 8} height={SNAP * 8} fill="url(#sg)" />
                      <path d={`M ${SNAP * 8} 0 L 0 0 0 ${SNAP * 8}`} fill="none" stroke="rgba(5,150,105,0.35)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#bg)" />
                </svg>
              )}
              {sortedEls.map(el => (
                <ElementRenderer key={el.id} el={el} isSelected={selected === el.id} onSelect={setSelected} onDragStart={onDragStart} onResizeStart={onResizeStart} />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-56 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Camadas — {page === "front" ? "Frente" : "Verso"}
            </p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {[...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map(el => (
                <button key={el.id} onClick={() => setSelected(el.id === selected ? null : el.id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${selected === el.id ? "bg-emerald-50 text-emerald-800" : "hover:bg-gray-50 text-gray-700"}`}>
                  {el.type === "text" && <Type className="w-3 h-3 flex-shrink-0 text-gray-400" />}
                  {el.type === "image" && <Image className="w-3 h-3 flex-shrink-0 text-gray-400" />}
                  {el.type === "qrcode" && <QrCode className="w-3 h-3 flex-shrink-0 text-gray-400" />}
                  {el.type === "signature" && <PenLine className="w-3 h-3 flex-shrink-0 text-gray-400" />}
                  <span className="truncate">{el.label}</span>
                  {!el.visible && <EyeOff className="w-3 h-3 ml-auto text-gray-300" />}
                  {el.locked && <Lock className="w-3 h-3 ml-auto text-red-300" />}
                </button>
              ))}
            </div>
          </div>
          <ElementPropsPanel selected={selected} elements={elements} onChange={updateElement} signatures={signatures} />
        </div>
      </div>
    </div>
  );
}