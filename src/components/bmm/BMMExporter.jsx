/**
 * Captura o DOM já renderizado do BMM e gera PDF/impressão
 * Garante 100% de fidelidade entre tela e PDF
 */
export async function exportBMMPDF() {
  // Aguardar renderização completa
  await new Promise(resolve => setTimeout(resolve, 500));

  const container = document.getElementById('bmm-print-container');
  if (!container) {
    alert('Container do BMM não encontrado. Renderize o BMM primeiro.');
    return;
  }

  try {
    // Importar html2canvas e jsPDF dinamicamente
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).jsPDF;

    // Converter elemento para canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowHeight: container.scrollHeight,
      windowWidth: container.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let heightLeft = imgHeight;
    let position = 0;

    // Adicionar páginas conforme necessário
    while (heightLeft >= 0) {
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height
      if (heightLeft > 0) {
        pdf.addPage();
        position = -297;
      }
    }

    // Obter período do DOM para nome do arquivo
    const periodEl = container.querySelector('.bmm-title .period');
    const period = periodEl?.textContent?.replace('Período: ', '') || 'BMM';
    const filename = `BMM_${period.trim()}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Download automático
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert('Erro ao gerar PDF. Tente usar a impressão padrão (Ctrl+P).');
  }
}