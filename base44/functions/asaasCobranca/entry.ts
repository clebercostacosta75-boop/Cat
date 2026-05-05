import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const API_KEY = Deno.env.get("ASAAS_API_KEY");

if (!API_KEY) {
  throw new Error("ASAAS_API_KEY não configurada");
}

const asaasHeaders = {
  "Content-Type": "application/json",
  "access_token": API_KEY,
};

async function getOrCreateCustomer(cpf, name, email, phone) {
  const searchRes = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cpf.replace(/\D/g, "")}`, {
    headers: asaasHeaders,
  });
  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) {
    return searchData.data[0];
  }

  const createRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: asaasHeaders,
    body: JSON.stringify({
      name,
      cpfCnpj: cpf.replace(/\D/g, ""),
      email: email || undefined,
      mobilePhone: phone ? phone.replace(/\D/g, "") : undefined,
    }),
  });
  return await createRes.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, ...params } = body;

    // ── Buscar ou criar cliente no Asaas ──────────────────────────────────────
    if (action === "getOrCreateCustomer") {
      const { name, cpf, email, phone } = params;

      // Busca por CPF
      const search = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cpf.replace(/\D/g, "")}`, {
        headers: asaasHeaders,
      });
      const searchData = await search.json();

      if (searchData.data && searchData.data.length > 0) {
        return Response.json({ customer: searchData.data[0] });
      }

      // Cria novo cliente
      const create = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name,
          cpfCnpj: cpf.replace(/\D/g, ""),
          email: email || undefined,
          mobilePhone: phone ? phone.replace(/\D/g, "") : undefined,
        }),
      });
      const customer = await create.json();
      return Response.json({ customer });
    }

    // ── Criar cobrança ────────────────────────────────────────────────────────
    if (action === "createCharge") {
      const { customerId, billingType, value, dueDate, description, installmentCount } = params;

      const chargeBody = {
        customer: customerId,
        billingType,
        value,
        dueDate,
        description,
      };

      if (billingType === "CREDIT_CARD" && installmentCount > 1) {
        chargeBody.installmentCount = installmentCount;
        chargeBody.installmentValue = parseFloat((value / installmentCount).toFixed(2));
      }

      const res = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(chargeBody),
      });
      const charge = await res.json();
      return Response.json({ charge });
    }

    // ── Listar cobranças de um cliente ────────────────────────────────────────
    if (action === "listCharges") {
      const { customerId } = params;
      const res = await fetch(`${ASAAS_BASE_URL}/payments?customer=${customerId}&limit=20`, {
        headers: asaasHeaders,
      });
      const data = await res.json();
      return Response.json({ charges: data.data || [] });
    }

    // ── Buscar QR Code Pix ────────────────────────────────────────────────────
    if (action === "getPixQrCode") {
      const { paymentId } = params;
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, {
        headers: asaasHeaders,
      });
      const data = await res.json();
      return Response.json({ pix: data });
    }

    // ── Buscar linha digitável do boleto ──────────────────────────────────────
    if (action === "getBoletoLine") {
      const { paymentId } = params;
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/identificationField`, {
        headers: asaasHeaders,
      });
      const data = await res.json();
      return Response.json({ boleto: data });
    }

    // ── Cancelar cobrança ─────────────────────────────────────────────────────
    if (action === "cancelCharge") {
      const { paymentId } = params;
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/cancel`, {
        method: "POST",
        headers: asaasHeaders,
      });
      const data = await res.json();
      return Response.json({ result: data });
    }

    return Response.json({ error: "Ação não reconhecida" }, { status: 400 });
  } catch (error) {
    console.error('[asaasCobranca] Erro:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});