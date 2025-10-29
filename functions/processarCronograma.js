import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * CAT ASSISTENTE MASTER v2.0
 * Função de IA para processamento automático e inteligente de cronogramas
 * 
 * Capacidades:
 * - Leitura automática de Excel/CSV
 * - OCR de imagens (delegado ao ExtractDataFromUploadedFile)
 * - Validação inteligente de dados
 * - Correção automática de inconsistências
 * - Detecção de duplicatas e conflitos
 * - Geração de propostas de melhoria
 * - Inserção automática no sistema
 * - Notificações ao gestor
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
        // ETAPA 1: EXTRAÇÃO INTELIGENTE DE DADOS
        // ====================================================================
        resultado.etapas.push({ nome: 'Extração de Dados', status: 'iniciado', timestamp: new Date().toISOString() });

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

        if (instrutoresResult.status === "success" && instrutoresResult.output?.instructors?.length > 0) {
            resultado.dados.instrutores = instrutoresResult.output.instructors;
        }

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

        if (cursosResult.status === "success" && cursosResult.output?.courses?.length > 0) {
            resultado.dados.cursos = cursosResult.output.courses;
        }

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

        if (cronogramasResult.status === "success" && cronogramasResult.output?.schedules?.length > 0) {
            resultado.dados.cronogramas = cronogramasResult.output.schedules;
        }

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';
        resultado.estatisticas.total_processados = 
            resultado.dados.instrutores.length + 
            resultado.dados.cursos.length + 
            resultado.dados.cronogramas.length;

        // ====================================================================
        // ETAPA 2: VALIDAÇÃO INTELIGENTE COM IA
        // ====================================================================
        resultado.etapas.push({ nome: 'Validação Inteligente', status: 'iniciado', timestamp: new Date().toISOString() });

        // Usar LLM para análise profunda dos dados
        const analiseIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Você é um sistema especialista em validação de dados de treinamento corporativo.

Analise os seguintes dados extraídos de uma planilha e identifique:
1. Inconsistências (datas inválidas, valores negativos, campos obrigatórios vazios)
2. Duplicatas ou registros muito similares
3. Conflitos de agenda (mesmo instrutor em datas próximas)
4. Anomalias de custo (valores muito discrepantes)
5. Problemas de padronização

DADOS:
Instrutores: ${JSON.stringify(resultado.dados.instrutores, null, 2)}
Cursos: ${JSON.stringify(resultado.dados.cursos, null, 2)}
Cronogramas: ${JSON.stringify(resultado.dados.cronogramas, null, 2)}

Retorne um relatório estruturado com as validações.`,
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
                                registros: { type: "array", items: { type: "string" } },
                                similaridade: { type: "number" }
                            }
                        }
                    },
                    conflitos_agenda: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                instrutor: { type: "string" },
                                data1: { type: "string" },
                                data2: { type: "string" },
                                descricao: { type: "string" }
                            }
                        }
                    },
                    analise_custos: {
                        type: "object",
                        properties: {
                            media_custo_instrutor: { type: "number" },
                            valores_discrepantes: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        instrutor: { type: "string" },
                                        valor: { type: "number" },
                                        desvio_percentual: { type: "number" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        resultado.inconsistencias = analiseIA.inconsistencias || [];
        resultado.duplicatas = analiseIA.duplicatas || [];
        resultado.conflitos_agenda = analiseIA.conflitos_agenda || [];
        resultado.analise_custos = analiseIA.analise_custos || {};

        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // ETAPA 3: CORREÇÕES AUTOMÁTICAS
        // ====================================================================
        resultado.etapas.push({ nome: 'Correções Automáticas', status: 'iniciado', timestamp: new Date().toISOString() });

        let correcoes = 0;

        // Aplicar correções auto-corrigíveis
        for (const inconsistencia of resultado.inconsistencias) {
            if (inconsistencia.auto_corrigivel) {
                // Lógica de correção baseada no tipo
                if (inconsistencia.tipo === 'status_invalido') {
                    // Encontrar e corrigir o registro
                    for (const cronograma of resultado.dados.cronogramas) {
                        if (!['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(cronograma.status)) {
                            cronograma.status = 'Planejado';
                            cronograma._corrigido = true;
                            correcoes++;
                        }
                    }
                }
                
                if (inconsistencia.tipo === 'data_invalida') {
                    // Tentar parsear e corrigir datas
                    for (const cronograma of resultado.dados.cronogramas) {
                        if (cronograma.date && typeof cronograma.date === 'string') {
                            try {
                                const data = new Date(cronograma.date);
                                if (!isNaN(data.getTime())) {
                                    cronograma.date = data.toISOString().split('T')[0];
                                    correcoes++;
                                }
                            } catch (e) {
                                // Ignorar erros de parse
                            }
                        }
                    }
                }
            }
        }

        resultado.estatisticas.correcoes_aplicadas = correcoes;
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // ETAPA 4: GERAÇÃO DE PROPOSTAS DE MELHORIA
        // ====================================================================
        resultado.etapas.push({ nome: 'Geração de Propostas', status: 'iniciado', timestamp: new Date().toISOString() });

        const propostasIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Com base na análise dos dados de treinamento, gere propostas práticas de melhoria.

ANÁLISE REALIZADA:
${JSON.stringify({
    inconsistencias: resultado.inconsistencias,
    duplicatas: resultado.duplicatas,
    conflitos_agenda: resultado.conflitos_agenda,
    analise_custos: resultado.analise_custos
}, null, 2)}

Gere propostas acionáveis para:
1. Otimização de custos
2. Melhor distribuição de carga dos instrutores
3. Padronização de processos
4. Prevenção de conflitos
5. Aproveitamento de recursos`,
            response_json_schema: {
                type: "object",
                properties: {
                    propostas: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                titulo: { type: "string" },
                                descricao: { type: "string" },
                                categoria: { type: "string" },
                                impacto: { type: "string" },
                                economia_estimada: { type: "number" },
                                requer_aprovacao: { type: "boolean" },
                                acoes: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        });

        resultado.propostas = propostasIA.propostas || [];
        resultado.etapas[resultado.etapas.length - 1].status = 'concluído';

        // ====================================================================
        // ETAPA 5: INSERÇÃO AUTOMÁTICA NO SISTEMA
        // ====================================================================
        resultado.etapas.push({ nome: 'Inserção no Sistema', status: 'iniciado', timestamp: new Date().toISOString() });

        const inseridos = {
            instrutores: 0,
            cursos: 0,
            cronogramas: 0
        };

        // Inserir Instrutores (apenas se não existirem)
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

        // Inserir Cursos
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

        // Inserir Cronogramas (apenas os válidos)
        for (const cronograma of resultado.dados.cronogramas) {
            // Verificar se tem dados mínimos obrigatórios
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
        // ETAPA 6: NOTIFICAÇÃO AO GESTOR
        // ====================================================================
        resultado.etapas.push({ nome: 'Notificação ao Gestor', status: 'iniciado', timestamp: new Date().toISOString() });

        // Gerar relatório para o gestor
        const relatorioGestor = `
📊 **PROCESSAMENTO CONCLUÍDO**

**Resumo da Importação:**
✅ ${inseridos.instrutores} instrutor(es) cadastrado(s)
✅ ${inseridos.cursos} curso(s) cadastrado(s)
✅ ${inseridos.cronogramas} treinamento(s) agendado(s)

⚠️ ${resultado.inconsistencias.length} inconsistência(s) detectada(s)
🔧 ${resultado.estatisticas.correcoes_aplicadas} correção(ões) automática(s)
💡 ${resultado.propostas.length} proposta(s) de melhoria

**Status:** ${resultado.estatisticas.invalidos === 0 ? '✅ Todos os registros válidos' : `⚠️ ${resultado.estatisticas.invalidos} registro(s) inválido(s) não importado(s)`}

Processado por: ${user.email}
Data: ${new Date().toLocaleString('pt-BR')}
`;

        // Enviar email ao gestor (usando integração Core.SendEmail)
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

        // ====================================================================
        // FINALIZAÇÃO
        // ====================================================================
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