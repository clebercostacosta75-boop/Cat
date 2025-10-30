import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== INÍCIO DO PROCESSAMENTO ===');
    
    try {
        const base44 = createClientFromRequest(req);
        console.log('✅ Cliente Base44 criado');
        
        const user = await base44.auth.me();
        console.log('✅ Usuário autenticado:', user?.email);
        
        if (!user) {
            console.error('❌ Usuário não autenticado');
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await req.json();
        console.log('✅ Body recebido:', body);
        
        const { file_url } = body;
        
        if (!file_url) {
            console.error('❌ file_url não fornecido');
            return Response.json({ error: 'file_url obrigatório' }, { status: 400 });
        }

        console.log('📥 Extraindo dados do arquivo:', file_url);

        // EXTRAÇÃO SIMPLES - SEM IA
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
                                status: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        console.log('📊 Resultado da extração:', extractResult);

        if (extractResult.status !== "success") {
            console.error('❌ Erro na extração:', extractResult.details);
            throw new Error('Falha ao extrair dados: ' + (extractResult.details || 'Erro desconhecido'));
        }

        const dados = extractResult.output?.data || [];
        console.log(`✅ ${dados.length} registros extraídos`);

        const resultado = {
            inseridos: { instrutores: 0, cursos: 0, cronogramas: 0 },
            estatisticas: { total: dados.length, sucesso: 0, erro: 0 }
        };

        // PROCESSAR CADA LINHA
        for (let i = 0; i < dados.length; i++) {
            const row = dados[i];
            console.log(`\n📋 Processando registro ${i + 1}:`, row);

            try {
                // Validar dados obrigatórios
                if (!row.training_name || !row.instructor_name || !row.company) {
                    console.warn(`⚠️ Registro ${i + 1} incompleto, pulando...`);
                    resultado.estatisticas.erro++;
                    continue;
                }

                // Criar instrutor se não existir
                if (row.instructor_name) {
                    try {
                        const instrutorExiste = await base44.asServiceRole.entities.Instructor.filter({ 
                            name: row.instructor_name 
                        });
                        
                        if (instrutorExiste.length === 0) {
                            await base44.asServiceRole.entities.Instructor.create({
                                name: row.instructor_name,
                                hourly_rate: 0,
                                specialty: '',
                                email: '',
                                phone: ''
                            });
                            resultado.inseridos.instrutores++;
                            console.log(`✅ Instrutor criado: ${row.instructor_name}`);
                        }
                    } catch (e) {
                        console.error(`❌ Erro ao criar instrutor:`, e.message);
                    }
                }

                // Criar curso se não existir
                if (row.training_name) {
                    try {
                        const cursoExiste = await base44.asServiceRole.entities.Course.filter({ 
                            name: row.training_name 
                        });
                        
                        if (cursoExiste.length === 0) {
                            await base44.asServiceRole.entities.Course.create({
                                name: row.training_name,
                                standard_value: row.standard_value || 0,
                                duration_hours: row.hours || 0,
                                description: '',
                                category: 'Outro'
                            });
                            resultado.inseridos.cursos++;
                            console.log(`✅ Curso criado: ${row.training_name}`);
                        }
                    } catch (e) {
                        console.error(`❌ Erro ao criar curso:`, e.message);
                    }
                }

                // Corrigir status
                let status = row.status || 'Planejado';
                if (!['Planejado', 'Confirmado', 'Realizado', 'Cancelado'].includes(status)) {
                    status = 'Planejado';
                }

                // Criar cronograma
                await base44.asServiceRole.entities.TrainingSchedule.create({
                    training_name: row.training_name,
                    instructor_name: row.instructor_name,
                    company: row.company,
                    month: row.month || '',
                    date: row.date || '',
                    start_time: row.start_time || '',
                    end_time: row.end_time || '',
                    hours: row.hours || 0,
                    instructor_cost: row.instructor_cost || 0,
                    standard_value: row.standard_value || 0,
                    cost_difference: (row.instructor_cost || 0) - (row.standard_value || 0),
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

                resultado.inseridos.cronogramas++;
                resultado.estatisticas.sucesso++;
                console.log(`✅ Cronograma criado para: ${row.training_name}`);

            } catch (e) {
                console.error(`❌ Erro ao processar registro ${i + 1}:`, e.message);
                resultado.estatisticas.erro++;
            }
        }

        console.log('\n=== RESULTADO FINAL ===');
        console.log('Instrutores:', resultado.inseridos.instrutores);
        console.log('Cursos:', resultado.inseridos.cursos);
        console.log('Cronogramas:', resultado.inseridos.cronogramas);
        console.log('Sucesso:', resultado.estatisticas.sucesso);
        console.log('Erros:', resultado.estatisticas.erro);

        // Dados simplificados para análise
        resultado.inconsistencias = [];
        resultado.propostas = [];
        resultado.etapas = [
            { nome: 'Extração', status: 'concluído' },
            { nome: 'Validação', status: 'concluído' },
            { nome: 'Inserção', status: 'concluído' }
        ];

        console.log('=== PROCESSAMENTO CONCLUÍDO COM SUCESSO ===\n');

        return Response.json(resultado);

    } catch (error) {
        console.error('❌❌❌ ERRO FATAL ❌❌❌');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        
        return Response.json({
            error: error.message || 'Erro desconhecido',
            details: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});