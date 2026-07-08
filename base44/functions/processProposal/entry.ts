import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let proposal_id = null;
  let etapa = "Upload recebido";

  const marcarErro = async (error) => {
    if (!proposal_id) return;
    const mensagem = `Erro no processamento — etapa: ${etapa}. Detalhe: ${error.message || error}`;
    await base44.entities.Proposal.update(proposal_id, {
      status: "Erro",
      notes: mensagem
    });
  };

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { file_url } = body;
    proposal_id = body.proposal_id;

    if (!file_url || !proposal_id) {
      return Response.json({ error: 'file_url e proposal_id são obrigatórios' }, { status: 400 });
    }

    await base44.entities.Proposal.update(proposal_id, {
      notes: "Checkpoint: Upload recebido"
    });

    etapa = "IA iniciada";
    await base44.entities.Proposal.update(proposal_id, {
      notes: "Checkpoint: IA iniciada"
    });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um especialista em análise de propostas comerciais de treinamento. 
Analise o documento PDF fornecido e extraia as seguintes informações em formato JSON estruturado:

1. Nome da empresa contratante
2. CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX)
3. Lista de cursos/treinamentos solicitados, incluindo para cada um:
   - Nome do curso
   - Carga horária (em horas, apenas número)
   - Quantidade de alunos/participantes
   - Valor unitário (por pessoa ou por turma, em reais, apenas número)
   - Valor total (em reais, apenas número)
4. Valor total geral da proposta (em reais, apenas número)

Retorne APENAS o JSON, sem explicações adicionais. Se não encontrar algum dado, use null.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          company_name: { type: "string" },
          company_cnpj: { type: "string" },
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_name: { type: "string" },
                workload_hours: { type: "number" },
                students_count: { type: "number" },
                unit_value: { type: "number" },
                total_value: { type: "number" }
              }
            }
          },
          total_value: { type: "number" }
        }
      }
    });

    etapa = "IA concluída";
    await base44.entities.Proposal.update(proposal_id, {
      notes: "Checkpoint: IA concluída"
    });

    let company_id = null;

    // 1. Sincronizar empresa — busca por CNPJ primeiro, depois por razão social
    if (result.company_name || result.company_cnpj) {
      let existingCompanies = [];

      // Busca prioritária pelo CNPJ (mais confiável)
      if (result.company_cnpj) {
        existingCompanies = await base44.asServiceRole.entities.Company.filter({
          cnpj: result.company_cnpj
        });
      }

      // Fallback: busca por razão social
      if (existingCompanies.length === 0 && result.company_name) {
        existingCompanies = await base44.asServiceRole.entities.Company.filter({
          razao_social: result.company_name
        });
        // Também tenta pelo nome_fantasia
        if (existingCompanies.length === 0) {
          existingCompanies = await base44.asServiceRole.entities.Company.filter({
            nome_fantasia: result.company_name
          });
        }
      }

      if (existingCompanies.length > 0) {
        // Empresa já existe — atualiza CNPJ se estava faltando
        company_id = existingCompanies[0].id;
        if (result.company_cnpj && !existingCompanies[0].cnpj) {
          await base44.asServiceRole.entities.Company.update(company_id, {
            cnpj: result.company_cnpj
          });
        }
      } else {
        // Cria nova empresa mesmo sem CNPJ
        const newCompany = await base44.asServiceRole.entities.Company.create({
          razao_social: result.company_name || "Empresa sem nome",
          nome_fantasia: result.company_name || "Empresa sem nome",
          cnpj: result.company_cnpj || "",
          status: "Ativo"
        });
        company_id = newCompany.id;
      }
    }

    etapa = "Empresa sincronizada";
    await base44.entities.Proposal.update(proposal_id, {
      notes: "Checkpoint: Empresa sincronizada"
    });

    const courses = (result.courses || []).map(c => ({
      ...c,
      start_date: null,
      end_date: null,
      location: null,
      instructor_name: null,
      modality: "Presencial"
    }));

    etapa = "Proposal atualizada";
    await base44.entities.Proposal.update(proposal_id, {
      status: "Aguardando Revisão",
      company_name: result.company_name || null,
      company_cnpj: result.company_cnpj || null,
      company_id: company_id,
      courses: courses,
      total_value: result.total_value || null,
      ai_raw_extraction: JSON.stringify(result),
      notes: "Checkpoint: Proposal atualizada"
    });

    return Response.json({ success: true, data: result, company_id });
  } catch (error) {
    try {
      await marcarErro(error);
    } catch {}
    return Response.json({ error: error.message || 'Erro interno', etapa }, { status: 500 });
  }
});