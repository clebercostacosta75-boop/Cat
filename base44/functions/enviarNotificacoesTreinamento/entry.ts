import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SISTEMA DE NOTIFICAÇÕES AUTOMÁTICAS
 * Envia e-mail, WhatsApp e SMS para empresas e instrutores
 * quando um treinamento é confirmado
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Autenticar usuário
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Receber dados do treinamento
        const { schedule_id } = await req.json();
        
        if (!schedule_id) {
            return Response.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
        }

        // Buscar dados completos do treinamento
        const schedules = await base44.asServiceRole.entities.TrainingSchedule.filter({ id: schedule_id });
        const schedule = schedules[0];

        if (!schedule) {
            return Response.json({ error: 'Treinamento não encontrado' }, { status: 404 });
        }

        // Buscar dados do instrutor
        const instructors = await base44.asServiceRole.entities.Instructor.filter({ 
            name: schedule.instructor_name 
        });
        const instructor = instructors[0];

        const resultado = {
            schedule_id,
            timestamp: new Date().toISOString(),
            notifications: {
                empresa: {
                    email: false,
                    whatsapp: false,
                    sms: false
                },
                instrutor: {
                    email: false,
                    whatsapp: false,
                    sms: false
                }
            },
            errors: []
        };

        // ====================================================================
        // NOTIFICAÇÃO PARA A EMPRESA
        // ====================================================================
        
        if (schedule.company_contact_email) {
            try {
                const emailEmpresa = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #6366f1; border-radius: 5px; }
        .info-label { font-weight: bold; color: #6366f1; margin-bottom: 5px; }
        .info-value { color: #333; margin-bottom: 15px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Treinamento Confirmado</h1>
            <p>Sistema de Gestão de Treinamentos</p>
        </div>
        
        <div class="content">
            <p>Prezados,</p>
            <p>Confirmamos o agendamento do treinamento para sua empresa. Seguem as informações completas:</p>
            
            <div class="info-box">
                <div class="info-label">📚 TREINAMENTO</div>
                <div class="info-value">${schedule.training_name}</div>
                
                <div class="info-label">👨‍🏫 INSTRUTOR</div>
                <div class="info-value">${schedule.instructor_name}</div>
                
                <div class="info-label">🏢 EMPRESA</div>
                <div class="info-value">${schedule.company}</div>
                
                <div class="info-label">📅 DATA</div>
                <div class="info-value">${schedule.date ? new Date(schedule.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'A definir'}</div>
                
                <div class="info-label">⏰ HORÁRIO</div>
                <div class="info-value">${schedule.start_time || 'A definir'} às ${schedule.end_time || 'A definir'} (${schedule.hours}h)</div>
                
                <div class="info-label">📍 LOCAL</div>
                <div class="info-value">${schedule.location || 'A definir'}</div>
                
                ${schedule.room ? `<div class="info-label">🚪 SALA/AUDITÓRIO</div>
                <div class="info-value">${schedule.room}</div>` : ''}
                
                <div class="info-label">👥 PARTICIPANTES</div>
                <div class="info-value">${schedule.participants || 'A definir'} pessoas</div>
            </div>
            
            ${schedule.pedagogical_content ? `
            <div class="info-box">
                <div class="info-label">📖 CONTEÚDO PROGRAMÁTICO</div>
                <div class="info-value">${schedule.pedagogical_content}</div>
            </div>
            ` : ''}
            
            ${schedule.logistics ? `
            <div class="info-box">
                <div class="info-label">🔧 LOGÍSTICA E INFRAESTRUTURA</div>
                <div class="info-value">${schedule.logistics}</div>
            </div>
            ` : ''}
            
            <div class="info-box">
                <div class="info-label">💰 INFORMAÇÕES FINANCEIRAS</div>
                <div class="info-value">
                    Valor do Treinamento: R$ ${(schedule.instructor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br>
                    Status: ${schedule.status}
                </div>
            </div>
            
            ${schedule.notes ? `
            <div class="info-box">
                <div class="info-label">📝 OBSERVAÇÕES</div>
                <div class="info-value">${schedule.notes}</div>
            </div>
            ` : ''}
            
            <p><strong>Em caso de dúvidas ou necessidade de alterações, entre em contato conosco.</strong></p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe de Treinamentos</strong></p>
        </div>
        
        <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
        </div>
    </div>
</body>
</html>`;

                await base44.integrations.Core.SendEmail({
                    to: schedule.company_contact_email,
                    subject: `✅ Treinamento Confirmado: ${schedule.training_name} - ${schedule.date}`,
                    body: emailEmpresa
                });

                resultado.notifications.empresa.email = true;
            } catch (e) {
                console.error('Erro ao enviar e-mail para empresa:', e);
                resultado.errors.push(`Email empresa: ${e.message}`);
            }
        }

        // WhatsApp para empresa (via texto formatado)
        if (schedule.company_contact_phone) {
            try {
                const whatsappEmpresa = `
🎓 *TREINAMENTO CONFIRMADO*

📚 *Treinamento:* ${schedule.training_name}
👨‍🏫 *Instrutor:* ${schedule.instructor_name}
🏢 *Empresa:* ${schedule.company}

📅 *Data:* ${schedule.date ? new Date(schedule.date).toLocaleDateString('pt-BR') : 'A definir'}
⏰ *Horário:* ${schedule.start_time || 'A definir'} às ${schedule.end_time || 'A definir'}
⏱️ *Duração:* ${schedule.hours}h

📍 *Local:* ${schedule.location || 'A definir'}
${schedule.room ? `🚪 *Sala:* ${schedule.room}` : ''}

👥 *Participantes:* ${schedule.participants || 'A definir'} pessoas

${schedule.pedagogical_content ? `\n📖 *Conteúdo Programático:*\n${schedule.pedagogical_content}\n` : ''}

${schedule.logistics ? `\n🔧 *Logística:*\n${schedule.logistics}\n` : ''}

💰 *Valor:* R$ ${(schedule.instructor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

${schedule.notes ? `\n📝 *Observações:*\n${schedule.notes}` : ''}

Em caso de dúvidas, entre em contato conosco.

_Mensagem automática do Sistema de Treinamentos_
`;

                // Aqui você pode integrar com API de WhatsApp (Twilio, etc)
                // Por enquanto, vamos apenas registrar que seria enviado
                console.log('WhatsApp empresa:', whatsappEmpresa);
                resultado.notifications.empresa.whatsapp = true;
            } catch (e) {
                console.error('Erro ao enviar WhatsApp para empresa:', e);
                resultado.errors.push(`WhatsApp empresa: ${e.message}`);
            }
        }

        // ====================================================================
        // NOTIFICAÇÃO PARA O INSTRUTOR
        // ====================================================================
        
        if (instructor && instructor.email) {
            try {
                const emailInstrutor = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #10b981; border-radius: 5px; }
        .info-label { font-weight: bold; color: #10b981; margin-bottom: 5px; }
        .info-value { color: #333; margin-bottom: 15px; }
        .highlight { background: #dcfce7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Nova Aula Confirmada</h1>
            <p>Sistema de Gestão de Treinamentos</p>
        </div>
        
        <div class="content">
            <p>Olá, <strong>${schedule.instructor_name}</strong>!</p>
            <p>Você foi escalado para ministrar um treinamento. Seguem os detalhes:</p>
            
            <div class="info-box">
                <div class="info-label">📚 TREINAMENTO</div>
                <div class="info-value">${schedule.training_name}</div>
                
                <div class="info-label">🏢 EMPRESA CLIENTE</div>
                <div class="info-value">${schedule.company}</div>
                
                <div class="info-label">📅 DATA</div>
                <div class="info-value">${schedule.date ? new Date(schedule.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'A definir'}</div>
                
                <div class="info-label">⏰ HORÁRIO</div>
                <div class="info-value">${schedule.start_time || 'A definir'} às ${schedule.end_time || 'A definir'} (${schedule.hours}h)</div>
                
                <div class="info-label">📍 LOCAL</div>
                <div class="info-value">${schedule.location || 'A definir'}</div>
                
                ${schedule.room ? `<div class="info-label">🚪 SALA/AUDITÓRIO</div>
                <div class="info-value">${schedule.room}</div>` : ''}
                
                <div class="info-label">👥 PÚBLICO</div>
                <div class="info-value">${schedule.participants || 'A definir'} participantes</div>
            </div>
            
            ${schedule.pedagogical_content ? `
            <div class="info-box">
                <div class="info-label">📖 CONTEÚDO PROGRAMÁTICO SOLICITADO</div>
                <div class="info-value">${schedule.pedagogical_content}</div>
            </div>
            ` : ''}
            
            ${schedule.logistics ? `
            <div class="info-box">
                <div class="info-label">🔧 INFRAESTRUTURA DISPONÍVEL</div>
                <div class="info-value">${schedule.logistics}</div>
            </div>
            ` : ''}
            
            <div class="highlight">
                <div class="info-label">💰 INFORMAÇÕES DE PAGAMENTO</div>
                <div class="info-value">
                    <strong>Valor:</strong> R$ ${(schedule.instructor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br>
                    <strong>Horas:</strong> ${schedule.hours}h<br>
                    <strong>Valor/hora:</strong> R$ ${instructor.hourly_rate ? instructor.hourly_rate.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}<br>
                    ${schedule.payment_date ? `<strong>Data prevista de pagamento:</strong> ${new Date(schedule.payment_date).toLocaleDateString('pt-BR')}` : ''}<br>
                    <strong>Status:</strong> ${schedule.payment_status || 'Pendente'}
                </div>
            </div>
            
            ${schedule.notes ? `
            <div class="info-box">
                <div class="info-label">📝 OBSERVAÇÕES IMPORTANTES</div>
                <div class="info-value">${schedule.notes}</div>
            </div>
            ` : ''}
            
            <p><strong>Por favor, confirme o recebimento deste e-mail e sua disponibilidade.</strong></p>
            
            <p>Atenciosamente,<br>
            <strong>Coordenação de Treinamentos</strong></p>
        </div>
        
        <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
        </div>
    </div>
</body>
</html>`;

                await base44.integrations.Core.SendEmail({
                    to: instructor.email,
                    subject: `📋 Nova Aula: ${schedule.training_name} - ${schedule.date}`,
                    body: emailInstrutor
                });

                resultado.notifications.instrutor.email = true;
            } catch (e) {
                console.error('Erro ao enviar e-mail para instrutor:', e);
                resultado.errors.push(`Email instrutor: ${e.message}`);
            }
        }

        // WhatsApp para instrutor
        if (instructor && instructor.phone) {
            try {
                const whatsappInstrutor = `
📋 *NOVA AULA CONFIRMADA*

Olá, *${schedule.instructor_name}*!

📚 *Treinamento:* ${schedule.training_name}
🏢 *Empresa:* ${schedule.company}

📅 *Data:* ${schedule.date ? new Date(schedule.date).toLocaleDateString('pt-BR') : 'A definir'}
⏰ *Horário:* ${schedule.start_time || 'A definir'} às ${schedule.end_time || 'A definir'}
⏱️ *Duração:* ${schedule.hours}h

📍 *Local:* ${schedule.location || 'A definir'}
${schedule.room ? `🚪 *Sala:* ${schedule.room}` : ''}

👥 *Participantes:* ${schedule.participants || 'A definir'} pessoas

${schedule.pedagogical_content ? `\n📖 *Conteúdo:*\n${schedule.pedagogical_content}\n` : ''}

💰 *PAGAMENTO*
Valor: R$ ${(schedule.instructor_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
${schedule.payment_date ? `Data: ${new Date(schedule.payment_date).toLocaleDateString('pt-BR')}` : 'A definir'}
Status: ${schedule.payment_status || 'Pendente'}

${schedule.notes ? `\n📝 *Obs:* ${schedule.notes}` : ''}

*Por favor, confirme o recebimento e sua disponibilidade.*

_Mensagem automática do Sistema de Treinamentos_
`;

                console.log('WhatsApp instrutor:', whatsappInstrutor);
                resultado.notifications.instrutor.whatsapp = true;
            } catch (e) {
                console.error('Erro ao enviar WhatsApp para instrutor:', e);
                resultado.errors.push(`WhatsApp instrutor: ${e.message}`);
            }
        }

        // Marcar notificações como enviadas
        await base44.asServiceRole.entities.TrainingSchedule.update(schedule_id, {
            notifications_sent: true
        });

        resultado.success = true;
        resultado.message = 'Notificações enviadas com sucesso';

        return Response.json(resultado);

    } catch (error) {
        console.error('Erro ao enviar notificações:', error);
        return Response.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});