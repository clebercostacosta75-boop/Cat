import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { file_url } = await req.json();
        if (!file_url) {
            return Response.json({ error: 'file_url obrigatório' }, { status: 400 });
        }

        // EXTRAÇÃO SIMPLES
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                training: { type: "string" },
                                instructor: { type: "string" },
                                company: { type: "string" },
                                month: { type: "string" },
                                date: { type: "string" },
                                hours: { type: "number" },
                                cost: { type: "number" },
                                value: { type: "number" },
                                participants: { type: "number" },
                                status: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        if (extractResult.status !== "success") {
            return Response.json({ error: 'Erro ao ler arquivo' }, { status: 400 });
        }

        const dados = extractResult.output?.data || [];
        
        let instrutores = 0;
        let cursos = 0;
        let cronogramas = 0;

        for (const row of dados) {
            if (!row.training || !row.instructor || !row.company) continue;

            // Criar instrutor
            try {
                const inst = await base44.asServiceRole.entities.Instructor.filter({ name: row.instructor });
                if (inst.length === 0) {
                    await base44.asServiceRole.entities.Instructor.create({
                        name: row.instructor,
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
                const curso = await base44.asServiceRole.entities.Course.filter({ name: row.training });
                if (curso.length === 0) {
                    await base44.asServiceRole.entities.Course.create({
                        name: row.training,
                        standard_value: row.value || 0,
                        duration_hours: row.hours || 0,
                        description: '',
                        category: 'Outro'
                    });
                    cursos++;
                }
            } catch (e) {}

            // Criar cronograma
            try {
                const status = ['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(row.status) 
                    ? row.status : 'Planejado';

                await base44.asServiceRole.entities.TrainingSchedule.create({
                    training_name: row.training,
                    instructor_name: row.instructor,
                    company: row.company,
                    month: row.month || '',
                    date: row.date || '',
                    start_time: '',
                    end_time: '',
                    hours: row.hours || 0,
                    instructor_cost: row.cost || 0,
                    standard_value: row.value || 0,
                    cost_difference: (row.cost || 0) - (row.value || 0),
                    participants: row.participants || 0,
                    status: status,
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
            estatisticas: { total: dados.length, validos: cronogramas, invalidos: dados.length - cronogramas },
            etapas: [
                { nome: 'Extração', status: 'concluído' },
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