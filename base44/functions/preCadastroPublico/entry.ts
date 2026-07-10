import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_B64_LEN = 11000000; // ~8MB
const LGPD_TERMO = 'Autorizo o uso dos meus dados pessoais e documentos para fins de cadastro, matrícula, emissão de certificado, validação acadêmica e cumprimento de obrigações legais da CAT Cursos.';

function limparCPF(v) { return (v || '').toString().replace(/\D/g, ''); }

function validarCPF(v) {
  const cpf = limparCPF(v);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10]);
}

function formatarCPF(v) {
  const d = limparCPF(v).slice(0, 11);
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Método não permitido' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json();

    // ── Contexto público mínimo da oferta/pacote (sem dados sensíveis) ──
    if (body.action === 'contexto') {
      let oferta = null, pacote = null;
      if (body.oferta_id) {
        const o = await svc.entities.CourseOffer.get(body.oferta_id).catch(() => null);
        if (o) oferta = {
          id: o.id, nome_comercial: o.nome_comercial, course_name: o.course_name,
          carga_horaria: o.carga_horaria, valor: o.valor, data_inicio: o.data_inicio,
          data_termino: o.data_termino, horario: o.horario, local: o.local,
          modalidade: o.modalidade, status: o.status,
          vagas_disponiveis: Math.max(0, (o.vagas_total || 0) - (o.vagas_preenchidas || 0)),
        };
      }
      if (body.pacote_id) {
        const p = await svc.entities.CoursePackage.get(body.pacote_id).catch(() => null);
        if (p) pacote = {
          id: p.id, nome: p.nome, descricao: p.descricao,
          cursos: (p.cursos || []).map(c => ({ course_name: c.course_name, carga_horaria: c.carga_horaria, data_inicio: c.data_inicio, data_termino: c.data_termino })),
          valor_final: p.valor_final ?? p.valor_total, status: p.status,
          vagas_disponiveis: Math.max(0, (p.vagas_total || 0) - (p.vagas_preenchidas || 0)),
        };
      }
      return Response.json({ oferta, pacote });
    }

    // ── Envio do pré-cadastro (público, limitado a criar PreCadastro) ──
    if (body.action === 'enviar') {
      const d = body.dados || {};

      if (!d.lgpd_aceito) return Response.json({ error: 'É necessário aceitar o termo de uso de dados (LGPD) para enviar a inscrição.' }, { status: 400 });
      const obrigatorios = { nome_completo: 'nome completo', cpf: 'CPF', telefone: 'telefone/WhatsApp', email: 'e-mail', endereco: 'endereço', cidade: 'cidade', estado: 'estado', cep: 'CEP' };
      for (const [campo, label] of Object.entries(obrigatorios)) {
        if (!d[campo] || !String(d[campo]).trim()) return Response.json({ error: `Preencha o campo obrigatório: ${label}.` }, { status: 400 });
      }

      const digits = limparCPF(d.cpf);
      const cpfValido = validarCPF(digits);
      const cpfFmt = formatarCPF(digits) || d.cpf;

      // Duplicidade — nunca cria aluno, apenas sinaliza para o operador
      let dupId = '', dupNome = '';
      if (digits.length === 11) {
        let match = (await svc.entities.Student.filter({ cpf: cpfFmt }).catch(() => []))[0];
        if (!match) {
          const all = await svc.entities.Student.list('-created_date', 1000).catch(() => []);
          match = (all || []).find(s => limparCPF(s.cpf) === digits);
        }
        if (match) { dupId = match.id; dupNome = match.full_name || ''; }
      }

      // Documentos (upload privado, tipos seguros)
      const docs = [];
      const inDocs = Array.isArray(body.documentos) ? body.documentos.slice(0, 6) : [];
      for (const doc of inDocs) {
        if (!doc || !doc.base64) continue;
        if (!ALLOWED_MIMES.includes(doc.mime)) return Response.json({ error: 'Tipo de arquivo não permitido. Envie foto (JPG/PNG/WEBP) ou PDF.' }, { status: 400 });
        if (doc.base64.length > MAX_B64_LEN) return Response.json({ error: 'Arquivo muito grande. Envie imagens de até 8MB.' }, { status: 400 });
        const bytes = Uint8Array.from(atob(doc.base64), c => c.charCodeAt(0));
        const ext = doc.mime === 'application/pdf' ? 'pdf' : doc.mime.split('/')[1];
        const file = new File([bytes], `precadastro_${digits || 'doc'}_${(doc.tipo || 'DOC')}_${(doc.lado || 'unico')}.${ext}`, { type: doc.mime });
        const up = await svc.integrations.Core.UploadPrivateFile({ file });
        docs.push({
          tipo: ['RG', 'CPF', 'CNH', 'Outro'].includes(doc.tipo) ? doc.tipo : 'Outro',
          lado: ['Único', 'Frente', 'Verso'].includes(doc.lado) ? doc.lado : 'Único',
          file_uri: up.file_uri, file_name: file.name,
          status_documento: 'Pendente de validação', motivo: '',
          cnh_numero: doc.cnh_numero || '', cnh_categoria: doc.cnh_categoria || '',
          cnh_validade: doc.cnh_validade || '', cnh_renach: doc.cnh_renach || '', cnh_emissao: doc.cnh_emissao || '',
        });
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
      const ua = (req.headers.get('user-agent') || '').slice(0, 300);
      const agora = new Date().toISOString();

      let status = 'Aguardando validação';
      if (!cpfValido) status = 'Corrigir dados';
      else if (dupId) status = 'Duplicidade identificada';

      const rec = await svc.entities.PreCadastro.create({
        nome_completo: String(d.nome_completo).trim().slice(0, 200),
        cpf: cpfFmt, cpf_valido: cpfValido, cpf_duplicado: !!dupId, student_id_existente: dupId,
        telefone: String(d.telefone).slice(0, 30), email: String(d.email).slice(0, 150),
        endereco: String(d.endereco).slice(0, 300), cidade: String(d.cidade).slice(0, 100),
        estado: String(d.estado).slice(0, 2).toUpperCase(), cep: String(d.cep).slice(0, 12),
        data_nascimento: d.data_nascimento || null,
        observacoes: (d.observacoes || '').slice(0, 500), indicacao: (d.indicacao || '').slice(0, 200),
        tipo_interesse: d.pacote_id ? 'Pacote' : d.oferta_id ? 'Oferta' : 'Geral',
        oferta_id: d.oferta_id || '', oferta_nome: d.oferta_nome || '',
        pacote_id: d.pacote_id || '', pacote_nome: d.pacote_nome || '',
        atendente_id: d.atendente_id || '', atendente_nome: (d.atendente_nome || '').slice(0, 150),
        origem: 'QR Code',
        lgpd_aceito: true, lgpd_aceito_em: agora, lgpd_ip: ip, lgpd_dispositivo: ua, lgpd_termo: LGPD_TERMO,
        status, documentos: docs,
      });

      const audit = (action, details) => svc.entities.AuditLog.create({
        user_email: String(d.email).slice(0, 150), user_name: String(d.nome_completo).slice(0, 150),
        action, entity_type: 'PreCadastro', entity_id: rec.id, entity_name: String(d.nome_completo).slice(0, 150),
        details: `FASE 2 QR Code: ${details} — ${agora}`, ip_address: ip,
      }).catch(() => {});

      await audit('create', `pré-cadastro enviado via QR Code/link. Interesse: ${rec.tipo_interesse}${d.oferta_nome ? ` (${d.oferta_nome})` : ''}${d.pacote_nome ? ` (${d.pacote_nome})` : ''}. Atendente do link: ${d.atendente_nome || 'nenhum'}. Status inicial: ${status}`);
      await audit('create', `aceite LGPD registrado. IP: ${ip || 'não disponível'}. Dispositivo: ${ua || 'não disponível'}`);
      if (docs.length > 0) await audit('create', `${docs.length} documento(s) enviado(s) pelo aluno (${docs.map(x => `${x.tipo}/${x.lado}`).join(', ')}) — pendentes de validação manual`);
      if (!cpfValido) await audit('update', 'CPF inválido identificado no pré-cadastro — marcado como Corrigir dados');
      if (dupId) await audit('update', `CPF já existente na base identificado (aluno: ${dupNome}) — nenhum aluno duplicado foi criado; operador deve decidir vinculação`);

      return Response.json({ ok: true, status, cpf_valido: cpfValido });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});