import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

  const { file_url, proposal_id } = await req.json();

  if (!file_url || !proposal_id) {
    return Response.json({ error: 'file_url e proposal_id são obrigatórios' }, { status: 400 });
  }

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

  const courses = (result.courses || []).map(c => ({
    ...c,
    start_date: null,
    end_date: null,
    location: null,
    instructor_name: null,
    modality: "Presencial"
  }));

  await base44.asServiceRole.entities.Proposal.update(proposal_id, {
    status: "Aguardando Revisão",
    company_name: result.company_name || null,
    company_cnpj: result.company_cnpj || null,
    courses: courses,
    total_value: result.total_value || null,
    ai_raw_extraction: JSON.stringify(result)
  });

  return Response.json({ success: true, data: result });
});