import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildEmailHtml(userName, userEmail, senha) {
  const appUrl = 'https://app.base44.com';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:36px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:10px;padding:10px 24px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:2px;">CAT</span>
                <span style="color:#e2b96f;font-size:24px;font-weight:900;letter-spacing:2px;"> CURSOS</span>
              </div>
              <p style="color:rgba(255,255,255,0.65);font-size:12px;margin:0;letter-spacing:1px;text-transform:uppercase;">Gestão de Cursos e Treinamentos</p>
            </td>
          </tr>

          <!-- Saudação -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="color:#1a1a2e;font-size:22px;font-weight:700;margin:0 0 10px;">Bem-vindo(a), ${userName}! 👋</h1>
              <p style="color:#555;font-size:15px;line-height:1.7;margin:0;">
                Seu acesso ao <strong>CAT Gestão de Cursos</strong> foi criado com sucesso.<br>
                Abaixo estão suas credenciais para entrar no sistema.
              </p>
            </td>
          </tr>

          <!-- Caixa de Credenciais -->
          <tr>
            <td style="padding:0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #c7d2fe;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background:#4f46e5;padding:12px 20px;">
                    <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px;">🔐 SUAS CREDENCIAIS DE ACESSO</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;background:#f8f9ff;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:18px;">
                          <p style="margin:0 0 6px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">E-mail de acesso</p>
                          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:11px 14px;">
                            <span style="color:#1a1a2e;font-size:15px;font-weight:600;">${userEmail}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0 0 6px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Senha temporária</p>
                          <div style="background:#fff;border:2px solid #4f46e5;border-radius:6px;padding:11px 14px;text-align:center;">
                            <span style="color:#4f46e5;font-size:26px;font-weight:900;letter-spacing:6px;font-family:Courier New,monospace;">${senha}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Aviso -->
          <tr>
            <td style="padding:0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                      ⚠️ <strong>Importante:</strong> Esta é uma senha temporária. Por segurança, você deverá <strong>criar uma nova senha</strong> no seu primeiro acesso ao sistema.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Botão CTA -->
          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 44px;border-radius:8px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
                🚀 ACESSAR O SISTEMA
              </a>
            </td>
          </tr>

          <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;"></td></tr>

          <!-- Suporte -->
          <tr>
            <td style="padding:20px 40px;text-align:center;">
              <p style="color:#9ca3af;font-size:13px;margin:0 0 4px;">Dificuldades para acessar? Entre em contato com o suporte:</p>
              <p style="color:#4f46e5;font-size:13px;font-weight:600;margin:0;">suporte@catcursos.com.br</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} CAT Gestão de Cursos. Este e-mail foi enviado automaticamente.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const allowedRoles = ['admin', 'Administrador Master', 'gestor_master'];
    if (!allowedRoles.includes(user.role || '')) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { user_email, user_name, senha_temporaria } = await req.json();
    if (!user_email || !user_name || !senha_temporaria) {
      return Response.json({ error: 'user_email, user_name e senha_temporaria são obrigatórios' }, { status: 400 });
    }

    // Salva a senha temporária no perfil do usuário
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email });
    if (profiles.length > 0) {
      await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
        initial_password: senha_temporaria,
        status: 'pending_password_change',
        credentials_sent_at: new Date().toISOString(),
        credentials_sent_via: 'email',
        credentials_sent_by: user.email,
      });
    }

    // Envia e-mail via integração nativa SendEmail
    const emailBody = buildEmailHtml(user_name, user_email, senha_temporaria);
    const result = await base44.integrations.Core.SendEmail({
      to: user_email,
      subject: 'Bem-vindo(a) ao CAT Gestão de Cursos - Suas credenciais de acesso',
      body: emailBody,
      from_name: 'CAT Gestão de Cursos',
    });

    return Response.json({
      success: true,
      message: `E-mail de boas-vindas enviado para ${user_email}`,
      email_enviado: true,
    });

  } catch (error) {
    console.error('Erro ao enviar boas-vindas:', error);
    return Response.json({ 
      error: 'Erro ao enviar e-mail', 
      details: error.message 
    }, { status: 500 });
  }
});