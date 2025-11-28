import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bmmData, templateType } = await req.json();

    if (!bmmData) {
      return Response.json({ error: 'Dados do BMM não fornecidos' }, { status: 400 });
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Função auxiliar para adicionar texto centralizado
    const addCenteredText = (text, yPos, fontSize = 12, style = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      doc.text(text, pageWidth / 2, yPos, { align: 'center' });
    };

    // Função auxiliar para adicionar linha
    const addLine = (x1, y1, x2, y2) => {
      doc.line(x1, y1, x2, y2);
    };

    if (templateType === 'model3' || templateType === 'model1') {
      // BMM Modelo Allbras / Demonstrativo Físico-Financeiro
      
      // Cabeçalho
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F');
      doc.setDrawColor(0);
      doc.rect(margin, y, pageWidth - 2 * margin, 25);
      
      addCenteredText('BOLETIM MENSAL DE MEDIÇÃO (BMM)', y + 10, 16, 'bold');
      addCenteredText('Demonstrativo Físico-Financeiro', y + 18, 11);
      
      y += 35;

      // Informações da Contratada
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRATADA:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(bmmData.contractor?.razao_social || 'V.S. NUNES CURSOS E TREINAMENTO', margin + 30, y);
      
      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('CNPJ:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(bmmData.contractor?.cnpj || '07.238.084/0001-45', margin + 15, y);
      
      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('OBJETO:', margin, y);
      doc.setFont('helvetica', 'normal');
      const objeto = bmmData.company?.billing_info?.contract_object || 'Prestação de Serviços de treinamentos de capacitação e segurança';
      const objetoLines = doc.splitTextToSize(objeto, pageWidth - 2 * margin - 20);
      doc.text(objetoLines, margin + 18, y);
      
      y += objetoLines.length * 5 + 5;

      // Informações do BMM
      doc.setFont('helvetica', 'bold');
      doc.text('VALOR DO BMM:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`R$ ${bmmData.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`, margin + 35, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('PERÍODO:', pageWidth / 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(bmmData.period || '-', pageWidth / 2 + 22, y);
      
      y += 10;

      // Dados Bancários
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.rect(margin, y, pageWidth - 2 * margin, 8);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS BANCÁRIOS', margin + 5, y + 5.5);
      
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.text(`Banco: ${bmmData.contractor?.bank_data?.bank_name || 'Bradesco'}`, margin, y);
      doc.text(`Agência: ${bmmData.contractor?.bank_data?.agency || '0327-1'}`, margin + 60, y);
      doc.text(`Conta: ${bmmData.contractor?.bank_data?.account || '164696-6'}`, margin + 110, y);
      
      y += 15;

      // Tabela de Itens
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.rect(margin, y, pageWidth - 2 * margin, 8);
      
      const colWidths = [12, 70, 25, 25, 25, 25];
      let x = margin;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      ['ITEM', 'DESCRIÇÃO', 'UN.', 'QTD', 'UNIT.', 'TOTAL'].forEach((header, i) => {
        doc.text(header, x + 2, y + 5.5);
        x += colWidths[i];
      });
      
      y += 8;

      // Linhas da tabela
      doc.setFont('helvetica', 'normal');
      const items = bmmData.items || [];
      
      items.forEach((item, index) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        
        doc.rect(margin, y, pageWidth - 2 * margin, 8);
        x = margin;
        
        doc.text(String(index + 1), x + 2, y + 5.5);
        x += colWidths[0];
        
        const descText = doc.splitTextToSize(item.training_name || '', colWidths[1] - 4);
        doc.text(descText[0] || '', x + 2, y + 5.5);
        x += colWidths[1];
        
        doc.text('QTD', x + 2, y + 5.5);
        x += colWidths[2];
        
        doc.text(String(item.students_count || 0), x + 2, y + 5.5);
        x += colWidths[3];
        
        doc.text(`R$ ${(item.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, x + 2, y + 5.5);
        x += colWidths[4];
        
        doc.text(`R$ ${(item.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, x + 2, y + 5.5);
        
        y += 8;
      });

      // Linha de total
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.rect(margin, y, pageWidth - 2 * margin, 8);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', margin + 100, y + 5.5);
      doc.text(`R$ ${bmmData.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`, margin + 157, y + 5.5);
      
      y += 20;

      // Assinaturas
      if (y > 230) {
        doc.addPage();
        y = 40;
      }
      
      const sigWidth = (pageWidth - 2 * margin - 20) / 3;
      
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRATADA', margin + sigWidth / 2, y, { align: 'center' });
      doc.text('FISCALIZAÇÃO', margin + sigWidth + 10 + sigWidth / 2, y, { align: 'center' });
      doc.text('GESTOR DO CONTRATO', margin + 2 * sigWidth + 20 + sigWidth / 2, y, { align: 'center' });
      
      y += 25;
      addLine(margin, y, margin + sigWidth, y);
      addLine(margin + sigWidth + 10, y, margin + 2 * sigWidth + 10, y);
      addLine(margin + 2 * sigWidth + 20, y, pageWidth - margin, y);
      
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('DATA: ___/___/______', margin + sigWidth / 2, y, { align: 'center' });
      doc.text('DATA: ___/___/______', margin + sigWidth + 10 + sigWidth / 2, y, { align: 'center' });
      doc.text('DATA: ___/___/______', margin + 2 * sigWidth + 20 + sigWidth / 2, y, { align: 'center' });

    } else if (templateType === 'model4' || templateType === 'model2') {
      // BMM Modelo Agropalma / Lista de Treinamentos
      
      // Cabeçalho verde
      doc.setFillColor(21, 128, 61);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(bmmData.company?.nome_fantasia || 'Empresa', margin, 12);
      
      doc.setFontSize(11);
      addCenteredText(`Treinamentos Normativos - ${bmmData.month || 'Janeiro'} de ${bmmData.year || '2025'}`, 22);
      
      doc.setTextColor(0, 0, 0);
      y = 40;

      // Tabela de Treinamentos
      const headers = ['TREINAMENTO', 'MODALIDADE', 'HORAS', 'PERÍODO', 'INSTRUTOR', 'CPF'];
      const tColWidths = [55, 25, 18, 25, 40, 30];
      
      doc.setFillColor(55, 65, 81);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      let tx = margin;
      headers.forEach((header, i) => {
        doc.text(header, tx + 2, y + 5.5);
        tx += tColWidths[i];
      });
      
      doc.setTextColor(0, 0, 0);
      y += 8;

      // Dados
      doc.setFont('helvetica', 'normal');
      const trainings = bmmData.items || [];
      
      trainings.forEach((item, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
        }
        doc.rect(margin, y, pageWidth - 2 * margin, 7);
        
        tx = margin;
        
        const trainingName = doc.splitTextToSize(item.training_name || '', tColWidths[0] - 4);
        doc.text(trainingName[0] || '', tx + 2, y + 5);
        tx += tColWidths[0];
        
        doc.text(item.modality || 'FORMAÇÃO', tx + 2, y + 5);
        tx += tColWidths[1];
        
        doc.text(String(item.duration_hours || 0), tx + 2, y + 5);
        tx += tColWidths[2];
        
        doc.text(item.start_date || '-', tx + 2, y + 5);
        tx += tColWidths[3];
        
        const instructorName = doc.splitTextToSize(item.instructor_name || '-', tColWidths[4] - 4);
        doc.text(instructorName[0] || '', tx + 2, y + 5);
        tx += tColWidths[4];
        
        doc.text(item.instructor_cpf || '-', tx + 2, y + 5);
        
        y += 7;
      });

      // Resumo
      y += 10;
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F');
      doc.rect(margin, y, pageWidth - 2 * margin, 25);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      
      const totalHours = trainings.reduce((sum, item) => sum + (item.duration_hours || 0), 0);
      const totalStudents = trainings.reduce((sum, item) => sum + (item.students_count || 0), 0);
      
      doc.text(`Total de Treinamentos: ${trainings.length}`, margin + 10, y + 10);
      doc.text(`Carga Horária Total: ${totalHours}h`, margin + 70, y + 10);
      doc.text(`Alunos Treinados: ${totalStudents}`, margin + 130, y + 10);
    }

    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(`Gerado em: ${bmmData.generatedDate || new Date().toLocaleDateString('pt-BR')}`, margin, 290);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=BMM_${bmmData.company?.nome_fantasia || 'empresa'}_${bmmData.period || 'periodo'}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});