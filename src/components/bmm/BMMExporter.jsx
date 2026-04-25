export function exportBMMPDF(content, signatureUrl = null) {
  if (!content) return;

  const { company, contractor, period, classes, totals } = content;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('pt-BR'); } catch { return dateStr; }
  };

  const activeContract = company?.company_contracts?.find(c => c.status === 'Ativo');

  const contractorLogoUrl = contractor?.logo_url ||
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6902814ded9d094643e33644/a775a991d_Designsemnome.png';

  const tableRows = classes.map((cls, i) => {
    const dates = (cls.realization_dates || []).map(d => formatDate(d)).join(', ');
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8f8f8';
    return `
      <tr style="background:${rowBg};">
        <td style="border:1px solid #d1d5db; padding:5px 8px;">${i + 1}</td>
        <td style="border:1px solid #d1d5db; padding:5px 8px; font-weight:500;">
          ${cls.training_name || ''}
          ${dates ? `<div style="font-size:8pt; color:#6b7280; margin-top:2px;">&#128197; ${dates}</div>` : ''}
        </td>
        <td style="border:1px solid #d1d5db; padding:5px 8px; text-align:center;">${cls.duration_hours || '-'}h</td>
        <td style="border:1px solid #d1d5db; padding:5px 8px; text-align:center;">${cls.students_count || 0}</td>
        <td style="border:1px solid #d1d5db; padding:5px 8px; text-align:right;">${formatCurrency(cls.unit_value)}</td>
        <td style="border:1px solid #d1d5db; padding:5px 8px; text-align:right; font-weight:600;">${formatCurrency(cls.total_value)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
   <meta charset="UTF-8"/>
   <title>BMM - ${company?.nome_fantasia || ''} - ${period}</title>
   <style>
     * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
     body { font-family: Arial, sans-serif; font-size: 11px; color: #333; background: white; margin: 0; padding: 0; }
     
     @page { size: A4; margin: 10mm 15mm; }
     @media print {
       body { margin: 0; padding: 0; background: white; }
       html, body { height: auto; min-height: auto; }
     }

     .container { width: 190mm; margin: 0 auto; padding: 10mm; }
     section, .section, .page { margin-bottom: 8px !important; padding: 8px !important; page-break-inside: avoid; }
     h1, h2, h3 { margin-bottom: 4px !important; line-height: 1.2; }
     h1 { font-size: 13pt; font-weight: bold; color: #065f46; }
     h2 { font-size: 10pt; font-weight: bold; color: #1c1c1c; }
     h3 { font-size: 9pt; font-weight: bold; }
     p { margin-bottom: 2px !important; line-height: 1.3 !important; }
     
     table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 6px; }
     td, th { padding: 3px 5px !important; border: 1px solid #d1d5db; }
     thead tr { background-color: #059669; color: white; }
     thead th { border: 1px solid #047857; font-weight: bold; }
     tfoot tr { background-color: #d1fae5; font-weight: bold; }
     tfoot td { border: 1px solid #a7f3d0; }
     
     /* Header */
     .header-logos { display: flex; align-items: center; justify-content: space-between; padding-bottom: 6px; border-bottom: 2px solid #059669; margin-bottom: 6px; }
     .header-logos img { height: 35px; object-fit: contain; }
     .contractor-info { font-size: 8pt; color: #374151; }
     .contractor-info strong { display: block; font-size: 9pt; color: #111827; }
     
     /* Title section */
     .bmm-title { text-align: center; margin-bottom: 6px; }
     .bmm-title h1 { margin-bottom: 2px; }
     .bmm-title .period { font-size: 9pt; color: #374151; }
     .bmm-title .contract { font-size: 8pt; color: #6b7280; margin-top: 1px; }
     
     /* Client box */
     .client-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 6px; margin-bottom: 6px; }
     .client-box h2 { color: #065f46; border-bottom: 1px solid #d1fae5; padding-bottom: 2px; margin-bottom: 3px; }
     .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8pt; }
     .client-grid p { margin-bottom: 1px; }
     
     /* Summary cards - COMPACT */
     .summary-cards { display: flex; gap: 6px; margin-bottom: 6px; }
     .summary-card { flex: 1; padding: 4px; text-align: center; border-radius: 2px; height: 45px; display: flex; flex-direction: column; justify-content: center; }
     .card-green { background: #ecfdf5; }
     .card-blue { background: #eff6ff; }
     .card-amber { background: #fffbeb; }
     .card-number { font-size: 12pt; font-weight: bold; line-height: 1; margin-bottom: 1px; }
     .card-green .card-number { color: #059669; }
     .card-blue .card-number { color: #2563eb; }
     .card-amber .card-number { color: #d97706; font-size: 10pt; }
     .card-label { font-size: 7pt; color: #6b7280; line-height: 1.1; }
     
     /* Signatures */
     .sig-page-title { text-align: center; margin-bottom: 6px; }
     .sig-page-title h2 { margin: 0 0 2px 0; }
     .sig-page-title p { font-size: 8pt; color: #6b7280; margin: 0; }
     .sig-row { display: flex; gap: 16px; justify-content: center; margin-bottom: 12px; }
     .sig-block { text-align: center; min-width: 120px; }
     .sig-line { border-top: 1.5px solid #374151; padding-top: 2px; margin-top: 25px; }
     .sig-name { font-weight: bold; font-size: 8pt; color: #111827; margin: 0; line-height: 1.2; }
     .sig-role { font-size: 7pt; color: #6b7280; margin: 1px 0 0 0; }
     .sig-company { font-size: 7pt; color: #9ca3af; margin: 0; }
     .sig-img { max-height: 25px; margin-bottom: -3px; }
     
     /* Footer */
     .doc-footer { text-align: center; font-size: 7pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 6px; }
   </style>
  </head>
  <body>

<!-- ===== Cabeçalho + Dados do Cliente ===== -->
<div class="container">
  <div class="header-logos">
    <div style="display:flex; align-items:center; gap:16px;">
      <img src="${contractorLogoUrl}" alt="Logo Contratada"/>
      ${contractor ? `
        <div class="contractor-info">
          <strong>${contractor.company_name || ''}</strong>
          ${contractor.razao_social ? `<span>${contractor.razao_social}</span><br/>` : ''}
          ${contractor.cnpj ? `<span>CNPJ: ${contractor.cnpj}</span>` : ''}
        </div>` : ''}
    </div>
    ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo Cliente"/>` : ''}
  </div>

  <div class="bmm-title">
    <h1>BOLETIM MENSAL DE MEDIÇÃO — BMM</h1>
    <p class="period">Período: <strong>${period}</strong></p>
    ${activeContract ? `
      <p class="contract">
        Contrato: <strong>${activeContract.contract_number}</strong>
        ${activeContract.amendment_number ? ` &nbsp;|&nbsp; Aditivo: <strong>${activeContract.amendment_number}</strong>` : ''}
      </p>` : ''}
  </div>

  <div class="client-box">
    <h2>DADOS DO CLIENTE</h2>
    <div class="client-grid">
      <div>
        <p><strong>Razão Social:</strong> ${company?.razao_social || '—'}</p>
        <p><strong>Nome Fantasia:</strong> ${company?.nome_fantasia || '—'}</p>
        <p><strong>CNPJ:</strong> ${company?.cnpj || '—'}</p>
      </div>
      <div>
        ${company?.billing_info?.contact_reference ? `<p><strong>Ref. Contato:</strong> ${company.billing_info.contact_reference}</p>` : ''}
        ${company?.email_faturamento ? `<p><strong>E-mail de Faturamento:</strong> ${company.email_faturamento}</p>` : ''}
        ${company?.billing_info?.contract_object ? `<p><strong>Objeto:</strong> ${company.billing_info.contract_object}</p>` : ''}
      </div>
    </div>
  </div>

<!-- ===== Demonstrativo + Cards ===== -->
<div class="section">
  <h2 style="margin-bottom:12px; color:#065f46; border-bottom:2px solid #d1fae5; padding-bottom:6px;">DEMONSTRATIVO DE TREINAMENTOS</h2>

  <table>
    <thead>
      <tr>
        <th style="width:30px;">Nº</th>
        <th>Treinamento / Datas de Realização</th>
        <th style="width:50px; text-align:center;">C.H.</th>
        <th style="width:70px; text-align:center;">Qtd. Alunos</th>
        <th style="width:90px; text-align:right;">Valor Unit.</th>
        <th style="width:100px; text-align:right;">Valor Total</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right;">TOTAIS:</td>
        <td style="text-align:center;">${totals.students}</td>
        <td></td>
        <td style="text-align:right; color:#065f46;">${formatCurrency(totals.value)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="summary-cards">
    <div class="summary-card card-green">
      <div class="card-number">${totals.classes}</div>
      <div class="card-label">Turmas Realizadas</div>
    </div>
    <div class="summary-card card-blue">
      <div class="card-number">${totals.students}</div>
      <div class="card-label">Total de Alunos</div>
    </div>
    <div class="summary-card card-amber">
      <div class="card-number">${formatCurrency(totals.value)}</div>
      <div class="card-label">Valor Total do Período</div>
    </div>
  </div>

<!-- ===== Assinaturas ===== -->
<div class="section">
  <div class="sig-page-title">
    <h2>DECLARAÇÃO E ASSINATURAS</h2>
    <p style="font-size:9pt; color:#6b7280; margin-top:8px;">
      As partes abaixo identificadas declaram estar de acordo com os serviços prestados conforme demonstrativo acima.
    </p>
  </div>

  <div class="sig-row">
     <div class="sig-block">
       <div class="sig-line">
         <p class="sig-name">${contractor?.company_name || 'CONTRATADA'}</p>
         <p class="sig-role">CONTRATADA</p>
       </div>
     </div>
     <div class="sig-block">
       <div class="sig-line">
         <p class="sig-name">${company?.nome_fantasia || company?.razao_social || 'CONTRATANTE'}</p>
         <p class="sig-role">CONTRATANTE</p>
       </div>
     </div>
     <div class="sig-block">
       <div class="sig-line">
         <p class="sig-name">${company?.fiscal_name || '________'}</p>
         <p class="sig-role">FISCALIZAÇÃO</p>
       </div>
     </div>
   </div>

  <div class="doc-footer">
    <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; Este documento é válido como comprovante de serviços prestados.</p>
  </div>
</div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Popup bloqueado. Por favor, permita popups para este site.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
}