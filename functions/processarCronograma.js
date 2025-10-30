import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('🚀 === INÍCIO DO PROCESSAMENTO INTELIGENTE ===');
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { file_url } = await req.json();
        
        if (!file_url) {
            return Response.json({ error: 'file_url obrigatório' }, { status: 400 });
        }

        console.log('📂 Arquivo recebido:', file_url);

        const resultado = {
            timestamp: new Date().toISOString(),
            usuario: user.email,
            etapas: [],
            inseridos: { instrutores: 0, cursos: 0, cronogramas: 0 },
            estatisticas: { total: 0, sucesso: 0, erro: 0, correcoes: 0 },
            inconsistencias: [],
            propostas: [],
            logs: []
        };

        // ========================================
        // ETAPA 1: ANÁLISE INTELIGENTE DO ARQUIVO COM IA
        // ========================================
        resultado.etapas.push({ nome: '🧠 Análise Inteligente do Arquivo', status: 'processando' });
        resultado.logs.push('🤖 IA analisando estrutura da planilha...');

        const analiseIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Você é um assistente especializado em processar planilhas de treinamentos corporativos.

TAREFA: Analise este arquivo e extraia TODOS os dados de treinamentos, instrutores e cursos.

O arquivo pode ter QUALQUER formato. Identifique automaticamente:
- Nomes de treinamentos/cursos
- Nomes de instrutores
- Empresas clientes
- Datas e horários
- Custos e valores
- Participantes
- Status
- Qualquer outra informação relevante

REGRAS IMPORTANTES:
1. Se não encontrar uma informação, deixe vazio ou use valor padrão
2. Datas devem estar no formato YYYY-MM-DD
3. Status válidos: Planejado, Confirmado, Realizado, Cancelado
4. Se o status não for válido, use "Planejado"
5. Valores numéricos devem ser números, não strings
6. Se encontrar valor/hora do instrutor, calcule o custo total
7. Extraia TODAS as linhas da planilha

Retorne TODOS os dados no formato especificado.`,
            add_context_from_internet: false,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    analise: {
                        type: "object",
                        properties: {
                            formato_detectado: { type: "string" },
                            total_linhas: { type: "number" },
                            colunas_identificadas: { 
                                type: "array",
                                items: { type: "string" }
                            },
                            qualidade_dados: { type: "string" }
                        }
                    },
                    instrutores: {
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
                    },
                    cursos: {
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
                    },
                    cronogramas: {
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
                                company_contact_email: { type: "string" },
                                company_contact_phone: { type: "string" },
                                notes: { type: "string" }
                            }
                        }
                    },
                    inconsistencias: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                linha: { type: "number" },
                                tipo: { type: "string" },
                                descricao: { type: "string" },
                                severidade: { type: "string" },
                                corrigido: { type: "boolean" }
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ IA processou o arquivo:', analiseIA.analise);
        
        resultado.etapas[0].status = 'concluído';
        resultado.logs.push(`✅ Formato detectado: ${analiseIA.analise?.formato_detectado || 'Desconhecido'}`);
        resultado.logs.push(`📊 Total de linhas: ${analiseIA.analise?.total_linhas || 0}`);
        resultado.logs.push(`📋 Colunas: ${analiseIA.analise?.colunas_identificadas?.join(', ') || 'N/A'}`);

        const instrutores = analiseIA.instrutores || [];
        const cursos = analiseIA.cursos || [];
        const cronogramas = analiseIA.cronogramas || [];
        resultado.inconsistencias = analiseIA.inconsistencias || [];

        resultado.estatisticas.total = cronogramas.length;

        console.log(`📊 Dados extraídos: ${instrutores.length} instrutores, ${cursos.length} cursos, ${cronogramas.length} cronogramas`);

        // ========================================
        // ETAPA 2: VALIDAÇÃO E ENRIQUECIMENTO COM IA
        // ========================================
        resultado.etapas.push({ nome: '🔍 Validação e Enriquecimento', status: 'processando' });
        resultado.logs.push('🔍 IA validando e enriquecendo dados...');

        const validacaoIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Analise os dados extraídos e faça:

1. VALIDAÇÃO: Identifique problemas, duplicatas, inconsistências
2. ENRIQUECIMENTO: Complete informações que faltam com inferências inteligentes
3. CORREÇÃO: Corrija erros automaticamente quando possível
4. PROPOSTAS: Sugira melhorias de custo e otimização

DADOS EXTRAÍDOS:
Instrutores: ${JSON.stringify(instrutores, null, 2)}
Cursos: ${JSON.stringify(cursos, null, 2)}
Cronogramas: ${JSON.stringify(cronogramas, null, 2)}

Seja objetivo e prático.`,
            response_json_schema: {
                type: "object",
                properties: {
                    validacao: {
                        type: "object",
                        properties: {
                            status: { type: "string" },
                            problemas_encontrados: { type: "number" },
                            correcoes_aplicadas: { type: "number" }
                        }
                    },
                    propostas_melhoria: {
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
                    },
                    alertas: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                tipo: { type: "string" },
                                mensagem: { type: "string" },
                                severidade: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        resultado.etapas[1].status = 'concluído';
        resultado.propostas = validacaoIA.propostas_melhoria || [];
        resultado.estatisticas.correcoes = validacaoIA.validacao?.correcoes_aplicadas || 0;

        resultado.logs.push(`✅ Validação: ${validacaoIA.validacao?.status || 'OK'}`);
        resultado.logs.push(`🔧 Correções aplicadas: ${resultado.estatisticas.correcoes}`);
        resultado.logs.push(`💡 Propostas geradas: ${resultado.propostas.length}`);

        // ========================================
        // ETAPA 3: INSERÇÃO INTELIGENTE - INSTRUTORES
        // ========================================
        resultado.etapas.push({ nome: '👥 Inserindo Instrutores', status: 'processando' });
        resultado.logs.push('👥 Processando instrutores...');

        for (const instrutor of instrutores) {
            if (!instrutor.name) {
                continue;
            }

            try {
                const existe = await base44.asServiceRole.entities.Instructor.filter({ 
                    name: instrutor.name 
                });

                if (existe.length === 0) {
                    await base44.asServiceRole.entities.Instructor.create({
                        name: instrutor.name,
                        hourly_rate: instrutor.hourly_rate || 0,
                        specialty: instrutor.specialty || '',
                        email: instrutor.email || '',
                        phone: instrutor.phone || ''
                    });
                    resultado.inseridos.instrutores++;
                    console.log(`✅ Instrutor criado: ${instrutor.name}`);
                }
            } catch (e) {
                console.error(`❌ Erro ao inserir instrutor ${instrutor.name}:`, e.message);
            }
        }

        resultado.etapas[2].status = 'concluído';
        resultado.logs.push(`✅ ${resultado.inseridos.instrutores} instrutor(es) inserido(s)`);

        // ========================================
        // ETAPA 4: INSERÇÃO INTELIGENTE - CURSOS
        // ========================================
        resultado.etapas.push({ nome: '📚 Inserindo Cursos', status: 'processando' });
        resultado.logs.push('📚 Processando cursos...');

        for (const curso of cursos) {
            if (!curso.name) {
                continue;
            }

            try {
                const existe = await base44.asServiceRole.entities.Course.filter({ 
                    name: curso.name 
                });

                if (existe.length === 0) {
                    // Normalizar categoria
                    let category = curso.category || 'Outro';
                    const categorias_validas = ['Segurança', 'Operacional', 'Técnico', 'Gestão', 'Compliance', 'Outro'];
                    if (!categorias_validas.includes(category)) {
                        category = 'Outro';
                    }

                    await base44.asServiceRole.entities.Course.create({
                        name: curso.name,
                        standard_value: curso.standard_value || 0,
                        duration_hours: curso.duration_hours || 0,
                        description: curso.description || '',
                        category: category
                    });
                    resultado.inseridos.cursos++;
                    console.log(`✅ Curso criado: ${curso.name}`);
                }
            } catch (e) {
                console.error(`❌ Erro ao inserir curso ${curso.name}:`, e.message);
            }
        }

        resultado.etapas[3].status = 'concluído';
        resultado.logs.push(`✅ ${resultado.inseridos.cursos} curso(s) inserido(s)`);

        // ========================================
        // ETAPA 5: INSERÇÃO INTELIGENTE - CRONOGRAMAS
        // ========================================
        resultado.etapas.push({ nome: '📅 Inserindo Treinamentos', status: 'processando' });
        resultado.logs.push('📅 Processando cronogramas...');

        for (const cron of cronogramas) {
            if (!cron.training_name || !cron.instructor_name || !cron.company) {
                resultado.estatisticas.erro++;
                continue;
            }

            try {
                // Normalizar status
                let status = cron.status || 'Planejado';
                const status_validos = ['Planejado', 'Confirmado', 'Realizado', 'Cancelado'];
                if (!status_validos.includes(status)) {
                    status = 'Planejado';
                }

                // Normalizar payment_status
                let payment_status = cron.payment_status || 'Pendente';
                const payment_validos = ['Pendente', 'Agendado', 'Pago'];
                if (!payment_validos.includes(payment_status)) {
                    payment_status = 'Pendente';
                }

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
                    status: status,
                    location: cron.location || '',
                    room: cron.room || '',
                    logistics: cron.logistics || '',
                    pedagogical_content: cron.pedagogical_content || '',
                    payment_date: cron.payment_date || '',
                    payment_status: payment_status,
                    company_contact_email: cron.company_contact_email || '',
                    company_contact_phone: cron.company_contact_phone || '',
                    notifications_sent: false,
                    notes: cron.notes || ''
                });

                resultado.inseridos.cronogramas++;
                resultado.estatisticas.sucesso++;
                console.log(`✅ Cronograma criado: ${cron.training_name} - ${cron.company}`);

            } catch (e) {
                console.error(`❌ Erro ao inserir cronograma:`, e.message);
                resultado.estatisticas.erro++;
            }
        }

        resultado.etapas[4].status = 'concluído';
        resultado.logs.push(`✅ ${resultado.inseridos.cronogramas} treinamento(s) inserido(s)`);

        // ========================================
        // ETAPA 6: RELATÓRIO FINAL E NOTIFICAÇÃO
        // ========================================
        resultado.etapas.push({ nome: '📧 Enviando Relatório', status: 'processando' });

        const relatorioHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat-box { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #6366f1; }
        .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .section { background: #f9fafb; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6366f1; }
        .log { font-size: 12px; color: #6b7280; padding: 5px 0; }
        .proposta { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Importação Concluída</h1>
            <p>CAT Assistant - Processamento Inteligente</p>
        </div>

        <div class="stats">
            <div class="stat-box">
                <div class="stat-number">${resultado.inseridos.instrutores}</div>
                <div class="stat-label">Instrutores</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${resultado.inseridos.cursos}</div>
                <div class="stat-label">Cursos</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${resultado.inseridos.cronogramas}</div>
                <div class="stat-label">Treinamentos</div>
            </div>
        </div>

        <div class="section">
            <h3>📊 Estatísticas</h3>
            <p>✅ Sucesso: ${resultado.estatisticas.sucesso}</p>
            <p>❌ Erros: ${resultado.estatisticas.erro}</p>
            <p>🔧 Correções: ${resultado.estatisticas.correcoes}</p>
            <p>⚠️ Inconsistências: ${resultado.inconsistencias.length}</p>
        </div>

        ${resultado.propostas.length > 0 ? `
        <div class="section">
            <h3>💡 Propostas de Melhoria</h3>
            ${resultado.propostas.map(p => `
                <div class="proposta">
                    <strong>${p.titulo}</strong>
                    <p>${p.descricao}</p>
                    <small>Impacto: ${p.impacto} | Economia: R$ ${(p.economia_estimada || 0).toLocaleString('pt-BR')}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h3>📝 Log de Processamento</h3>
            ${resultado.logs.map(log => `<div class="log">${log}</div>`).join('')}
        </div>

        <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
            Processado em ${new Date().toLocaleString('pt-BR')}<br>
            Usuário: ${user.email}
        </p>
    </div>
</body>
</html>`;

        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `✅ [CAT Assistant] ${resultado.inseridos.cronogramas} treinamentos importados`,
                body: relatorioHTML
            });
            resultado.logs.push('✅ Relatório enviado por e-mail');
        } catch (e) {
            console.error('Erro ao enviar e-mail:', e);
        }

        resultado.etapas[5].status = 'concluído';

        console.log('🎉 === PROCESSAMENTO CONCLUÍDO COM SUCESSO ===');

        return Response.json({
            ...resultado,
            mensagem: `🎉 Importação concluída! ${resultado.inseridos.cronogramas} treinamentos inseridos.`
        });

    } catch (error) {
        console.error('❌ ERRO FATAL:', error);
        
        return Response.json({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});