import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * CAT ASSISTENTE MASTER v2.0
 * Função de IA para processamento automático e inteligente de cronogramas
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Autenticar usuário
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Receber payload
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
                correcoes_aplicadas: 0,
                duplicatas_detectadas: 0
            },
            inconsistencias: [],
            propostas: [],
            status: 'processando'
        };

        // ====================================================================
        // ETAPA 1: EXTRAÇÃO DE DADOS
        // ====================================================================
        resultado.etapas.push({ 
            nome: 'Extração de Dados', 
            status: 'iniciado', 
            timestamp: new Date().toISOString() 
        });

        try {
            // Extrair Instrutores
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

            if (instrutoresResult.status === "success" && instrutoresResult.output?.instructors) {
                resultado.dados.instrutores = instrutoresResult.output.instructors;
            }
        } catch (e) {
            console.error('Erro ao extrair instrutores:', e);
        }

        try {
            // Extrair Cursos
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

            if (cursosResult.status === "success" && cursosResult.output?.courses) {
                resultado.dados.cursos = cursosResult.output.courses;
            }
        } catch (e) {
            console.error('Erro ao extrair cursos:', e);
        }

        try {
            // Extrair Cronogramas
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
                                    hours: { type: "number" },
                                    instructor_cost: { type: "number" },
                                    standard_value: { type: "number" },
                                    participants: { type: "number" },
                                    status: { type: "string" },
                                    notes: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (cronogramasResult.status === "success" && cronogramasResult.output?.schedules) {
                resultado.dados.cronogramas = cronogramasResult.output.schedules;
            }
        } catch (e) {
            console.error('Erro ao extrair cronogramas:', e);
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';
        resultado.estatisticas.total_processados = 
            resultado.dados.instrutores.length + 
            resultado.dados.cursos.length + 
            resultado.dados.cronogramas.length;

        // ====================================================================
        // ETAPA 2: VALIDAÇÃO INTELIGENTE COM IA
        // ====================================================================
        resultado.etapas.push({ 
            nome: 'Validação Inteligente', 
            status: 'iniciado', 
            timestamp: new Date().toISOString() 
        });

        try {
            if (resultado.estatisticas.total_processados > 0) {
                const analiseIA = await base44.integrations.Core.InvokeLLM({
                    prompt: `Você é um sistema especialista em validação de dados de treinamento corporativo.

Analise os seguintes dados extraídos de uma planilha e identifique problemas:

DADOS:
Instrutores: ${JSON.stringify(resultado.dados.instrutores, null, 2)}
Cursos: ${JSON.stringify(resultado.dados.cursos, null, 2)}
Cronogramas: ${JSON.stringify(resultado.dados.cronogramas, null, 2)}

Identifique:
1. Inconsistências (datas inválidas, valores negativos, campos vazios)
2. Duplicatas
3. Conflitos de agenda
4. Anomalias de custo

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
                                        correcao_sugerida: { type: "string" },
                                        auto_corrigivel: { type: "boolean" }
                                    }
                                }
                            },
                            duplicatas: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        entidade: { type: "string" },
                                        registros: { type: "array", items: { type: "string" } }
                                    }
                                }
                            }
                        }
                    }
                });

                resultado.inconsistencias = analiseIA.inconsistencias || [];
                resultado.duplicatas = analiseIA.duplicatas || [];
            }
        } catch (e) {
            console.error('Erro na validação IA:', e);
            resultado.inconsistencias = [];
            resultado.duplicatas = [];
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // ETAPA 3: CORREÇÕES AUTOMÁTICAS
        // ====================================================================
        resultado.etapas.push({ 
            nome: 'Correções Automáticas', 
            status: 'iniciado', 
            timestamp: new Date().toISOString() 
        });

        let correcoes = 0;

        // Corrigir status inválidos
        for (const cronograma of resultado.dados.cronogramas) {
            if (!cronograma.status || !['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(cronograma.status)) {
                cronograma.status = 'Planejado';
                correcoes++;
            }

            // Corrigir datas
            if (cronograma.date && typeof cronograma.date === 'string') {
                try {
                    const data = new Date(cronograma.date);
                    if (!isNaN(data.getTime())) {
                        cronograma.date = data.toISOString().split('T')[0];
                    }
                } catch (e) {
                    // Ignorar
                }
            }
        }

        resultado.estatisticas.correcoes_aplicadas = correcoes;
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // ETAPA 4: PROPOSTAS DE MELHORIA
        // ====================================================================
        resultado.etapas.push({ 
            nome: 'Geração de Propostas', 
            status: 'iniciado', 
            timestamp: new Date().toISOString() 
        });

        try {
            if (resultado.estatisticas.total_processados > 0) {
                const propostasIA = await base44.integrations.Core.InvokeLLM({
                    prompt: `Com base nos dados de treinamento processados, gere 2-3 propostas de melhoria práticas.

ANÁLISE:
- Total de registros: ${resultado.estatisticas.total_processados}
- Inconsistências: ${resultado.inconsistencias.length}
- Correções aplicadas: ${resultado.estatisticas.correcoes_aplicadas}

Gere propostas para:
1. Otimização de custos
2. Padronização de processos
3. Prevenção de problemas futuros`,
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
            }
        } catch (e) {
            console.error('Erro ao gerar propostas:', e);
            resultado.propostas = [];
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // ETAPA 5: INSERÇÃO NO SISTEMA
        // ====================================================================
        resultado.etapas.push({ 
            nome: 'Inserção no Sistema', 
            status: 'iniciado', 
            timestamp: new Date().toISOString() 
        });

        const inseridos = {
            instrutores: 0,
            cursos: 0,
            cronogramas: 0
        };

        // Inserir Instrutores
        for (const instrutor of resultado.dados.instrutores) {
            if (!instrutor.name) continue;
            
            try {
                const existentes = await base44.asServiceRole.entities.Instructor.filter({ 
                    name: instrutor.name 
                });
                
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

        // Inserir Cursos
        for (const curso of resultado.dados.cursos) {
            if (!curso.name) continue;
            
            try {
                const existentes = await base44.asServiceRole.entities.Course.filter({ 
                    name: curso.name 
                });
                
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

        // Inserir Cronogramas
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
                    hours: cronograma.hours || 0,
                    instructor_cost: cronograma.instructor_cost || 0,
                    standard_value: cronograma.standard_value || 0,
                    cost_difference: (cronograma.instructor_cost || 0) - (cronograma.standard_value || 0),
                    participants: cronograma.participants || 0,
                    status: cronograma.status || 'Planejado',
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

        // ====================================================================
        // ETAPA 6: NOTIFICAÇÃO
        // ====================================================================
        resultado.etapas.push({ 
            nome: 'Notificação ao Gestor', 
            status: 'iniciado', 
            timestamp: new Date().toISOString() 
        });

        try {
            const relatorioGestor = `
📊 PROCESSAMENTO CONCLUÍDO

Resumo da Importação:
✅ ${inseridos.instrutores} instrutor(es)
✅ ${inseridos.cursos} curso(s)
✅ ${inseridos.cronogramas} treinamento(s)

⚠️ ${resultado.inconsistencias.length} inconsistência(s)
🔧 ${resultado.estatisticas.correcoes_aplicadas} correção(ões)
💡 ${resultado.propostas.length} proposta(s)

Processado por: ${user.email}
Data: ${new Date().toLocaleString('pt-BR')}
`;

            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `[CAT Assistant] Importação Concluída - ${inseridos.cronogramas} treinamentos`,
                body: relatorioGestor
            });
        } catch (e) {
            console.error('Erro ao enviar email:', e);
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // FINALIZAÇÃO
        // ====================================================================
        resultado.status = 'concluído';
        resultado.mensagem = `Processamento concluído. ${inseridos.cronogramas} treinamentos importados.`;

        return Response.json(resultado);

    } catch (error) {
        console.error('Erro no processamento:', error);
        return Response.json({
            status: 'erro',
            mensagem: error.message || 'Erro ao processar arquivo',
            detalhes: error.toString(),
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});