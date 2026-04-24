import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { instructor_id } = await req.json();
        if (!instructor_id) {
            return Response.json({ error: 'instructor_id obrigatório' }, { status: 400 });
        }

        // Buscar dados completos do instrutor
        const instructors = await base44.asServiceRole.entities.Instructor.filter({ 
            id: instructor_id 
        });
        const instructor = instructors[0];

        if (!instructor) {
            return Response.json({ error: 'Instrutor não encontrado' }, { status: 404 });
        }

        // Buscar treinamentos ministrados
        const trainings = await base44.asServiceRole.entities.TrainingSchedule.filter({ 
            instructor_name: instructor.name 
        });

        // Montar contexto para a IA
        const formationsText = (instructor.formations || [])
            .map(f => `- ${f.category}: ${f.title}${f.institution ? ` (${f.institution})` : ''}${f.year ? ` - ${f.year}` : ''}`)
            .join('\n');

        const trainingsText = trainings.length > 0
            ? `Ministrou ${trainings.length} treinamento(s), incluindo: ${trainings.slice(0, 5).map(t => t.training_name).join(', ')}`
            : 'Nenhum treinamento registrado no sistema ainda';

        // GERAR PERFIL COM IA
        const profile = await base44.integrations.Core.InvokeLLM({
            prompt: `Você é um especialista em Recursos Humanos e redação de perfis profissionais.

TAREFA: Crie um perfil profissional completo e bem redigido para o instrutor abaixo.

INFORMAÇÕES DO INSTRUTOR:
Nome: ${instructor.name}
Especialidade: ${instructor.specialty || 'Não especificada'}
E-mail: ${instructor.email || 'Não informado'}
Telefone: ${instructor.phone || 'Não informado'}

FORMAÇÕES E QUALIFICAÇÕES:
${formationsText || 'Nenhuma formação cadastrada'}

EXPERIÊNCIA:
${trainingsText}

INSTRUÇÕES PARA O PERFIL:
1. Escreva em terceira pessoa
2. Tom profissional e técnico
3. Destaque as qualificações mais relevantes
4. Mencione áreas de atuação
5. Inclua experiência quando disponível
6. Não invente informações - use apenas o que foi fornecido
7. Se houver pouca informação, seja conciso mas profissional
8. Objetivo: 2-4 parágrafos bem escritos

FORMATO ESPERADO:
Um texto corrido, profissional, que possa ser usado em apresentações, propostas comerciais ou currículos.

Exemplo de estrutura:
"[Nome] é um profissional especializado em [área], com formação em [qualificações]. Possui experiência em [experiências relevantes]. Sua atuação é focada em [áreas de foco], com ênfase em [especialidades]."

Gere APENAS o texto do perfil, sem títulos, sem formatação especial, apenas o conteúdo.`,
            add_context_from_internet: false
        });

        return Response.json({
            profile: profile.trim(),
            instructor_name: instructor.name,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao gerar perfil:', error);
        
        return Response.json({
            error: error.message || 'Erro ao gerar perfil profissional',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});