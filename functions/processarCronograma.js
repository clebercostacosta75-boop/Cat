import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('🚀 INÍCIO');
    
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

        console.log('📥 Extraindo dados...');

        // EXTRAÇÃO SIMPLES - SEM IA COMPLEXA
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
                type: "object",
                properties: {
                    treinamentos: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                nome_treinamento: { type: "string" },
                                instrutor: { type: "string" },
                                empresa: { type: "string" },
                                mes: { type: "string" },
                                data: { type: "string" },
                                horario_inicio: { type: "string" },
                                horario_fim: { type: "string" },
                                horas: { type: "number" },
                                custo_instrutor: { type: "number" },
                                valor_padrao: { type: "number" },
                                participantes: { type: "number" },
                                status: { type: "string" },
                                local: { type: "string" },
                                sala: { type: "string" },
                                observacoes: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        console.log('📊 Resultado extração:', extractResult.status);

        if (extractResult.status !== "success") {
            throw new Error('Falha ao extrair dados da planilha');
        }

        const treinamentos = extractResult.output?.treinamentos || [];
        console.log(`✅ ${treinamentos.length} registros extraídos`);

        const resultado = {
            inseridos: { instrutores: 0, cursos: 0, cronogramas: 0 },
            estatisticas: { total: treinamentos.length, validos: 0, invalidos: 0, correcoes_aplicadas: 0 },
            etapas: [],
            inconsistencias: [],
            propostas: [],
            logs: []
        };

        // PROCESSAR CADA TREINAMENTO
        for (let i = 0; i < treinamentos.length; i++) {
            const t = treinamentos[i];
            
            console.log(`\n📋 Processando ${i + 1}/${treinamentos.length}`);

            // Validar campos obrigatórios
            if (!t.nome_treinamento || !t.instrutor || !t.empresa) {
                console.warn(`⚠️ Registro incompleto, pulando...`);
                resultado.estatisticas.invalidos++;
                continue;
            }

            try {
                // CRIAR INSTRUTOR (se não existe)
                if (t.instrutor) {
                    const instExiste = await base44.asServiceRole.entities.Instructor.filter({ 
                        name: t.instrutor 
                    });
                    
                    if (instExiste.length === 0) {
                        await base44.asServiceRole.entities.Instructor.create({
                            name: t.instrutor,
                            hourly_rate: 0,
                            specialty: '',
                            email: '',
                            phone: ''
                        });
                        resultado.inseridos.instrutores++;
                        console.log(`✅ Instrutor: ${t.instrutor}`);
                    }
                }

                // CRIAR CURSO (se não existe)
                if (t.nome_treinamento) {
                    const cursoExiste = await base44.asServiceRole.entities.Course.filter({ 
                        name: t.nome_treinamento 
                    });
                    
                    if (cursoExiste.length === 0) {
                        await base44.asServiceRole.entities.Course.create({
                            name: t.nome_treinamento,
                            standard_value: t.valor_padrao || 0,
                            duration_hours: t.horas || 0,
                            description: '',
                            category: 'Outro'
                        });
                        resultado.inseridos.cursos++;
                        console.log(`✅ Curso: ${t.nome_treinamento}`);
                    }
                }

                // Normalizar status
                let status = t.status || 'Planejado';
                if (!['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(status)) {
                    status = 'Planejado';
                    resultado.estatisticas.correcoes_aplicadas++;
                }

                // CRIAR CRONOGRAMA
                await base44.asServiceRole.entities.TrainingSchedule.create({
                    training_name: t.nome_treinamento,
                    instructor_name: t.instrutor,
                    company: t.empresa,
                    month: t.mes || '',
                    date: t.data || '',
                    start_time: t.horario_inicio || '',
                    end_time: t.horario_fim || '',
                    hours: t.horas || 0,
                    instructor_cost: t.custo_instrutor || 0,
                    standard_value: t.valor_padrao || 0,
                    cost_difference: (t.custo_instrutor || 0) - (t.valor_padrao || 0),
                    participants: t.participantes || 0,
                    status: status,
                    location: t.local || '',
                    room: t.sala || '',
                    logistics: '',
                    pedagogical_content: '',
                    payment_date: '',
                    payment_status: 'Pendente',
                    company_contact_email: '',
                    company_contact_phone: '',
                    notifications_sent: false,
                    notes: t.observacoes || ''
                });

                resultado.inseridos.cronogramas++;
                resultado.estatisticas.validos++;
                console.log(`✅ Treinamento: ${t.nome_treinamento}`);

            } catch (e) {
                console.error(`❌ Erro no registro ${i + 1}:`, e.message);
                resultado.estatisticas.invalidos++;
            }
        }

        // Criar resumo simples
        resultado.etapas = [
            { nome: 'Extração', status: 'concluído' },
            { nome: 'Validação', status: 'concluído' },
            { nome: 'Inserção', status: 'concluído' }
        ];

        resultado.logs = [
            `✅ ${resultado.inseridos.instrutores} instrutor(es) cadastrado(s)`,
            `✅ ${resultado.inseridos.cursos} curso(s) cadastrado(s)`,
            `✅ ${resultado.inseridos.cronogramas} treinamento(s) inserido(s)`,
            `🔧 ${resultado.estatisticas.correcoes_aplicadas} correção(ões) aplicada(s)`
        ];

        resultado.inconsistencias = [
            {
                severidade: 'INFO',
                descricao: `${resultado.inseridos.cronogramas} treinamentos processados com sucesso`,
                auto_corrigivel: true
            }
        ];

        resultado.propostas = [
            {
                titulo: 'Importação Concluída',
                descricao: 'Dados inseridos no sistema com sucesso',
                impacto: 'high',
                economia_estimada: 0
            }
        ];

        console.log('🎉 SUCESSO');
        console.log('Instrutores:', resultado.inseridos.instrutores);
        console.log('Cursos:', resultado.inseridos.cursos);
        console.log('Cronogramas:', resultado.inseridos.cronogramas);

        return Response.json(resultado);

    } catch (error) {
        console.error('❌ ERRO:', error.message);
        
        return Response.json({
            error: error.message || 'Erro ao processar arquivo',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});