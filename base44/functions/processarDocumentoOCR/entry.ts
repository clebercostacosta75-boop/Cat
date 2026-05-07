import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_url, document_type, student_id, student_name, student_cpf, auto_cadastro, uploaded_by_email } = await req.json();

    if (!file_url || !document_type) {
      return Response.json({ error: 'file_url e document_type são obrigatórios' }, { status: 400 });
    }

    // Rodar OCR via LLM com visão
    const ocrPrompt = `Você é um sistema de OCR especializado em documentos brasileiros.
Analise a imagem do documento do tipo "${document_type}" e extraia as seguintes informações em JSON:
- nome_completo: nome completo da pessoa
- cpf: CPF no formato 000.000.000-00
- rg: número do RG
- orgao_emissor: órgão emissor do RG (ex: SSP/PA)
- data_nascimento: data no formato YYYY-MM-DD
- data_expedicao: data de expedição se houver
- filiacao_mae: nome da mãe se disponível
- filiacao_pai: nome do pai se disponível
- naturalidade: cidade/UF de nascimento se disponível
- logradouro: endereço (para comprovante de residência)
- cidade: cidade (para comprovante de residência)
- estado: UF (para comprovante de residência)
- cep: CEP (para comprovante de residência)

Retorne SOMENTE o JSON com os campos encontrados. Se um campo não for visível, omita-o. Não invente dados.`;

    const ocrResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: ocrPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          nome_completo: { type: "string" },
          cpf: { type: "string" },
          rg: { type: "string" },
          orgao_emissor: { type: "string" },
          data_nascimento: { type: "string" },
          data_expedicao: { type: "string" },
          filiacao_mae: { type: "string" },
          filiacao_pai: { type: "string" },
          naturalidade: { type: "string" },
          logradouro: { type: "string" },
          cidade: { type: "string" },
          estado: { type: "string" },
          cep: { type: "string" }
        }
      }
    });

    // Salvar registro do documento
    const docData = {
      document_type,
      file_uri: file_url,
      file_name: `${document_type}_${Date.now()}`,
      extracted_data: ocrResult,
      ocr_raw: JSON.stringify(ocrResult),
      status: "Pendente_Revisao",
      auto_cadastro: auto_cadastro || false,
      uploaded_by_email: uploaded_by_email || "auto_cadastro"
    };

    if (student_id) docData.student_id = student_id;
    if (student_name) docData.student_name = student_name;
    if (student_cpf) docData.student_cpf = student_cpf;

    const savedDoc = await base44.asServiceRole.entities.StudentDocument.create(docData);

    return Response.json({
      success: true,
      document_id: savedDoc.id,
      extracted_data: ocrResult
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});