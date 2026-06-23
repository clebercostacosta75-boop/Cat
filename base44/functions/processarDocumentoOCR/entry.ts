import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, document_type, student_name: inputName } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    // 1. Extrair dados do documento via OCR/IA
    const extractionSchema = {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome completo da pessoa" },
        cpf: { type: "string", description: "CPF no formato 000.000.000-00" },
        rg: { type: "string", description: "RG" },
        data_nascimento: { type: "string", description: "Data de nascimento no formato DD/MM/AAAA" },
        nome_pai: { type: "string", description: "Nome do pai" },
        nome_mae: { type: "string", description: "Nome da mãe" },
        data_emissao: { type: "string", description: "Data de emissão do documento" },
        orgao_emissor: { type: "string", description: "Órgão emissor do documento" },
        tipo_documento_detectado: { type: "string", enum: ["RG", "CNH", "CPF", "Outros"] }
      }
    };

    const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: extractionSchema
    });

    let extractedData = {};
    let rawText = '';

    if (extractionResult.status === "success" && extractionResult.output) {
      const output = Array.isArray(extractionResult.output) ? extractionResult.output[0] : extractionResult.output;
      extractedData = {
        nome: output.nome || '',
        cpf: (output.cpf || '').replace(/\D/g, ''),
        rg: output.rg || '',
        data_nascimento: output.data_nascimento || '',
        nome_pai: output.nome_pai || '',
        nome_mae: output.nome_mae || '',
        data_emissao: output.data_emissao || '',
        orgao_emissor: output.orgao_emissor || '',
        tipo_documento_detectado: output.tipo_documento_detectado || document_type || 'Outros'
      };
      rawText = JSON.stringify(output);
    }

    // 2. Se encontrou CPF, buscar aluno existente
    let studentFound = null;
    if (extractedData.cpf && extractedData.cpf.length === 11) {
      const existing = await base44.entities.Student.filter({ cpf: extractedData.cpf });
      if (existing.length > 0) studentFound = existing[0];
    }

    // 3. Se inputName foi passado (pré-cadastro), usar como fallback
    if (!extractedData.nome && inputName) {
      extractedData.nome = inputName;
    }

    // 4. Criar registro StudentDocument
    const docRecord = await base44.entities.StudentDocument.create({
      student_id: studentFound?.id || '',
      student_name: studentFound?.full_name || extractedData.nome || '',
      student_cpf: extractedData.cpf || '',
      document_type: extractedData.tipo_documento_detectado || document_type || 'Outros',
      file_uri: file_url,
      file_name: file_url.split('/').pop() || 'documento',
      extracted_data: extractedData,
      ocr_raw: rawText,
      status: 'Pendente_Revisao',
      uploaded_by_email: user.email,
      auto_cadastro: !studentFound
    });

    // 5. Se for auto-cadastro e tiver dados mínimos, sugerir
    let sugestaoCadastro = null;
    if (!studentFound && extractedData.nome && extractedData.cpf) {
      sugestaoCadastro = {
        nome: extractedData.nome,
        cpf: extractedData.cpf,
        rg: extractedData.rg,
        data_nascimento: extractedData.data_nascimento,
        document_type: extractedData.tipo_documento_detectado,
        student_document_id: docRecord.id
      };
    }

    return Response.json({
      success: true,
      student_document: docRecord,
      extracted_data: extractedData,
      raw_text: rawText,
      student_found: studentFound,
      sugestao_cadastro: sugestaoCadastro
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});