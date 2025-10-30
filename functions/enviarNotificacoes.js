import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import twilio from 'npm:twilio';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { 
            schedule_id, 
            notification_type = 'all', // 'email', 'whatsapp', 'sms', 'all'
            recipients = 'all' // 'instructor', 'company', 'admins', 'all'
        } = await req.json();

        if (!schedule_id) {
            return Response.json({ error: 'schedule_id obrigatório' }, { status: 400 });
        }

        // Buscar informações do treinamento
        const schedules = await base44.asServiceRole.entities.ClassSchedule.filter({ 
            id: schedule_id 
        });
        const schedule = schedules[0];

        if (!schedule) {
            return Response.json({ error: 'Treinamento não encontrado' }, { status: 404 });
        }

        // Buscar informações do instrutor
        let instructor = null;
        if (schedule.instructor_name) {
            const instructors = await base44.asServiceRole.entities.Instructor.filter({ 
                name: schedule.instructor_name 
            });
            instructor = instructors[0];
        }

        // Buscar informações da empresa
        let company = null;
        if (schedule.company_name) {
            const companies = await base44.asServiceRole.entities.Company.filter({ 
                nome_fantasia: schedule.company_name 
            });
            company = companies[0];
        }

        // Configurar Twilio (se disponível)
        let twilioClient = null;
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        
        if (twilioSid && twilioToken) {
            twilioClient = twilio(twilioSid, twilioToken);
        }

        const results = {
            email: { sent: false, recipients: [] },
            whatsapp: { sent: false, recipients: [] },
            sms: { sent: false, recipients: [] }
        };

        // Preparar mensagem
        const emailSubject = `Notificação: ${schedule.training_name}`;
        const emailBody = `
            <h2>Treinamento: ${schedule.training_name}</h2>
            <p><strong>Empresa:</strong> ${schedule.company_name}</p>
            <p><strong>Data Início:</strong> ${schedule.start_date}</p>
            <p><strong>Data Fim:</strong> ${schedule.end_date || 'Não definida'}</p>
            <p><strong>Local:</strong> ${schedule.location || 'Não definido'}</p>
            <p><strong>Horário:</strong> ${schedule.training_schedule || 'Não definido'}</p>
            <p><strong>Instrutor:</strong> ${schedule.instructor_name || 'Não definido'}</p>
            <p><strong>Alunos:</strong> ${schedule.students_count || 0}</p>
            <p><strong>Status:</strong> ${schedule.status}</p>
        `;

        const shortMessage = `Treinamento: ${schedule.training_name}\nEmpresa: ${schedule.company_name}\nData: ${schedule.start_date}\nLocal: ${schedule.location || 'Não definido'}\nStatus: ${schedule.status}`;

        // ENVIAR PARA INSTRUTOR
        if ((recipients === 'all' || recipients === 'instructor') && instructor) {
            // Email
            if ((notification_type === 'all' || notification_type === 'email') && instructor.email) {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: instructor.email,
                        subject: emailSubject,
                        body: emailBody
                    });
                    results.email.sent = true;
                    results.email.recipients.push(instructor.email);
                } catch (e) {
                    console.error('Erro ao enviar email para instrutor:', e);
                }
            }

            // WhatsApp
            if ((notification_type === 'all' || notification_type === 'whatsapp') && instructor.phone && twilioClient) {
                try {
                    const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
                    if (whatsappNumber) {
                        await twilioClient.messages.create({
                            from: whatsappNumber,
                            to: `whatsapp:${instructor.phone}`,
                            body: `🎓 ${shortMessage}`
                        });
                        results.whatsapp.sent = true;
                        results.whatsapp.recipients.push(instructor.phone);
                    }
                } catch (e) {
                    console.error('Erro ao enviar WhatsApp para instrutor:', e);
                }
            }

            // SMS
            if ((notification_type === 'all' || notification_type === 'sms') && instructor.phone && twilioClient) {
                try {
                    const smsNumber = Deno.env.get('TWILIO_SMS_NUMBER');
                    if (smsNumber) {
                        await twilioClient.messages.create({
                            from: smsNumber,
                            to: instructor.phone,
                            body: shortMessage
                        });
                        results.sms.sent = true;
                        results.sms.recipients.push(instructor.phone);
                    }
                } catch (e) {
                    console.error('Erro ao enviar SMS para instrutor:', e);
                }
            }
        }

        // ENVIAR PARA EMPRESA
        if ((recipients === 'all' || recipients === 'company') && company) {
            // Email
            if ((notification_type === 'all' || notification_type === 'email') && company.email_faturamento) {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: company.email_faturamento,
                        subject: emailSubject,
                        body: emailBody
                    });
                    results.email.sent = true;
                    results.email.recipients.push(company.email_faturamento);
                } catch (e) {
                    console.error('Erro ao enviar email para empresa:', e);
                }
            }

            // WhatsApp para contatos da empresa
            if ((notification_type === 'all' || notification_type === 'whatsapp') && company.contacts && twilioClient) {
                const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
                if (whatsappNumber) {
                    for (const contact of company.contacts) {
                        if (contact.is_whatsapp && contact.phone) {
                            try {
                                await twilioClient.messages.create({
                                    from: whatsappNumber,
                                    to: `whatsapp:${contact.phone}`,
                                    body: `🏢 ${shortMessage}`
                                });
                                results.whatsapp.sent = true;
                                results.whatsapp.recipients.push(contact.phone);
                            } catch (e) {
                                console.error('Erro ao enviar WhatsApp para contato da empresa:', e);
                            }
                        }
                    }
                }
            }
        }

        // ENVIAR PARA ADMINISTRADORES
        if (recipients === 'all' || recipients === 'admins') {
            const adminNumbers = Deno.env.get('ADMIN_WHATSAPP_NUMBERS');
            if (adminNumbers && twilioClient) {
                const numbers = adminNumbers.split(',').map(n => n.trim());
                const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
                
                if (whatsappNumber) {
                    for (const adminNumber of numbers) {
                        try {
                            await twilioClient.messages.create({
                                from: whatsappNumber,
                                to: `whatsapp:${adminNumber}`,
                                body: `⚠️ ATUALIZAÇÃO DE TREINAMENTO\n\n${shortMessage}\n\nAtualizado por: ${user.full_name || user.email}`
                            });
                            results.whatsapp.sent = true;
                            results.whatsapp.recipients.push(adminNumber);
                        } catch (e) {
                            console.error('Erro ao enviar WhatsApp para admin:', e);
                        }
                    }
                }
            }
        }

        return Response.json({
            success: true,
            schedule_id,
            results,
            message: 'Notificações processadas',
            twilio_configured: !!twilioClient
        });

    } catch (error) {
        console.error('Erro ao enviar notificações:', error);
        return Response.json({
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});