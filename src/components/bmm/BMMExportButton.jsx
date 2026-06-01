import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportBMMPDF } from '@/components/bmm/BMMExporter';

export default function BMMExportButton({ disabled = false }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Aguardar renderização completa do DOM
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Chamar exportação
      await exportBMMPDF();
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="gap-2"
      variant="default"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}