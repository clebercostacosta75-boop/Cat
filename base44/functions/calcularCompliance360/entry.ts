import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { empresa_id } = await req.json().catch(() => ({}));

    // 1. Buscar todos os alunos ativos
    const allStudents = await base44.asServiceRole.entities.Student.filter({ status: 'Ativo' });
    const students = empresa_id
      ? allStudents.filter(s => s.company_id === empresa_id)
      : allStudents;

    // 2. Buscar matriz, funções, empresas e certificados
    const [matrizEntries, funcoes, companies, allCerts] = await Promise.all([
      base44.asServiceRole.entities.MatrizTreinamento.filter({ obrigatorio: true, ativo: true }),
      base44.asServiceRole.entities.FuncaoCargo.list(),
      base44.asServiceRole.entities.Company.list(),
      base44.asServiceRole.entities.Certificate.filter({ status: 'active' })
    ]);

    const now = new Date();
    const companyMap = {};
    const funcaoMap = {};
    const nrMap = {};
    let totalChecks = 0;
    let totalConformes = 0;
    let totalVencendo = 0;
    let totalVencidos = 0;
    let totalPendentes = 0;
    let studentsWithoutFuncao = 0;
    const alunosDetalhados = [];

    // 3. Para cada aluno, cruzar com a matriz
    for (const student of students) {
      const cpf = (student.cpf || '').replace(/\D/g, '');
      if (!student.funcao_id) {
        studentsWithoutFuncao++;
        alunosDetalhados.push({
          id: student.id,
          nome: student.full_name,
          cpf: student.cpf,
          company_name: student.company_name || '',
          funcao_nome: null,
          score: null,
          conformes: 0, vencendo: 0, vencidos: 0, pendentes: 0, total: 0,
          sem_funcao: true
        });
        continue;
      }

      const funcao = funcoes.find(f => f.id === student.funcao_id);
      if (!funcao) {
        studentsWithoutFuncao++;
        alunosDetalhados.push({
          id: student.id, nome: student.full_name, cpf: student.cpf,
          company_name: student.company_name || '', funcao_nome: null,
          score: null, conformes: 0, vencendo: 0, vencidos: 0, pendentes: 0, total: 0,
          sem_funcao: true
        });
        continue;
      }

      // Entradas da matriz para esta função
      const relevantEntries = matrizEntries.filter(e => {
        if (e.funcao_id !== funcao.id) return false;
        if (!e.empresa_id) return true;
        return e.empresa_id === student.company_id;
      });

      const certsAluno = allCerts.filter(c => (c.student_cpf || '').replace(/\D/g, '') === cpf);

      const resultados = relevantEntries.map(entry => {
        const certsParaEsteCurso = certsAluno.filter(c =>
          (c.course_name || '').toLowerCase().includes((entry.curso_nome || '').toLowerCase()) ||
          c.course_id === entry.curso_id ||
          (c.course_name || '').toLowerCase().includes((entry.nr_codigo || '').toLowerCase())
        );

        const validos = certsParaEsteCurso.filter(c => {
          if (c.status === 'revoked') return false;
          if (!c.valid_until) return true;
          return new Date(c.valid_until) > now;
        });

        const maisRecente = validos.sort((a, b) => {
          if (!a.valid_until && !b.valid_until) return 0;
          if (!a.valid_until) return -1;
          if (!b.valid_until) return 1;
          return new Date(b.valid_until) - new Date(a.valid_until);
        })[0];

        let status = 'pendente';
        let diasRestantes = null;
        if (maisRecente?.valid_until) {
          diasRestantes = Math.round((new Date(maisRecente.valid_until) - now) / 86400000);
          status = diasRestantes < 0 ? 'vencido' : diasRestantes <= 30 ? 'vencendo' : 'conforme';
        } else if (maisRecente && !maisRecente.valid_until) {
          status = 'conforme';
        }

        return { nr_codigo: entry.nr_codigo, curso_nome: entry.curso_nome, status, dias_restantes: diasRestantes };
      });

      const conformes = resultados.filter(r => r.status === 'conforme').length;
      const vencendo = resultados.filter(r => r.status === 'vencendo').length;
      const vencidos = resultados.filter(r => r.status === 'vencido').length;
      const pendentes = resultados.filter(r => r.status === 'pendente').length;
      const total = resultados.length;
      const score = total > 0 ? Math.round((conformes / total) * 100) : 0;

      totalChecks += total;
      totalConformes += conformes;
      totalVencendo += vencendo;
      totalVencidos += vencidos;
      totalPendentes += pendentes;

      alunosDetalhados.push({
        id: student.id, nome: student.full_name, cpf: student.cpf,
        company_name: student.company_name || '', funcao_nome: funcao.nome,
        score, conformes, vencendo, vencidos, pendentes, total, sem_funcao: false
      });

      // Acumular por empresa
      const cKey = student.company_name || 'Sem empresa';
      if (!companyMap[cKey]) companyMap[cKey] = { nome: cKey, conformes: 0, vencendo: 0, vencidos: 0, pendentes: 0, total: 0, alunos: 0 };
      companyMap[cKey].conformes += conformes;
      companyMap[cKey].vencendo += vencendo;
      companyMap[cKey].vencidos += vencidos;
      companyMap[cKey].pendentes += pendentes;
      companyMap[cKey].total += total;
      companyMap[cKey].alunos++;

      // Acumular por função
      if (!funcaoMap[funcao.nome]) funcaoMap[funcao.nome] = { nome: funcao.nome, conformes: 0, vencendo: 0, vencidos: 0, pendentes: 0, total: 0, alunos: 0 };
      funcaoMap[funcao.nome].conformes += conformes;
      funcaoMap[funcao.nome].vencendo += vencendo;
      funcaoMap[funcao.nome].vencidos += vencidos;
      funcaoMap[funcao.nome].pendentes += pendentes;
      funcaoMap[funcao.nome].total += total;
      funcaoMap[funcao.nome].alunos++;

      // Acumular por NR (dos resultados)
      resultados.forEach(r => {
        if (!nrMap[r.nr_codigo]) nrMap[r.nr_codigo] = { nr: r.nr_codigo, conformes: 0, vencendo: 0, vencidos: 0, pendentes: 0, total: 0 };
        nrMap[r.nr_codigo].total++;
        if (r.status === 'conforme') nrMap[r.nr_codigo].conformes++;
        else if (r.status === 'vencendo') nrMap[r.nr_codigo].vencendo++;
        else if (r.status === 'vencido') nrMap[r.nr_codigo].vencidos++;
        else nrMap[r.nr_codigo].pendentes++;
      });
    }

    // 4. Calcular scores
    const scoreGeral = totalChecks > 0 ? Math.round((totalConformes / totalChecks) * 100) : 0;

    const byCompany = Object.values(companyMap).map(c => ({
      ...c, score: c.total > 0 ? Math.round((c.conformes / c.total) * 100) : 0
    })).sort((a, b) => a.score - b.score);

    const byFuncao = Object.values(funcaoMap).map(f => ({
      ...f, score: f.total > 0 ? Math.round((f.conformes / f.total) * 100) : 0
    })).sort((a, b) => a.score - b.score);

    const byNR = Object.values(nrMap).map(n => ({
      ...n, score: n.total > 0 ? Math.round((n.conformes / n.total) * 100) : 0,
      criticidade: n.total > 0 ? Math.round(((n.vencidos + n.pendentes) / n.total) * 100) : 0
    })).sort((a, b) => b.criticidade - a.criticidade);

    const alunosCriticos = alunosDetalhados.filter(a => a.vencidos > 0 || a.pendentes > 0 || a.sem_funcao).sort((a, b) => (a.score ?? -1) - (b.score ?? -1)).slice(0, 10);

    return Response.json({
      resumo: {
        total_alunos: students.length,
        alunos_com_funcao: students.length - studentsWithoutFuncao,
        alunos_sem_funcao: studentsWithoutFuncao,
        total_checks: totalChecks,
        conformes: totalConformes,
        vencendo: totalVencendo,
        vencidos: totalVencidos,
        pendentes: totalPendentes,
        score_geral: scoreGeral,
        empresas: companies.length,
        funcoes: funcoes.length,
        nrs_cobertas: Object.keys(nrMap).length,
      },
      byCompany: byCompany.slice(0, 20),
      byFuncao: byFuncao.slice(0, 20),
      byNR: byNR.slice(0, 20),
      alunosCriticos: alunosCriticos,
      alunosDetalhados: alunosDetalhados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});