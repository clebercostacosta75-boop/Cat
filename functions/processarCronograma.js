import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Receber dados
        const body = await req.json();
        const { file_url } = body;
        
        if (!file_url) {
            return Response.json({ error: 'file_url obrigatório' }, { status: 400 });
        }

        const resultado = {
            etapas: [],
            inseridos: { instrutores: 0, cursos: 0, cronogramas: 0 },
            estatisticas: { total_processados: 0, validos: 0, invalidos: 0, correcoes_aplicadas: 0 },
            inconsistencias: [],
            propostas: []
        };

        // ===== ETAPA 1: EXTRAIR CRONOGRAMAS =====
        resultado.etapas.push({ nome: 'Extraindo dados da planilha', status: 'iniciado' });
        
        const cronogramasResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: "object",
                properties: {
                    schedules: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                training_name: { type: "string" },
                                instructor_name: { type: "string" },
                                company: { type: "string" },
                                month: { type: "string" },
                                date: { type: "string" },
                                start_time: { type: "string" },
                                end_time: { type: "string" },
                                hours: { type: "number" },
                                instructor_cost: { type: "number" },
                                standard_value: { type: "number" },
                                participants: { type: "number" },
                                status: { type: "string" },
                                location: { type: "string" },
                                room: { type: "string" },
                                notes: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        let cronogramas = [];
        if (cronogramasResult.status === "success" && cronogramasResult.output?.schedules) {
            cronogramas = cronogramasResult.output.schedules;
        }

        resultado.etapas[0].status = 'concluído';
        resultado.estatisticas.total_processados = cronogramas.length;

        // ===== ETAPA 2: VALIDAR E CORRIGIR =====
        resultado.etapas.push({ nome: 'Validando e corrigindo dados', status: 'iniciado' });
        
        const instrutoresUnicos = new Set();
        const cursosUnicos = new Set();
        
        for (const cron of cronogramas) {
            // Corrigir status
            if (!['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(cron.status)) {
                cron.status = 'Planejado';
                resultado.estatisticas.correcoes_aplicadas++;
            }
            
            // Corrigir data
            if (cron.date) {
                try {
                    const d = new Date(cron.date);
                    if (!isNaN(d.getTime())) {
                        cron.date = d.toISOString().split('T')[0];
                    }
                } catch (e) {
                    cron.date = '';
                }
            }
            
            // Coletar instrutores únicos
            if (cron.instructor_name) {
                instrutoresUnicos.add(cron.instructor_name);
            }
            
            // Coletar cursos únicos
            if (cron.training_name) {
                cursosUnicos.add(cron.training_name);
            }
        }

        resultado.etapas[1].status = 'concluído';

        // ===== ETAPA 3: INSERIR INSTRUTORES =====
        resultado.etapas.push({ nome: 'Cadastrando instrutores', status: 'iniciado' });
        
        for (const nome of instrutoresUnicos) {
            try {
                const existe = await base44.asServiceRole.entities.Instructor.filter({ name: nome });
                if (existe.length === 0) {
                    await base44.asServiceRole.entities.Instructor.create({
                        name: nome,
                        hourly_rate: 0,
                        specialty: '',
                        email: '',
                        phone: ''
                    });
                    resultado.inseridos.instrutores++;
                }
            } catch (e) {
                console.error('Erro ao inserir instrutor:', nome, e);
            }
        }

        resultado.etapas[2].status = 'concluído';

        // ===== ETAPA 4: INSERIR CURSOS =====
        resultado.etapas.push({ nome: 'Cadastrando cursos', status: 'iniciado' });
        
        for (const nome of cursosUnicos) {
            try {
                const existe = await base44.asServiceRole.entities.Course.filter({ name: nome });
                if (existe.length === 0) {
                    await base44.asServiceRole.entities.Course.create({
                        name: nome,
                        standard_value: 0,
                        duration_hours: 0,
                        description: '',
                        category: 'Outro'
                    });
                    resultado.inseridos.cursos++;
                }
            } catch (e) {
                console.error('Erro ao inserir curso:', nome, e);
            }
        }

        resultado.etapas[3].status = 'concluído';

        // ===== ETAPA 5: INSERIR CRONOGRAMAS =====
        resultado.etapas.push({ nome: 'Inserindo treinamentos', status: 'iniciado' });
        
        for (const cron of cronogramas) {
            if (!cron.training_name || !cron.instructor_name || !cron.company) {
                resultado.estatisticas.invalidos++;
                continue;
            }

            try {
                await base44.asServiceRole.entities.TrainingSchedule.create({
                    training_name: cron.training_name,
                    instructor_name: cron.instructor_name,
                    company: cron.company,
                    month: cron.month || '',
                    date: cron.date || '',
                    start_time: cron.start_time || '',
                    end_time: cron.end_time || '',
                    hours: cron.hours || 0,
                    instructor_cost: cron.instructor_cost || 0,
                    standard_value: cron.standard_value || 0,
                    cost_difference: (cron.instructor_cost || 0) - (cron.standard_value || 0),
                    participants: cron.participants || 0,
                    status: cron.status || 'Planejado',
                    location: cron.location || '',
                    room: cron.room || '',
                    logistics: '',
                    pedagogical_content: '',
                    payment_date: '',
                    payment_status: 'Pendente',
                    company_contact_email: '',
                    company_contact_phone: '',
                    notifications_sent: false,
                    notes: cron.notes || ''
                });
                resultado.inseridos.cronogramas++;
                resultado.estatisticas.validos++;
            } catch (e) {
                console.error('Erro ao inserir cronograma:', e);
                resultado.estatisticas.invalidos++;
            }
        }

        resultado.etapas[4].status = 'concluído';

        // ===== ANÁLISE IA (simplificada) =====
        resultado.etapas.push({ nome: 'Análise final', status: 'concluído' });
        
        resultado.inconsistencias = [
            {
                severidade: 'INFO',
                descricao: `${resultado.inseridos.cronogramas} treinamentos importados com sucesso`,
                auto_corrigivel: true
            }
        ];

        resultado.propostas = [
            {
                titulo: 'Revisão de Custos',
                descricao: 'Revisar custos dos instrutores e valores padrão dos cursos',
                impacto: 'medium',
                economia_estimada: 0
            }
        ];

        return Response.json(resultado);

    } catch (error) {
        console.error('ERRO GERAL:', error);
        return Response.json({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});