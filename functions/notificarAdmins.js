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
            action, // 'created', 'updated', 'deleted'
            entity_type, // 'ClassSchedule', 'Instructor', 'Course', etc
            entity_id,
            entity_name,
            details
        } = await req.json();

        if (!action || !entity_type) {
            return Response.json({ error: 'action e entity_type são obrigatórios' }, { status: 400 });
        }

        // Configurar Twilio (se disponível)
        let twilioClient = null;
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        
        if (twilioSid && twilioToken) {
            twilioClient = twilio(twilioSid, twilioToken);
        }

        // Obter números dos admins
        const adminNumbers = Deno.env.get('ADMIN_WHATSAPP_NUMBERS');
        if (!adminNumbers || !twilioClient) {
            return Response.json({
                success: false,
                message: 'WhatsApp não configurado ou números de admins não definidos'
            });
        }

        const numbers = adminNumbers.split(',').map(n => n.trim());
        const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
        
        if (!whatsappNumber) {
            return Response.json({
                success: false,
                message: 'Número WhatsApp Twilio não configurado'
            });
        }

        // Mapear ações para emojis e textos
        const actionMap = {
            'created': { emoji: '➕', text: 'CRIADO' },
            'updated': { emoji: '✏️', text: 'ATUALIZADO' },
            'deleted': { emoji: '🗑️', text: 'EXCLUÍDO' }
        };

        const entityMap = {
            'ClassSchedule': { emoji: '📅', text: 'Treinamento' },
            'Instructor': { emoji: '👨‍🏫', text: 'Instrutor' },
            'Course': { emoji: '📚', text: 'Curso' },
            'Company': { emoji: '🏢', text: 'Empresa' },
            'Contractor': { emoji: '🏭', text: 'Contratada' }
        };

        const actionInfo = actionMap[action] || { emoji: '📝', text: action.toUpperCase() };
        const entityInfo = entityMap[entity_type] || { emoji: '📄', text: entity_type };

        // Montar mensagem
        let message = `${actionInfo.emoji} ${entityInfo.emoji} ${entityInfo.text} ${actionInfo.text}\n\n`;
        message += `Nome: ${entity_name || 'N/A'}\n`;
        message += `ID: ${entity_id || 'N/A'}\n`;
        
        if (details) {
            message += `\nDetalhes:\n${details}\n`;
        }
        
        message += `\nPor: ${user.full_name || user.email}\n`;
        message += `Data: ${new Date().toLocaleString('pt-BR')}`;

        // Enviar para todos os admins
        const results = [];
        for (const adminNumber of numbers) {
            try {
                const sent = await twilioClient.messages.create({
                    from: whatsappNumber,
                    to: `whatsapp:${adminNumber}`,
                    body: message
                });
                results.push({ 
                    number: adminNumber, 
                    success: true, 
                    sid: sent.sid 
                });
            } catch (e) {
                console.error('Erro ao enviar WhatsApp para admin:', e);
                results.push({ 
                    number: adminNumber, 
                    success: false, 
                    error: e.message 
                });
            }
        }

        return Response.json({
            success: true,
            results,
            message: 'Notificações enviadas para administradores'
        });

    } catch (error) {
        console.error('Erro ao notificar admins:', error);
        return Response.json({
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});