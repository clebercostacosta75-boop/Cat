import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todas as empresas
    const companies = await base44.asServiceRole.entities.Company.list();
    
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    
    const expiringContracts = [];
    
    // Verificar contratos de cada empresa
    for (const company of companies) {
      if (!company.company_contracts || company.company_contracts.length === 0) {
        continue;
      }
      
      for (const contract of company.company_contracts) {
        if (!contract.end_date || contract.status !== 'Ativo') {
          continue;
        }
        
        const endDate = new Date(contract.end_date);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Contrato vence em exatamente 30 dias
        if (diffDays === 30) {
          expiringContracts.push({
            company_id: company.id,
            company_name: company.nome_fantasia,
            contract_number: contract.contract_number,
            end_date: contract.end_date,
            days_remaining: diffDays
          });
          
          // Buscar usuários admin e financeiro para notificar
          const users = await base44.asServiceRole.entities.User.list();
          const usersToNotify = users.filter(u => 
            u.custom_role === 'Administrador Master' || 
            u.custom_role === 'Financeiro' ||
            u.role === 'admin'
          );
          
          // Criar notificações
          for (const user of usersToNotify) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: user.id,
              type: 'document_expiring',
              title: `Contrato Vencendo: ${company.nome_fantasia}`,
              message: `O contrato ${contract.contract_number} da empresa ${company.nome_fantasia} vencerá em 30 dias (${new Date(contract.end_date).toLocaleDateString('pt-BR')}).`,
              link: `/Companies`,
              related_entity: 'Company',
              related_entity_id: company.id,
              priority: 'high'
            });
          }
        }
      }
    }
    
    return Response.json({
      success: true,
      checked_companies: companies.length,
      expiring_contracts: expiringContracts.length,
      contracts: expiringContracts
    });
    
  } catch (error) {
    console.error('Erro ao verificar contratos:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});