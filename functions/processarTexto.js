import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('🚀 === PROCESSAMENTO DE TEXTO COM IA ===');
    
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { texto } = await req.json();
        
        if (!texto) {
            return Response.json({ error: 'Texto obrigatório' }, { status: 400 });
        }

        console.log('📝 Texto recebido (primeiros 200 chars):', texto.substring(0, 200));

        const resultado = {
            timestamp: new Date().toISOString(),
            usuario: user.email,
            etapas: [],
            inseridos: { instrutores: 0, cursos: 0, cronogramas: 0 },
            estatisticas: { total: 0, sucesso: 0, erro: 0 },
            inconsistencias: [],
            propostas: [],
            logs: []
        };

        // ========================================
        // ETAPA 1: ANÁLISE E EXTRAÇÃO COM IA
        // ========================================
        resultado.etapas.push({ nome: '🧠 Analisando Texto com IA', status: 'processando' });
        resultado.logs.push('🤖 IA processando texto livre...');

        const analiseIA = await base44.integrations.Core.InvokeLLM({
            prompt: `Você é um assistente especializado em extrair informações de treinamentos corporativos.

TAREFA: Analise o texto abaixo e extraia TODOS os dados de treinamentos, instrutores e empresas mencionados.

O texto pode estar em QUALQUER formato:
- E-mails
- Mensagens de WhatsApp
- Listas simples
- Anotações informais
- Tabelas
- Frases soltas

EXTRAIA:
- Nomes de treinamentos/cursos (NR-35, Excel, Segurança, etc)
- Nomes de instrutores (quem ministra)
- Empresas/clientes (para quem é o treinamento)
- Datas (15/01/2025, janeiro, próximo mês, etc)
- Horários (8h às 17h, manhã, tarde, etc)
- Duração em horas
- Valores/custos (R$ 800, 800 reais, etc)
- Número de participantes
- Status (confirmado, planejado, pendente, etc)
- Qualquer outra informação relevante

REGRAS:
1. Se não encontrar uma informação, deixe vazio
2. Datas devem estar no formato YYYY-MM-DD
3. Status: Planejado, Confirmado, Realizado ou Cancelado
4. Valores devem ser números (sem R$, vírgulas, etc)
5. Horas devem ser números
6. Seja generoso na interpretação - se parecer um treinamento, extraia

TEXTO A ANALISAR:
---
${texto}
---

Extraia TODOS os treinamentos mencionados no formato JSON especificado.`,
            add_context_from_internet: false,
            response_json_schema: {
                type: "object",
                properties: {
                    analise: {
                        type: "object",
                        properties: {
                            tipo_conteudo: { type: "string" },
                            total_treinamentos: { type: "number" },
                            qualidade: { type: "string" },
                            observacoes: { type: "string" }
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
                                notes: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ IA processou:', analiseIA.analise);
        
        resultado.etapas[0].status = 'concluído';
        resultado.logs.push(`✅ Tipo: ${analiseIA.analise?.tipo_conteudo || 'Texto livre'}`);
        resultado.logs.push(`📊 Treinamentos encontrados: ${analiseIA.analise?.total_treinamentos || 0}`);

        const instrutores = analiseIA.instrutores || [];
        const cursos = analiseIA.cursos || [];
        const cronogramas = analiseIA.cronogramas || [];

        resultado.estatisticas.total = cronogramas.length;

        console.log(`📊 Dados extraídos: ${instrutores.length} instrutores, ${cursos.length} cursos, ${cronogramas.length} cronogramas`);

        if (cronogramas.length === 0) {
            resultado.logs.push('⚠️ Nenhum treinamento identificado no texto');
            return Response.json({
                ...resultado,
                mensagem: 'Nenhum treinamento foi identificado. Tente fornecer mais detalhes como: nome do curso, instrutor, empresa e data.'
            });
        }

        // ========================================
        // ETAPA 2: INSERIR INSTRUTORES
        // ========================================
        resultado.etapas.push({ nome: '👥 Cadastrando Instrutores', status: 'processando' });
        resultado.logs.push('👥 Processando instrutores...');

        for (const instrutor of instrutores) {
            if (!instrutor.name) continue;

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
                console.error(`❌ Erro ao inserir instrutor:`, e.message);
            }
        }

        resultado.etapas[1].status = 'concluído';
        resultado.logs.push(`✅ ${resultado.inseridos.instrutores} instrutor(es) cadastrado(s)`);

        // ========================================
        // ETAPA 3: INSERIR CURSOS
        // ========================================
        resultado.etapas.push({ nome: '📚 Cadastrando Cursos', status: 'processando' });
        resultado.logs.push('📚 Processando cursos...');

        for (const curso of cursos) {
            if (!curso.name) continue;

            try {
                const existe = await base44.asServiceRole.entities.Course.filter({ 
                    name: curso.name 
                });

                if (existe.length === 0) {
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
                console.error(`❌ Erro ao inserir curso:`, e.message);
            }
        }

        resultado.etapas[2].status = 'concluído';
        resultado.logs.push(`✅ ${resultado.inseridos.cursos} curso(s) cadastrado(s)`);

        // ========================================
        // ETAPA 4: INSERIR CRONOGRAMAS
        // ========================================
        resultado.etapas.push({ nome: '📅 Agendando Treinamentos', status: 'processando' });
        resultado.logs.push('📅 Processando cronogramas...');

        for (const cron of cronogramas) {
            if (!cron.training_name || !cron.instructor_name || !cron.company) {
                resultado.estatisticas.erro++;
                continue;
            }

            try {
                let status = cron.status || 'Planejado';
                const status_validos = ['Planejado', 'Confirmado', 'Realizado', 'Cancelado'];
                if (!status_validos.includes(status)) {
                    status = 'Planejado';
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
                resultado.estatisticas.sucesso++;
                console.log(`✅ Treinamento agendado: ${cron.training_name} - ${cron.company}`);

            } catch (e) {
                console.error(`❌ Erro ao inserir cronograma:`, e.message);
                resultado.estatisticas.erro++;
            }
        }

        resultado.etapas[3].status = 'concluído';
        resultado.logs.push(`✅ ${resultado.inseridos.cronogramas} treinamento(s) agendado(s)`);

        // ========================================
        // ETAPA 5: ANÁLISE FINAL
        // ========================================
        resultado.etapas.push({ nome: '📊 Análise Final', status: 'concluído' });

        resultado.inconsistencias = [
            {
                severidade: 'INFO',
                descricao: `${resultado.inseridos.cronogramas} treinamentos processados com sucesso`,
                auto_corrigivel: true
            }
        ];

        resultado.propostas = [
            {
                titulo: 'Dados Processados',
                descricao: `A IA extraiu automaticamente as informações do texto e cadastrou no sistema`,
                impacto: 'high',
                economia_estimada: 0
            }
        ];

        console.log('🎉 === PROCESSAMENTO CONCLUÍDO ===');

        return Response.json({
            ...resultado,
            mensagem: `🎉 Processamento concluído! ${resultado.inseridos.cronogramas} treinamentos agendados.`
        });

    } catch (error) {
        console.error('❌ ERRO:', error);
        
        return Response.json({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});