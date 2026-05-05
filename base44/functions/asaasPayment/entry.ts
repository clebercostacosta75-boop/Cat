import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY");

const asaasHeaders = {
  "Content-Type": "application/json",
  "access_token": ASAAS_KEY,
};

async function getOrCreateCustomer(cpf, name, email, phone) {
  // Busca cliente existente pelo CPF
  const searchRes = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cpf.replace(/\D/g, "")}`, {
    headers: asaasHeaders,
  });
  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) {
    return searchData.data[0];
  }

  // Cria novo cliente
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
    if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── Criar cobrança ──────────────────────────────────────────────────────
    if (action === "createCharge") {
      const { student_cpf, student_name, student_email, student_phone, value, due_date, billing_type, enrollment_id, description } = body;

      if (!student_cpf || !student_name || !value || !due_date || !billing_type) {
        return Response.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
      }

      const customer = await getOrCreateCustomer(student_cpf, student_name, student_email, student_phone);
      if (!customer.id) return Response.json({ error: "Erro ao criar cliente no Asaas", details: customer }, { status: 500 });

      const chargeRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customer.id,
          billingType: billing_type, // BOLETO | CREDIT_CARD | PIX
          value: parseFloat(value),
          dueDate: due_date,
          description: description || "Pagamento de Curso - CAT Cursos",
          externalReference: enrollment_id || undefined,
        }),
      });

      const charge = await chargeRes.json();

      if (!charge.id) {
        return Response.json({ error: "Erro ao criar cobrança", details: charge }, { status: 500 });
      }

      // Busca link de pagamento
      let paymentData = {
        id: charge.id,
        status: charge.status,
        value: charge.value,
        due_date: charge.dueDate,
        billing_type: charge.billingType,
        invoice_url: charge.invoiceUrl,
        bank_slip_url: charge.bankSlipUrl,
      };

      // Para PIX, busca o QR Code
      if (billing_type === "PIX") {
        const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${charge.id}/pixQrCode`, {
          headers: asaasHeaders,
        });
        const pixData = await pixRes.json();
        paymentData.pix_qr_code = pixData.encodedImage;
        paymentData.pix_copy_paste = pixData.payload;
      }

      return Response.json({ success: true, charge: paymentData });
    }

    // ── Consultar status de cobrança ───────────────────────────────────────
    if (action === "getCharge") {
      const { charge_id } = body;
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${charge_id}`, { headers: asaasHeaders });
      const data = await res.json();
      return Response.json({ success: true, charge: data });
    }

    // ── Listar cobranças por CPF ───────────────────────────────────────────
    if (action === "listCharges") {
      const { cpf } = body;
      const searchRes = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cpf.replace(/\D/g, "")}`, { headers: asaasHeaders });
      const searchData = await searchRes.json();

      if (!searchData.data || searchData.data.length === 0) {
        return Response.json({ success: true, charges: [] });
      }

      const customerId = searchData.data[0].id;
      const chargesRes = await fetch(`${ASAAS_BASE_URL}/payments?customer=${customerId}&limit=20`, { headers: asaasHeaders });
      const chargesData = await chargesRes.json();
      return Response.json({ success: true, charges: chargesData.data || [] });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});