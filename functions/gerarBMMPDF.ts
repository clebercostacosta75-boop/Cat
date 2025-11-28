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

        // Configurações de fonte
        doc.setFont('helvetica');

        if (templateType === 'model3' || templateType === 'model1') {
            // BMM Modelo Allbras / Demonstrativo Físico-Financeiro
            
            // Título
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('BOLETIM MENSAL DE MEDIÇÃO (BMM)', pageWidth / 2, y, { align: 'center' });
            y += 10;

            doc.setFontSize(12);
            doc.text('Demonstrativo Físico-Financeiro', pageWidth / 2, y, { align: 'center' });
            y += 15;

            // Informações da Contratada
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('REF. CONTRATO E ADITIVO', margin, y);
            y += 8;

            doc.setFont('helvetica', 'normal');
            doc.text(`CONTRATADA: ${bmmData.contractor?.razao_social || 'V.S. NUNES CURSOS E TREINAMENTO'}`, margin, y);
            y += 6;
            doc.text(`CNPJ: ${bmmData.contractor?.cnpj || '07.238.084/0001-45'}`, margin, y);
            y += 6;
            doc.text(`OBJETO: ${bmmData.company?.billing_info?.contract_object || 'Prestação de Serviços de treinamentos'}`, margin, y);
            y += 6;
            doc.text(`VALOR DO BMM: R$ ${bmmData.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`, margin, y);
            y += 6;
            doc.text(`BMM nº: ${bmmData.period || '-'}`, margin, y);
            y += 6;
            doc.text(`MÊS DE EXECUÇÃO: ${bmmData.month || '-'}`, margin, y);
            y += 6;
            doc.text(`PERÍODO DE MEDIÇÃO: ${bmmData.period || '-'}`, margin, y);
            y += 12;

            // Dados Bancários
            doc.setFont('helvetica', 'bold');
            doc.text('DADOS BANCÁRIOS:', margin, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(`Banco: ${bmmData.contractor?.bank_data?.bank_name || '-'}`, margin, y);
            y += 5;
            doc.text(`Agência: ${bmmData.contractor?.bank_data?.agency || '-'}`, margin, y);
            y += 5;
            doc.text(`Conta: ${bmmData.contractor?.bank_data?.account || '-'}`, margin, y);
            y += 12;

            // Tabela de Itens
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(200, 200, 200);
            doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
            doc.text('ITEM', margin + 2, y + 6);
            doc.text('DESCRIÇÃO', margin + 20, y + 6);
            doc.text('QTD', margin + 100, y + 6);
            doc.text('UNITÁRIO', margin + 120, y + 6);
            doc.text('TOTAL', margin + 150, y + 6);
            y += 10;

            doc.setFont('helvetica', 'normal');
            if (bmmData.items && bmmData.items.length > 0) {
                bmmData.items.forEach((item, index) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(`${index + 1}`, margin + 2, y);
                    doc.text(item.training_name?.substring(0, 40) || '-', margin + 20, y);
                    doc.text(`${item.students_count || 0}`, margin + 100, y);
                    doc.text(`R$ ${item.unit_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`, margin + 120, y);
                    doc.text(`R$ ${item.total_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`, margin + 150, y);
                    y += 7;
                });
            }

            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`VALOR TOTAL: R$ ${bmmData.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`, margin + 120, y);
            y += 20;

            // Assinaturas
            doc.setFont('helvetica', 'normal');
            doc.line(margin, y, margin + 50, y);
            doc.line(pageWidth / 2 - 25, y, pageWidth / 2 + 25, y);
            doc.line(pageWidth - margin - 50, y, pageWidth - margin, y);
            y += 5;
            doc.setFontSize(8);
            doc.text('CONTRATADA', margin + 15, y);
            doc.text('FISCALIZAÇÃO', pageWidth / 2, y, { align: 'center' });
            doc.text('GESTOR DO CONTRATO', pageWidth - margin - 25, y);

        } else if (templateType === 'model4' || templateType === 'model2') {
            // BMM Modelo Agropalma / Lista de Treinamentos Normativos
            
            // Cabeçalho verde
            doc.setFillColor(21, 128, 61);
            doc.rect(0, 0, pageWidth, 30, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(bmmData.company?.nome_fantasia || 'Empresa', margin, 12);
            
            doc.setFontSize(10);
            doc.text(`Treinamentos Normativos - Mês de ${bmmData.month || '-'} de ${bmmData.year || '-'}`, margin, 22);
            
            doc.setTextColor(0, 0, 0);
            y = 40;

            // Tabela
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(60, 60, 60);
            doc.setTextColor(255, 255, 255);
            doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
            
            const colWidths = [45, 25, 15, 25, 25, 35, 10];
            let xPos = margin + 2;
            
            doc.text('TREINAMENTO', xPos, y + 6);
            xPos += colWidths[0];
            doc.text('MODALIDADE', xPos, y + 6);
            xPos += colWidths[1];
            doc.text('H', xPos, y + 6);
            xPos += colWidths[2];
            doc.text('PERÍODO', xPos, y + 6);
            xPos += colWidths[3];
            doc.text('HORÁRIO', xPos, y + 6);
            xPos += colWidths[4];
            doc.text('INSTRUTOR', xPos, y + 6);
            xPos += colWidths[5];
            doc.text('MÊS', xPos, y + 6);
            
            y += 10;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');

            if (bmmData.items && bmmData.items.length > 0) {
                bmmData.items.forEach((item, index) => {
                    if (y > 275) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    xPos = margin + 2;
                    doc.text((item.training_name || '-').substring(0, 25), xPos, y);
                    xPos += colWidths[0];
                    doc.text((item.modality || '-').substring(0, 12), xPos, y);
                    xPos += colWidths[1];
                    doc.text(`${item.duration_hours || 0}`, xPos, y);
                    xPos += colWidths[2];
                    doc.text(item.start_date || '-', xPos, y);
                    xPos += colWidths[3];
                    doc.text((item.training_schedule || '-').substring(0, 12), xPos, y);
                    xPos += colWidths[4];
                    doc.text((item.instructor_name || '-').substring(0, 20), xPos, y);
                    xPos += colWidths[5];
                    doc.text((bmmData.month || '-').substring(0, 5), xPos, y);
                    
                    y += 6;
                });
            }

            // Totalizadores
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text(`Total de Treinamentos: ${bmmData.items?.length || 0}`, margin, y);
            y += 6;
            doc.text(`Carga Horária Total: ${bmmData.items?.reduce((sum, item) => sum + (item.duration_hours || 0), 0) || 0}h`, margin, y);
            y += 6;
            doc.text(`Alunos Treinados: ${bmmData.items?.reduce((sum, item) => sum + (item.students_count || 0), 0) || 0}`, margin, y);
        }

        // Rodapé
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${bmmData.generatedDate || new Date().toLocaleDateString('pt-BR')}`, margin, 285);

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