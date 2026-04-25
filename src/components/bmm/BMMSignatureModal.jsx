import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenLine, Trash2, Check } from "lucide-react";

export default function BMMSignatureModal({ open, onOpenChange, onConfirm, signerName }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => clearCanvas(), 50);
    }
  }, [open]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    setLastPos(pos);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setLastPos(pos);
  };

  const stopDrawing = (e) => {
    e?.preventDefault();
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-blue-600" />
            Assinar BMM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {signerName && (
            <p className="text-sm text-gray-600">
              Assinando como: <strong>{signerName}</strong>
            </p>
          )}

          <p className="text-xs text-gray-500">
            Desenhe sua assinatura ou rubrica abaixo. Ela será inserida no documento antes de confirmá-lo.
          </p>

          {/* Área de assinatura */}
          <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={560}
              height={180}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">Assine aqui...</p>
              </div>
            )}
            {/* Linha de base */}
            <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300 pointer-events-none" />
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="text-gray-600"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirm}
                disabled={!hasSignature}
              >
                <Check className="w-4 h-4 mr-1" />
                Confirmar Assinatura
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}