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
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #1c1c1c; background: white; }

    @media print {
      @page { size: A4 portrait; margin: 15mm; }
    }

    .page { width: 100%; margin-bottom: 0; }
    .page-break { page-break-after: always; }

    h1 { font-size: 16pt; font-weight: bold; color: #065f46; }
    h2 { font-size: 11pt; font-weight: bold; color: #1c1c1c; margin-bottom: 10px; }

    /* === PÁGINA 1: Cabeçalho + Dados do Cliente === */
    .header-logos { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 3px solid #059669; margin-bottom: 20px; }
    .header-logos img { height: 56px; object-fit: contain; }
    .contractor-info { font-size: 9pt; color: #374151; }
    .contractor-info strong { display: block; font-size: 10pt; color: #111827; }
    .bmm-title { text-align: center; margin-bottom: 20px; }
    .bmm-title h1 { margin-bottom: 4px; }
    .bmm-title .period { font-size: 12pt; color: #374151; }
    .bmm-title .contract { font-size: 9pt; color: #6b7280; margin-top: 4px; }
    .client-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; }
    .client-box h2 { color: #065f46; border-bottom: 1px solid #d1fae5; padding-bottom: 6px; margin-bottom: 12px; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 9.5pt; }
    .client-grid p { margin-bottom: 4px; }

    /* === PÁGINA 2: Tabela + Cards === */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 20px; }
    thead tr { background-color: #059669; color: white; }
    thead th { padding: 7px 8px; text-align: left; border: 1px solid #047857; }
    tfoot tr { background-color: #d1fae5; font-weight: bold; }
    tfoot td { padding: 6px 8px; border: 1px solid #a7f3d0; }
    .summary-cards { display: flex; gap: 16px; margin-bottom: 20px; }
    .summary-card { flex: 1; border-radius: 8px; padding: 16px; text-align: center; }
    .card-green { background: #ecfdf5; }
    .card-blue { background: #eff6ff; }
    .card-amber { background: #fffbeb; }
    .card-number { font-size: 24pt; font-weight: bold; }
    .card-green .card-number { color: #059669; }
    .card-blue .card-number { color: #2563eb; }
    .card-amber .card-number { color: #d97706; font-size: 18pt; }
    .card-label { font-size: 9pt; color: #6b7280; margin-top: 4px; }

    /* === PÁGINA 3: Assinaturas === */
    .sig-page-title { text-align: center; margin-bottom: 30px; }
    .sig-page-title h2 { font-size: 13pt; color: #065f46; }
    .sig-row { display: flex; gap: 40px; justify-content: center; margin-bottom: 50px; }
    .sig-block { text-align: center; min-width: 160px; }
    .sig-line { border-top: 2px solid #374151; padding-top: 8px; margin-top: 60px; }
    .sig-name { font-weight: bold; font-size: 10pt; color: #111827; }
    .sig-role { font-size: 8.5pt; color: #6b7280; margin-top: 3px; }
    .sig-company { font-size: 8pt; color: #9ca3af; margin-top: 2px; }
    .sig-img { max-height: 48px; margin-bottom: -10px; }
    .sig-stamp { background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; padding:6px 12px; font-size:8pt; color:#1d4ed8; display:inline-block; margin-bottom:8px; }
    .doc-footer { text-align: center; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 40px; }
  </style>
</head>
<body>

<!-- ===== PÁGINA 1: Cabeçalho + Dados do Cliente ===== -->
<div class="page page-break">
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
</div>

<!-- ===== PÁGINA 2: Demonstrativo + Cards ===== -->
<div class="page page-break">
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
</div>

<!-- ===== PÁGINA 3: Assinaturas ===== -->
<div class="page">
  <div class="sig-page-title">
    <h2>DECLARAÇÃO E ASSINATURAS</h2>
    <p style="font-size:9pt; color:#6b7280; margin-top:8px;">
      As partes abaixo identificadas declaram estar de acordo com os serviços prestados conforme demonstrativo acima.
    </p>
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">${contractor?.company_name || 'CONTRATADA'}</div>
        <div class="sig-role">CONTRATADA</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">${company?.nome_fantasia || company?.razao_social || 'CONTRATANTE'}</div>
        <div class="sig-role">CONTRATANTE</div>
      </div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">${company?.fiscal_name || '______________________________'}</div>
        <div class="sig-role">FISCALIZAÇÃO</div>
        ${company?.fiscal_role ? `<div class="sig-company">${company.fiscal_role}</div>` : ''}
      </div>
    </div>
    <div class="sig-block">
      ${signatureUrl ? `<img src="${signatureUrl}" class="sig-img" alt="Assinatura Digital"/>` : ''}
      <div class="sig-line">
        <div class="sig-name">${company?.contract_manager_name || '______________________________'}</div>
        <div class="sig-role">GESTOR DO CONTRATO</div>
        ${company?.contract_manager_role ? `<div class="sig-company">${company.contract_manager_role}</div>` : ''}
        ${signatureUrl ? `<div class="sig-stamp">✔ Assinado digitalmente em ${new Date().toLocaleString('pt-BR')}</div>` : ''}
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