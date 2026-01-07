import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, company_id } = await req.json();

    if (!file_url || !company_id) {
      return Response.json({ 
        error: 'file_url e company_id são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar a empresa
    const company = await base44.entities.Company.get(company_id);
    if (!company) {
      return Response.json({ 
        error: 'Empresa não encontrada' 
      }, { status: 404 });
    }

    // Extrair dados do arquivo Excel
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_id: { type: "string" },
                course_name: { type: "string" },
                workload_hours: { type: "number" },
                modality: { type: "string" },
                theoretical_hours: { type: "number" },
                practical_hours: { type: "number" },
                specific_price: { type: "number" }
              }
            }
          }
        }
      }
    });

    if (extractResult.status !== 'success' || !extractResult.output?.courses) {
      return Response.json({ 
        error: 'Erro ao processar arquivo',
        details: extractResult.details
      }, { status: 400 });
    }

    const coursesData = extractResult.output.courses;
    const results = [];
    const errors = [];

    // Buscar todos os cursos para validação
    const allCourses = await base44.entities.Course.list();
    const courseMap = new Map(allCourses.map(c => [c.id, c]));

    // Processar cada curso
    for (let i = 0; i < coursesData.length; i++) {
      const courseData = coursesData[i];
      
      try {
        // Validar se o curso existe
        if (!courseMap.has(courseData.course_id)) {
          errors.push({
            line: i + 2, // +2 porque linha 1 é cabeçalho
            error: `Curso com ID ${courseData.course_id} não encontrado`
          });
          continue;
        }

        const course = courseMap.get(courseData.course_id);

        // Validar modalidade
        const validModalities = ['Presencial', 'Híbrido', 'Online'];
        if (!validModalities.includes(courseData.modality)) {
          errors.push({
            line: i + 2,
            error: `Modalidade inválida: ${courseData.modality}. Use: Presencial, Híbrido ou Online`
          });
          continue;
        }

        // Preparar dados do curso
        const newCourse = {
          course_id: courseData.course_id,
          course_name: courseData.course_name || course.name,
          workload_hours: courseData.workload_hours || course.duration_hours || 0,
          modality: courseData.modality,
          theoretical_hours: courseData.theoretical_hours || 0,
          practical_hours: courseData.practical_hours || 0,
          specific_price: courseData.specific_price || course.standard_value || 0
        };

        results.push({
          line: i + 2,
          course: newCourse.course_name,
          status: 'success'
        });

      } catch (error) {
        errors.push({
          line: i + 2,
          error: error.message
        });
      }
    }

    // Se houver erros, não atualizar
    if (errors.length > 0) {
      return Response.json({
        success: false,
        message: 'Erros encontrados no arquivo',
        errors: errors,
        processed: 0
      }, { status: 400 });
    }

    // Atualizar a empresa com os novos cursos
    const currentCourses = company.company_courses || [];
    const newCourses = results.map(r => {
      const courseData = coursesData.find((_, idx) => idx + 2 === r.line);
      const course = courseMap.get(courseData.course_id);
      return {
        course_id: courseData.course_id,
        course_name: courseData.course_name || course.name,
        workload_hours: courseData.workload_hours || course.duration_hours || 0,
        modality: courseData.modality,
        theoretical_hours: courseData.theoretical_hours || 0,
        practical_hours: courseData.practical_hours || 0,
        specific_price: courseData.specific_price || course.standard_value || 0
      };
    });

    // Combinar cursos existentes com novos (evitar duplicatas por course_id)
    const existingCourseIds = new Set(currentCourses.map(c => c.course_id));
    const coursesToAdd = newCourses.filter(c => !existingCourseIds.has(c.course_id));
    
    await base44.entities.Company.update(company_id, {
      company_courses: [...currentCourses, ...coursesToAdd]
    });

    return Response.json({
      success: true,
      message: `${coursesToAdd.length} curso(s) adicionado(s) com sucesso`,
      added: coursesToAdd.length,
      skipped: newCourses.length - coursesToAdd.length,
      results: results
    });

  } catch (error) {
    console.error('Erro ao processar cursos em massa:', error);
    return Response.json({ 
      error: error.message || 'Erro ao processar cursos em massa' 
    }, { status: 500 });
  }
});