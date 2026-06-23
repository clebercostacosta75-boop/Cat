import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { student_id, student_cpf, student_nome, empresa_id } = await req.json();

    // 1. Localizar o aluno
    let student = null;
    if (student_id) {
      student = await base44.entities.Student.get(student_id);
    } else if (student_cpf) {
      const students = await base44.entities.Student.filter({ cpf: student_cpf });
      if (students.length > 0) student = students[0];
    }
    if (!student) return Response.json({ error: 'Aluno não encontrado' }, { status: 404 });

    // 2. Buscar função do aluno (se tiver campo funcao_id)
    let funcao = null;
    if (student.funcao_id) {
      funcao = await base44.entities.FuncaoCargo.get(student.funcao_id);
    }

    if (!funcao) {
      return Response.json({
        student: { id: student.id, nome: student.full_name, cpf: student.cpf },
        conformidade: null,
        message: 'Aluno sem função definida. Cadastre a função do colaborador na Matriz de Treinamentos.'
      });
    }

    // 3. Buscar vínculos na matriz para esta função
    const matrizEntries = await base44.entities.MatrizTreinamento.filter({
      funcao_id: funcao.id,
      obrigatorio: true,
      ativo: true
    });

    // Filtrar por empresa se especificada
    const relevantEntries = matrizEntries.filter(e =>
      !e.empresa_id || e.empresa_id === (empresa_id || student.company_id || '')
    );

    // 4. Buscar certificados existentes do aluno
    const certificates = await base44.entities.Certificate.filter({ student_cpf: student.cpf });

    // 5. Cruzar: para cada entrada da matriz, verificar se o aluno tem certificado válido
    const now = new Date();
    const resultados = relevantEntries.map(entry => {
      // Encontrar certificados que cobrem este curso/NR
      const certsParaEsteCurso = certificates.filter(c =>
        (c.course_name || '').toLowerCase().includes((entry.curso_nome || '').toLowerCase()) ||
        (c.course_id === entry.curso_id) ||
        (c.course_name || '').toLowerCase().includes((entry.nr_codigo || '').toLowerCase())
      );

      // Certificado mais recente válido
      const validos = certsParaEsteCurso.filter(c => {
        if (c.status === 'revoked') return false;
        if (!c.valid_until) return true; // sem validade = permanente
        return new Date(c.valid_until) > now;
      });

      const maisRecente = validos.sort((a, b) => {
        if (!a.valid_until && !b.valid_until) return 0;
        if (!a.valid_until) return -1;
        if (!b.valid_until) return 1;
        return new Date(b.valid_until) - new Date(a.valid_until);
      })[0];

      // Calcular datas
      let diasRestantes = null;
      let vencido = false;
      if (maisRecente?.valid_until) {
        const diff = Math.round((new Date(maisRecente.valid_until) - now) / 86400000);
        diasRestantes = diff;
        vencido = diff < 0;
      }

      // Status
      let status = 'pendente'; // sem nenhum certificado
      if (maisRecente && !vencido) {
        status = diasRestantes <= 30 ? 'vencendo' : 'conforme';
      } else if (maisRecente && vencido) {
        status = 'vencido';
      }

      return {
        matriz_entry_id: entry.id,
        nr_codigo: entry.nr_codigo,
        curso_nome: entry.curso_nome,
        modalidade: entry.modalidade,
        periodicidade_meses: entry.periodicidade_meses,
        carga_horaria_exigida: entry.carga_horaria,
        certificado_id: maisRecente?.id || null,
        certificado_validade: maisRecente?.valid_until || null,
        dias_restantes: diasRestantes,
        status,
        status_label: status === 'conforme' ? '✅ Conforme' : status === 'vencendo' ? '⚠️ Vencendo' : status === 'vencido' ? '❌ Vencido' : '❌ Pendente'
      };
    });

    // 6. Calcular score de conformidade
    const total = resultados.length;
    const conformes = resultados.filter(r => r.status === 'conforme').length;
    const vencendo = resultados.filter(r => r.status === 'vencendo').length;
    const vencidos = resultados.filter(r => r.status === 'vencido').length;
    const pendentes = resultados.filter(r => r.status === 'pendente').length;
    const score = total > 0 ? Math.round((conformes / total) * 100) : 0;

    // 7. Gerar alertas
    const alertas = [];
    resultados.filter(r => r.status === 'pendente').forEach(r => {
      alertas.push({ tipo: 'pendente', mensagem: `${r.curso_nome} (${r.nr_codigo}) — Treinamento obrigatório nunca realizado`, curso: r.curso_nome, nr: r.nr_codigo });
    });
    resultados.filter(r => r.status === 'vencido').forEach(r => {
      alertas.push({ tipo: 'vencido', mensagem: `${r.curso_nome} (${r.nr_codigo}) — Vencido há ${Math.abs(r.dias_restantes)} dias`, curso: r.curso_nome, nr: r.nr_codigo });
    });
    resultados.filter(r => r.status === 'vencendo').forEach(r => {
      alertas.push({ tipo: 'vencendo', mensagem: `${r.curso_nome} (${r.nr_codigo}) — Vence em ${r.dias_restantes} dias`, curso: r.curso_nome, nr: r.nr_codigo });
    });

    return Response.json({
      student: { id: student.id, nome: student.full_name, cpf: student.cpf },
      funcao: funcao.nome,
      empresa_id: empresa_id || student.company_id,
      total_requisitos: total,
      conformes,
      vencendo,
      vencidos,
      pendentes,
      score,
      resultados,
      alertas
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});