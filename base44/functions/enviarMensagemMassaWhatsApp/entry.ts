import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

function limparTelefone(tel) {
  if (!tel) return null;
  let n = tel.replace(/\D/g, "");
  if (!n.startsWith("55")) n = "55" + n;
  if (n.length < 12) return null;
  return n;
}

async function enviarTexto(to, texto) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Erro ao enviar mensagem");
  return data;
}

async function enviarMidia(to, tipo, url, legenda) {
  // tipo: "image" | "video" | "document"
  const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: tipo,
      [tipo]: { link: url, caption: legenda || "" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Erro ao enviar mídia");
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const { texto, media_url, media_type } = await req.json();

    if (!texto && !media_url) {
      return Response.json({ error: "Informe pelo menos um texto ou mídia." }, { status: 400 });
    }

    // Buscar todos os leads com telefone
    const leads = await base44.asServiceRole.entities.Lead.list("-created_date", 500);
    const leadsComTel = leads.filter(l => l.phone);

    const resultados = [];
    let sucesso = 0;
    let falha = 0;

    for (const lead of leadsComTel) {
      const tel = limparTelefone(lead.phone);
      if (!tel) {
        resultados.push({ nome: lead.name, status: "pulado", motivo: "telefone inválido" });
        falha++;
        continue;
      }

      try {
        // Se tem mídia, envia a mídia com o texto como legenda
        if (media_url && media_type) {
          await enviarMidia(tel, media_type, media_url, texto || "");
        } else if (texto) {
          // Só texto
          await enviarTexto(tel, texto);
        }
        resultados.push({ nome: lead.name, status: "enviado" });
        sucesso++;
        // Pequena pausa para não sobrecarregar a API
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        resultados.push({ nome: lead.name, status: "erro", motivo: e.message });
        falha++;
      }
    }

    return Response.json({
      success: true,
      total: leadsComTel.length,
      sucesso,
      falha,
      resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});