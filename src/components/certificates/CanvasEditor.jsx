/**
 * CanvasEditor — Editor visual drag-and-drop para certificados
 * Renderiza elementos sobre o canvas A4 com movimentação livre,
 * redimensionamento, camadas e edição inline de texto.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Type, Image, QrCode, PenLine, Plus, Trash2,
  Copy, ChevronUp, ChevronDown, Grid3X3, Save,
  Eye, EyeOff, Lock, Unlock, AlignCenter, AlignLeft, AlignRight,
  Bold, Italic, Underline as UnderlineIcon
} from "lucide-react";
import { toast } from "sonner";

// Canvas dimensions in pixels at 96dpi — A4 landscape 297x210mm
const MM_TO_PX = 3.7795;
const CANVAS_W = Math.round(297 * MM_TO_PX); // ~1123px
const CANVAS_H = Math.round(210 * MM_TO_PX); // ~794px

const SNAP = 8; // grid snap size in pixels

const DEFAULT_ELEMENTS = (model) => {
  const hl = (model?.text_formatting?.highlightColor) || "#059669";
  const dark = "#222222";
  const font = "Arial, sans-serif";
  return [
    {
      id: "title", type: "text", label: "Título",
      x: 200, y: 30, w: 720, h: 60,
      text: model?.front_title || "CERTIFICADO",
      fontSize: 36, bold: true, italic: false, underline: false,
      color: dark, align: "center", fontFamily: font,
      locked: false, visible: true, zIndex: 10,
    },
    {
      id: "subtitle", type: "text", label: "Subtítulo",
      x: 200, y: 90, w: 720, h: 36,
      text: model?.front_subtitle || "CAPACITAÇÃO PROFISSIONAL",
      fontSize: 14, bold: false, italic: false, underline: false,
      color: hl, align: "center", fontFamily: font,
      locked: false, visible: true, zIndex: 11,
    },
    {
      id: "cert_label", type: "text", label: "Certificamos que",
      x: 200, y: 160, w: 720, h: 28,
      text: model?.front_certification_label || "CERTIFICAMOS QUE",
      fontSize: 11, bold: false, italic: false, underline: false,
      color: dark, align: "center", fontFamily: font,
      locked: false, visible: true, zIndex: 12,
    },
    {
      id: "student_name", type: "text", label: "Nome do Aluno",
      x: 100, y: 200, w: 920, h: 50,
      text: "JOÃO DA SILVA SANTOS",
      fontSize: 26, bold: true, italic: false, underline: true,
      color: dark, align: "center", fontFamily: font,
      locked: false, visible: true, zIndex: 13,
    },
    {
      id: "body_text", type: "text", label: "Texto do Corpo",
      x: 100, y: 270, w: 920, h: 100,
      text: "concluiu com êxito o treinamento, sendo considerado APTO para o desempenho seguro de suas atividades.",
      fontSize: 11, bold: false, italic: false, underline: false,
      color: dark, align: "justify", fontFamily: font,
      locked: false, visible: true, zIndex: 14,
    },
    {
      id: "location_date", type: "text", label: "Local e Data",
      x: 200, y: 390, w: 720, h: 28,
      text: model?.front_location_date || "Barcarena/PA, [DATA_EMISSAO]",
      fontSize: 11, bold: false, italic: false, underline: false,
      color: dark, align: "center", fontFamily: font,
      locked: false, visible: true, zIndex: 15,
    },
    {
      id: "footer_url", type: "text", label: "Rodapé",
      x: 20, y: 740, w: 400, h: 24,
      text: model?.front_footer_line2 || "www.catcursos.com.br",
      fontSize: 8, bold: false, italic: false, underline: false,
      color: "#9ca3af", align: "left", fontFamily: font,
      locked: false, visible: true, zIndex: 16,
    },
    {
      id: "logo", type: "image", label: "Logo CAT",
      x: 960, y: 10, w: 120, h: 60,
      src: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png",
      locked: false, visible: true, zIndex: 5,
    },
    {
      id: "qrcode", type: "qrcode", label: "QR Code",
      x: 1010, y: 710, w: 80, h: 80,
      locked: false, visible: true, zIndex: 9,
    },
  ];
};

function snapToGrid(val) {
  return Math.round(val / SNAP) * SNAP;
}

function ElementRenderer({ el, isSelected, onSelect, onDragStart, onResizeStart, bgUrl }) {
  const handleMouseDown = (e) => {
    if (el.locked) return;
    e.stopPropagation();
    onSelect(el.id);
    onDragStart(e, el.id);
  };

  const style = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    zIndex: el.zIndex || 10,
    opacity: el.visible ? 1 : 0.3,
    cursor: el.locked ? "not-allowed" : "move",
    outline: isSelected ? "2px solid #059669" : "none",
    outlineOffset: "1px",
    userSelect: "none",
    boxSizing: "border-box",
  };

  let content = null;

  if (el.type === "text") {
    content = (
      <div
        style={{
          width: "100%", height: "100%",
          fontFamily: el.fontFamily || "Arial, sans-serif",
          fontSize: el.fontSize || 12,
          fontWeight: el.bold ? "bold" : "normal",
          fontStyle: el.italic ? "italic" : "normal",
          textDecoration: el.underline ? "underline" : "none",
          color: el.color || "#222",
          textAlign: el.align || "left",
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          padding: "2px",
          pointerEvents: "none",
        }}
      >
        {el.text}
      </div>
    );
  } else if (el.type === "image") {
    content = (
      <img
        src={el.src}
        alt={el.label}
        style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
        draggable={false}
      />
    );
  } else if (el.type === "qrcode") {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://catcursos.com.br/validar&format=svg&margin=2`;
    content = (
      <img src={qrUrl} alt="QR Code" style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} draggable={false} />
    );
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

  return (
    <div style={style} onMouseDown={handleMouseDown} title={el.label}>
      {content}
      {/* Resize handle */}
      {isSelected && !el.locked && (
        <>
          {/* Corners */}
          {[
            { cursor: "nw-resize", pos: { top: -4, left: -4 }, dir: "nw" },
            { cursor: "ne-resize", pos: { top: -4, right: -4 }, dir: "ne" },
            { cursor: "sw-resize", pos: { bottom: -4, left: -4 }, dir: "sw" },
            { cursor: "se-resize", pos: { bottom: -4, right: -4 }, dir: "se" },
          ].map(({ cursor, pos, dir }) => (
            <div
              key={dir}
              style={{
                position: "absolute", ...pos,
                width: 10, height: 10,
                background: "#059669", borderRadius: "50%",
                cursor, zIndex: 100,
              }}
              onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, el.id, dir); }}
            />
          ))}
          {/* Edge handles */}
          {[
            { cursor: "n-resize", pos: { top: -4, left: "50%", transform: "translateX(-50%)" }, dir: "n" },
            { cursor: "s-resize", pos: { bottom: -4, left: "50%", transform: "translateX(-50%)" }, dir: "s" },
            { cursor: "w-resize", pos: { left: -4, top: "50%", transform: "translateY(-50%)" }, dir: "w" },
            { cursor: "e-resize", pos: { right: -4, top: "50%", transform: "translateY(-50%)" }, dir: "e" },
          ].map(({ cursor, pos, dir }) => (
            <div
              key={dir}
              style={{
                position: "absolute", ...pos,
                width: 8, height: 8,
                background: "#10b981", border: "1px solid #fff",
                cursor, zIndex: 100,
              }}
              onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, el.id, dir); }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function Toolbar({ selected, elements, onChange, onDelete, onDuplicate, onLayer, onDeselect, showGrid, setShowGrid }) {
  const el = elements.find(e => e.id === selected);

  const upd = (key, val) => onChange(selected, key, val);

  if (!el) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 text-xs">
        <span>Clique em um elemento para editar</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowGrid(g => !g)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${showGrid ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}
            title="Grid de alinhamento"
          >
            <Grid3X3 className="w-3 h-3" /> Grid
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-800 text-white text-xs overflow-x-auto">
      {/* Element label */}
      <span className="font-semibold text-emerald-400 shrink-0">{el.label}</span>
      <div className="w-px h-4 bg-gray-600" />

      {/* Position & size */}
      <label className="flex items-center gap-1 shrink-0">X:
        <input type="number" value={Math.round(el.x)} onChange={e => upd("x", +e.target.value)} className="w-16 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" />
      </label>
      <label className="flex items-center gap-1 shrink-0">Y:
        <input type="number" value={Math.round(el.y)} onChange={e => upd("y", +e.target.value)} className="w-16 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" />
      </label>
      <label className="flex items-center gap-1 shrink-0">W:
        <input type="number" value={Math.round(el.w)} onChange={e => upd("w", +e.target.value)} className="w-16 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" />
      </label>
      <label className="flex items-center gap-1 shrink-0">H:
        <input type="number" value={Math.round(el.h)} onChange={e => upd("h", +e.target.value)} className="w-16 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" />
      </label>
      <div className="w-px h-4 bg-gray-600" />

      {/* Text controls */}
      {el.type === "text" && <>
        <label className="flex items-center gap-1 shrink-0">Tamanho:
          <input type="number" value={el.fontSize || 12} onChange={e => upd("fontSize", +e.target.value)} className="w-14 bg-gray-700 rounded px-1 py-0.5 text-white text-xs" />
        </label>
        <label className="shrink-0" title="Cor">
          Cor: <input type="color" value={el.color || "#222"} onChange={e => upd("color", e.target.value)} className="w-8 h-5 rounded cursor-pointer bg-transparent border-0" />
        </label>
        <button onClick={() => upd("bold", !el.bold)} className={`p-1 rounded ${el.bold ? "bg-emerald-600" : "bg-gray-700"}`} title="Negrito"><Bold className="w-3 h-3" /></button>
        <button onClick={() => upd("italic", !el.italic)} className={`p-1 rounded ${el.italic ? "bg-emerald-600" : "bg-gray-700"}`} title="Itálico"><Italic className="w-3 h-3" /></button>
        <button onClick={() => upd("underline", !el.underline)} className={`p-1 rounded ${el.underline ? "bg-emerald-600" : "bg-gray-700"}`} title="Sublinhado"><UnderlineIcon className="w-3 h-3" /></button>
        <button onClick={() => upd("align", "left")} className={`p-1 rounded ${el.align === "left" ? "bg-emerald-600" : "bg-gray-700"}`} title="Alinhar esquerda"><AlignLeft className="w-3 h-3" /></button>
        <button onClick={() => upd("align", "center")} className={`p-1 rounded ${el.align === "center" ? "bg-emerald-600" : "bg-gray-700"}`} title="Centralizar"><AlignCenter className="w-3 h-3" /></button>
        <button onClick={() => upd("align", "right")} className={`p-1 rounded ${el.align === "right" ? "bg-emerald-600" : "bg-gray-700"}`} title="Alinhar direita"><AlignRight className="w-3 h-3" /></button>
        <div className="w-px h-4 bg-gray-600" />
      </>}

      {/* Layers */}
      <button onClick={() => onLayer(selected, "up")} className="p-1 rounded bg-gray-700 hover:bg-gray-600" title="Trazer para frente"><ChevronUp className="w-3 h-3" /></button>
      <button onClick={() => onLayer(selected, "down")} className="p-1 rounded bg-gray-700 hover:bg-gray-600" title="Enviar para trás"><ChevronDown className="w-3 h-3" /></button>

      {/* Visibility & Lock */}
      <button onClick={() => upd("visible", !el.visible)} className={`p-1 rounded ${el.visible ? "bg-gray-700" : "bg-yellow-600"}`} title="Visibilidade">
        {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      </button>
      <button onClick={() => upd("locked", !el.locked)} className={`p-1 rounded ${el.locked ? "bg-red-600" : "bg-gray-700"}`} title="Travar elemento">
        {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      </button>
      <div className="w-px h-4 bg-gray-600" />

      {/* Actions */}
      <button onClick={() => onDuplicate(selected)} className="p-1 rounded bg-gray-700 hover:bg-gray-600" title="Duplicar"><Copy className="w-3 h-3" /></button>
      <button onClick={() => { onDelete(selected); }} className="p-1 rounded bg-red-700 hover:bg-red-600" title="Excluir"><Trash2 className="w-3 h-3" /></button>
      <div className="w-px h-4 bg-gray-600" />

      {/* Grid */}
      <button
        onClick={() => setShowGrid(g => !g)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${showGrid ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}
        title="Grid de alinhamento"
      >
        <Grid3X3 className="w-3 h-3" /> Grid
      </button>

      {/* Deselect */}
      <button onClick={onDeselect} className="ml-auto p-1 rounded bg-gray-700 hover:bg-gray-600 text-xs px-2">✕ Deselect</button>
    </div>
  );
}

function ElementPropsPanel({ selected, elements, onChange, signatures }) {
  const el = elements.find(e => e.id === selected);
  if (!el) return null;

  const upd = (key, val) => onChange(selected, key, val);

  return (
    <div className="p-3 space-y-3 text-xs">
      {el.type === "text" && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Texto</span>
            <textarea
              className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-sm min-h-[60px] resize-y"
              value={el.text || ""}
              onChange={e => upd("text", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Fonte</span>
            <select
              className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
              value={el.fontFamily || "Arial, sans-serif"}
              onChange={e => upd("fontFamily", e.target.value)}
            >
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
          <input
            className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
            value={el.src || ""}
            onChange={e => upd("src", e.target.value)}
            placeholder="https://..."
          />
        </label>
      )}

      {el.type === "signature" && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Assinatura</span>
            <select
              className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
              value={el.signatureId || ""}
              onChange={e => {
                const sig = signatures.find(s => s.id === e.target.value);
                upd("signatureId", e.target.value);
                if (sig) {
                  upd("src", sig.signature_url);
                  upd("text", sig.name);
                }
              }}
            >
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
    </div>
  );
}

export default function CanvasEditor({ model, signatures = [], onSaveCanvas }) {
  const bgUrl = model?.front_background_url || "";

  // Load elements from model or generate defaults
  const [elements, setElements] = useState(() => {
    if (model?.editor_canvas_data?.elements?.length > 0) {
      return model.editor_canvas_data.elements;
    }
    return DEFAULT_ELEMENTS(model);
  });

  const [selected, setSelected] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [page, setPage] = useState("front"); // front | back
  const [zoom, setZoom] = useState(0.7);

  const canvasRef = useRef(null);
  const dragRef = useRef(null); // { id, startX, startY, elX, elY }
  const resizeRef = useRef(null); // { id, dir, startX, startY, origX, origY, origW, origH }

  // Reload elements when model changes (external save)
  useEffect(() => {
    if (model?.editor_canvas_data?.elements?.length > 0) {
      setElements(model.editor_canvas_data.elements);
    }
  }, [model?.id]);

  const updateElement = useCallback((id, key, val) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, [key]: val } : e));
  }, []);

  const deleteElement = useCallback((id) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setSelected(null);
  }, []);

  const duplicateElement = useCallback((id) => {
    setElements(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      const newEl = { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 };
      return [...prev, newEl];
    });
  }, []);

  const changeLayer = useCallback((id, dir) => {
    setElements(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      const delta = dir === "up" ? 1 : -1;
      return prev.map(e => e.id === id ? { ...e, zIndex: (e.zIndex || 10) + delta } : e);
    });
  }, []);

  const addElement = useCallback((type) => {
    const id = `el_${Date.now()}`;
    const base = { id, locked: false, visible: true, zIndex: 20, x: 100, y: 100 };
    let el;
    if (type === "text") {
      el = { ...base, type: "text", label: "Novo Texto", w: 300, h: 40, text: "Texto aqui", fontSize: 14, bold: false, italic: false, underline: false, color: "#222", align: "left", fontFamily: "Arial, sans-serif" };
    } else if (type === "image") {
      el = { ...base, type: "image", label: "Imagem", w: 120, h: 80, src: "" };
    } else if (type === "qrcode") {
      el = { ...base, type: "qrcode", label: "QR Code", w: 80, h: 80 };
    } else if (type === "signature") {
      el = { ...base, type: "signature", label: "Assinatura", w: 200, h: 80, text: "Nome do Responsável", src: "" };
    }
    setElements(prev => [...prev, el]);
    setSelected(id);
  }, []);

  // ===== DRAG =====
  const onDragStart = useCallback((e, id) => {
    const el = elements.find(el => el.id === id);
    if (!el || el.locked) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      elX: el.x,
      elY: el.y,
      rect,
    };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      let nx = snapToGrid(dragRef.current.elX + dx);
      let ny = snapToGrid(dragRef.current.elY + dy);
      // Clamp to canvas
      const curEl = elements.find(e => e.id === dragRef.current.id);
      nx = Math.max(0, Math.min(CANVAS_W - (curEl?.w || 100), nx));
      ny = Math.max(0, Math.min(CANVAS_H - (curEl?.h || 30), ny));
      setElements(prev => prev.map(el => el.id === dragRef.current.id ? { ...el, x: nx, y: ny } : el));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [elements, zoom]);

  // ===== RESIZE =====
  const onResizeStart = useCallback((e, id, dir) => {
    const el = elements.find(el => el.id === id);
    if (!el) return;
    e.preventDefault();
    resizeRef.current = {
      id, dir,
      startX: e.clientX, startY: e.clientY,
      origX: el.x, origY: el.y,
      origW: el.w, origH: el.h,
    };
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
      setElements(prev => prev.map(el => el.id === resizeRef.current.id ? { ...el, x: nx, y: ny, w: nw, h: nh } : el));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [elements, zoom]);

  const handleSave = () => {
    onSaveCanvas({ elements, page });
    toast.success("Layout salvo no modelo!");
  };

  const sortedEls = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        {/* Page toggle */}
        <div className="flex rounded overflow-hidden border border-gray-600">
          <button onClick={() => setPage("front")} className={`px-3 py-1 text-xs font-medium ${page === "front" ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}>Frente</button>
          <button onClick={() => setPage("back")} className={`px-3 py-1 text-xs font-medium ${page === "back" ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}>Verso</button>
        </div>

        <div className="w-px h-5 bg-gray-600" />

        {/* Add elements */}
        <button onClick={() => addElement("text")} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded" title="Adicionar Texto">
          <Type className="w-3 h-3" /> + Texto
        </button>
        <button onClick={() => addElement("image")} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded" title="Adicionar Imagem">
          <Image className="w-3 h-3" /> + Logo/Img
        </button>
        <button onClick={() => addElement("qrcode")} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded" title="Adicionar QR Code">
          <QrCode className="w-3 h-3" /> + QR Code
        </button>
        <button onClick={() => addElement("signature")} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded" title="Adicionar Assinatura">
          <PenLine className="w-3 h-3" /> + Assinatura
        </button>

        <div className="w-px h-5 bg-gray-600" />

        {/* Zoom */}
        <label className="flex items-center gap-1 text-white text-xs">
          Zoom:
          <input type="range" min="0.3" max="1.2" step="0.05" value={zoom} onChange={e => setZoom(+e.target.value)} className="w-20" />
          <span className="w-10">{Math.round(zoom * 100)}%</span>
        </label>

        <div className="ml-auto">
          <Button onClick={handleSave} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7">
            <Save className="w-3 h-3 mr-1" /> Salvar Layout
          </Button>
        </div>
      </div>

      {/* Selection toolbar */}
      <Toolbar
        selected={selected}
        elements={elements}
        onChange={updateElement}
        onDelete={deleteElement}
        onDuplicate={duplicateElement}
        onLayer={changeLayer}
        onDeselect={() => setSelected(null)}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-gray-900 p-8 flex items-start justify-center">
          <div
            style={{
              width: CANVAS_W * zoom,
              height: CANVAS_H * zoom,
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* Canvas container */}
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                position: "relative",
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                overflow: "hidden",
                boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
                cursor: "default",
                backgroundImage: bgUrl ? `url('${bgUrl}')` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: bgUrl ? undefined : "#ffffff",
              }}
              onClick={(e) => {
                if (e.target === canvasRef.current) setSelected(null);
              }}
            >
              {/* Grid overlay */}
              {showGrid && (
                <svg
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}
                >
                  <defs>
                    <pattern id="smallGrid" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                      <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="rgba(5,150,105,0.2)" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="bigGrid" width={SNAP * 8} height={SNAP * 8} patternUnits="userSpaceOnUse">
                      <rect width={SNAP * 8} height={SNAP * 8} fill="url(#smallGrid)" />
                      <path d={`M ${SNAP * 8} 0 L 0 0 0 ${SNAP * 8}`} fill="none" stroke="rgba(5,150,105,0.35)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#bigGrid)" />
                </svg>
              )}

              {/* Elements */}
              {sortedEls.map(el => (
                <ElementRenderer
                  key={el.id}
                  el={el}
                  isSelected={selected === el.id}
                  onSelect={setSelected}
                  onDragStart={onDragStart}
                  onResizeStart={onResizeStart}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — element properties */}
        <div className="w-56 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
          {/* Layers list */}
          <div className="p-3 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Camadas</p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {[...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map(el => (
                <button
                  key={el.id}
                  onClick={() => setSelected(el.id === selected ? null : el.id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${selected === el.id ? "bg-emerald-50 text-emerald-800" : "hover:bg-gray-50 text-gray-700"}`}
                >
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

          {/* Selected element properties */}
          {selected && (
            <ElementPropsPanel
              selected={selected}
              elements={elements}
              onChange={updateElement}
              signatures={signatures}
            />
          )}

          {!selected && (
            <div className="p-3 text-xs text-gray-400 text-center pt-6">
              Selecione um elemento para editar suas propriedades
            </div>
          )}
        </div>
      </div>
    </div>
  );
}