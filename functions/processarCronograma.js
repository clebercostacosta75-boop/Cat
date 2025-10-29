import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { file_url } = await req.json();
        
        if (!file_url) {
            return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
        }

        const resultado = {
            timestamp: new Date().toISOString(),
            usuario: user.email,
            etapas: [],
            dados: {
                instrutores: [],
                cursos: [],
                cronogramas: []
            },
            estatisticas: {
                total_processados: 0,
                validos: 0,
                invalidos: 0,
                correcoes_aplicadas: 0
            },
            inconsistencias: [],
            propostas: [],
            status: 'processando'
        };

        // ETAPA 1: EXTRAÇÃO DE DADOS
        resultado.etapas.push({ nome: 'Extração de Dados', status: 'iniciado', timestamp: new Date().toISOString() });

        const instrutoresResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: "object",
                properties: {
                    instructors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                hourly_rate: { type: "number" },
                                specialty: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        if (instrutoresResult.status === "success" && instrutoresResult.output?.instructors?.length > 0) {
            resultado.dados.instrutores = instrutoresResult.output.instructors;
        }

        const cursosResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: "object",
                properties: {
                    courses: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                standard_value: { type: "number" },
                                duration_hours: { type: "number" },
                                description: { type: "string" },
                                category: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        if (cursosResult.status === "success" && cursosResult.output?.courses?.length > 0) {
            resultado.dados.cursos = cursosResult.output.courses;
        }

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

        if (cronogramasResult.status === "success" && cronogramasResult.output?.schedules?.length > 0) {
            resultado.dados.cronogramas = cronogramasResult.output.schedules;
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';
        resultado.estatisticas.total_processados = 
            resultado.dados.instrutores.length + 
            resultado.dados.cursos.length + 
            resultado.dados.cronogramas.length;

        // ETAPA 2: VALIDAÇÃO COM IA
        resultado.etapas.push({ nome: 'Validação Inteligente', status: 'iniciado', timestamp: new Date().toISOString() });

        const analiseIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Analise os dados extraídos e identifique inconsistências, duplicatas e problemas.

DADOS:
Instrutores: ${JSON.stringify(resultado.dados.instrutores, null, 2)}
Cursos: ${JSON.stringify(resultado.dados.cursos, null, 2)}
Cronogramas: ${JSON.stringify(resultado.dados.cronogramas, null, 2)}

Retorne um relatório estruturado.`,
            response_json_schema: {
                type: "object",
                properties: {
                    inconsistencias: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                tipo: { type: "string" },
                                severidade: { type: "string" },
                                entidade: { type: "string" },
                                descricao: { type: "string" },
                                auto_corrigivel: { type: "boolean" }
                            }
                        }
                    }
                }
            }
        });

        resultado.inconsistencias = analiseIA.inconsistencias || [];
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ETAPA 3: CORREÇÕES AUTOMÁTICAS
        resultado.etapas.push({ nome: 'Correções Automáticas', status: 'iniciado', timestamp: new Date().toISOString() });

        let correcoes = 0;
        for (const cronograma of resultado.dados.cronogramas) {
            if (!['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(cronograma.status)) {
                cronograma.status = 'Planejado';
                correcoes++;
            }
            if (cronograma.date && typeof cronograma.date === 'string') {
                try {
                    const data = new Date(cronograma.date);
                    if (!isNaN(data.getTime())) {
                        cronograma.date = data.toISOString().split('T')[0];
                        correcoes++;
                    }
                } catch (e) {
                    // Ignorar
                }
            }
        }

        resultado.estatisticas.correcoes_aplicadas = correcoes;
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ETAPA 4: PROPOSTAS DE MELHORIA
        resultado.etapas.push({ nome: 'Geração de Propostas', status: 'iniciado', timestamp: new Date().toISOString() });

        const propostasIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Com base nos dados de treinamento, gere 3 propostas práticas de otimização de custos e distribuição de carga.

ANÁLISE: ${JSON.stringify(resultado.inconsistencias, null, 2)}`,
            response_json_schema: {
                type: "object",
                properties: {
                    propostas: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                titulo: { type: "string" },
                                descricao: { type: "string" },
                                impacto: { type: "string" },
                                economia_estimada: { type: "number" }
                            }
                        }
                    }
                }
            }
        });

        resultado.propostas = propostasIA.propostas || [];
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ETAPA 5: INSERÇÃO NO SISTEMA
        resultado.etapas.push({ nome: 'Inserção no Sistema', status: 'iniciado', timestamp: new Date().toISOString() });

        const inseridos = {
            instrutores: 0,
            cursos: 0,
            cronogramas: 0
        };

        for (const instrutor of resultado.dados.instrutores) {
            try {
                const existentes = await base44.asServiceRole.entities.Instructor.filter({ name: instrutor.name });
                
                if (existentes.length === 0) {
                    await base44.asServiceRole.entities.Instructor.create({
                        name: instrutor.name,
                        hourly_rate: instrutor.hourly_rate || 0,
                        specialty: instrutor.specialty || '',
                        email: instrutor.email || '',
                        phone: instrutor.phone || ''
                    });
                    inseridos.instrutores++;
                }
            } catch (e) {
                console.error('Erro ao inserir instrutor:', e);
            }
        }

        for (const curso of resultado.dados.cursos) {
            try {
                const existentes = await base44.asServiceRole.entities.Course.filter({ name: curso.name });
                
                if (existentes.length === 0) {
                    await base44.asServiceRole.entities.Course.create({
                        name: curso.name,
                        standard_value: curso.standard_value || 0,
                        duration_hours: curso.duration_hours || 0,
                        description: curso.description || '',
                        category: curso.category || 'Outro'
                    });
                    inseridos.cursos++;
                }
            } catch (e) {
                console.error('Erro ao inserir curso:', e);
            }
        }

        for (const cronograma of resultado.dados.cronogramas) {
            if (!cronograma.training_name || !cronograma.instructor_name || !cronograma.company) {
                resultado.estatisticas.invalidos++;
                continue;
            }

            try {
                await base44.asServiceRole.entities.TrainingSchedule.create({
                    training_name: cronograma.training_name,
                    instructor_name: cronograma.instructor_name,
                    company: cronograma.company,
                    month: cronograma.month || '',
                    date: cronograma.date || '',
                    start_time: cronograma.start_time || '',
                    end_time: cronograma.end_time || '',
                    hours: cronograma.hours || 0,
                    instructor_cost: cronograma.instructor_cost || 0,
                    standard_value: cronograma.standard_value || 0,
                    cost_difference: (cronograma.instructor_cost || 0) - (cronograma.standard_value || 0),
                    participants: cronograma.participants || 0,
                    status: cronograma.status || 'Planejado',
                    location: cronograma.location || '',
                    room: cronograma.room || '',
                    notes: cronograma.notes || ''
                });
                inseridos.cronogramas++;
                resultado.estatisticas.validos++;
            } catch (e) {
                console.error('Erro ao inserir cronograma:', e);
                resultado.estatisticas.invalidos++;
            }
        }

        resultado.inseridos = inseridos;
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ETAPA 6: NOTIFICAÇÃO
        resultado.etapas.push({ nome: 'Notificação ao Gestor', status: 'iniciado', timestamp: new Date().toISOString() });

        const relatorioGestor = `📊 PROCESSAMENTO CONCLUÍDO

Resumo da Importação:
✅ ${inseridos.instrutores} instrutor(es) cadastrado(s)
✅ ${inseridos.cursos} curso(s) cadastrado(s)
✅ ${inseridos.cronogramas} treinamento(s) agendado(s)

⚠️ ${resultado.inconsistencias.length} inconsistência(s) detectada(s)
🔧 ${resultado.estatisticas.correcoes_aplicadas} correção(ões) automática(s)
💡 ${resultado.propostas.length} proposta(s) de melhoria

Processado por: ${user.email}
Data: ${new Date().toLocaleString('pt-BR')}`;

        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `[CAT Assistant] Importação Concluída - ${inseridos.cronogramas} treinamentos`,
                body: relatorioGestor
            });
        } catch (e) {
            console.error('Erro ao enviar email:', e);
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';
        resultado.status = 'concluído';
        resultado.mensagem = `Processamento concluído com sucesso. ${inseridos.cronogramas} treinamentos importados.`;

        return Response.json(resultado);

    } catch (error) {
        console.error('Erro no processamento:', error);
        return Response.json({
            status: 'erro',
            mensagem: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});