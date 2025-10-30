import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { texto } = await req.json();
        if (!texto) {
            return Response.json({ error: 'Texto obrigatório' }, { status: 400 });
        }

        // IA SIMPLES
        const resultado = await base44.integrations.Core.InvokeLLM({
            prompt: `Extraia dados de treinamentos do texto:

${texto}

Retorne no formato:
- nome do treinamento
- instrutor
- empresa
- data (YYYY-MM-DD se tiver)
- horas (número)
- custo (número)
- participantes (número)`,
            response_json_schema: {
                type: "object",
                properties: {
                    treinamentos: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                nome: { type: "string" },
                                instrutor: { type: "string" },
                                empresa: { type: "string" },
                                data: { type: "string" },
                                horas: { type: "number" },
                                custo: { type: "number" },
                                participantes: { type: "number" }
                            }
                        }
                    }
                }
            }
        });

        const treinamentos = resultado.treinamentos || [];
        
        if (treinamentos.length === 0) {
            return Response.json({
                error: 'Nenhum treinamento encontrado',
                inseridos: { instrutores: 0, cursos: 0, cronogramas: 0 }
            });
        }

        let instrutores = 0;
        let cursos = 0;
        let cronogramas = 0;

        for (const t of treinamentos) {
            if (!t.nome || !t.instrutor || !t.empresa) continue;

            // Criar instrutor
            try {
                const inst = await base44.asServiceRole.entities.Instructor.filter({ name: t.instrutor });
                if (inst.length === 0) {
                    await base44.asServiceRole.entities.Instructor.create({
                        name: t.instrutor,
                        hourly_rate: 0,
                        specialty: '',
                        email: '',
                        phone: ''
                    });
                    instrutores++;
                }
            } catch (e) {}

            // Criar curso
            try {
                const curso = await base44.asServiceRole.entities.Course.filter({ name: t.nome });
                if (curso.length === 0) {
                    await base44.asServiceRole.entities.Course.create({
                        name: t.nome,
                        standard_value: 0,
                        duration_hours: t.horas || 0,
                        description: '',
                        category: 'Outro'
                    });
                    cursos++;
                }
            } catch (e) {}

            // Criar cronograma
            try {
                await base44.asServiceRole.entities.TrainingSchedule.create({
                    training_name: t.nome,
                    instructor_name: t.instrutor,
                    company: t.empresa,
                    month: '',
                    date: t.data || '',
                    start_time: '',
                    end_time: '',
                    hours: t.horas || 0,
                    instructor_cost: t.custo || 0,
                    standard_value: 0,
                    cost_difference: t.custo || 0,
                    participants: t.participantes || 0,
                    status: 'Planejado',
                    location: '',
                    room: '',
                    logistics: '',
                    pedagogical_content: '',
                    payment_date: '',
                    payment_status: 'Pendente',
                    company_contact_email: '',
                    company_contact_phone: '',
                    notifications_sent: false,
                    notes: ''
                });
                cronogramas++;
            } catch (e) {}
        }

        return Response.json({
            inseridos: { instrutores, cursos, cronogramas },
            estatisticas: { total: treinamentos.length, validos: cronogramas, invalidos: treinamentos.length - cronogramas },
            etapas: [
                { nome: 'Análise', status: 'concluído' },
                { nome: 'Inserção', status: 'concluído' }
            ],
            inconsistencias: [],
            propostas: [],
            logs: [
                `${instrutores} instrutor(es)`,
                `${cursos} curso(s)`,
                `${cronogramas} treinamento(s)`
            ]
        });

    } catch (error) {
        return Response.json({
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});