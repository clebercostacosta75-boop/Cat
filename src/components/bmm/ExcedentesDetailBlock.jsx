import React from "react";

export default function ExcedentesDetailBlock({ classes, additionalItems }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Agrupar excedentes por turma
  const excedentesPorTurma = {};

  for (const item of additionalItems) {
    if (item.type === 'excedente_alunos') {
      const classItem = classes.find(c => c.id === item.class_id);
      const trainingName = classItem?.training_name || 'Treinamento desconhecido';
      
      if (!excedentesPorTurma[trainingName]) {
        excedentesPorTurma[trainingName] = {
          limiteContratado: item.limite_contratado,
          participantesRealizados: item.participantes_realizados,
          valorTurmFechada: item.valor_turma_fechada,
          quantidadeExcedentes: item.quantity,
          valorUnitarioExcedente: item.unit_value,
          valorTotalExcedente: item.total_value,
          servicosExcedentes: {},
          classId: item.class_id,
        };
      }
    }
  }

  // Agregar serviços excedentes
  for (const item of additionalItems) {
    if (item.type !== 'excedente_alunos' && item.parent_excedente_id) {
      const classItem = classes.find(c => c.id === item.parent_excedente_id);
      const trainingName = classItem?.training_name || 'Treinamento desconhecido';
      
      if (excedentesPorTurma[trainingName]) {
        const serviceLabel = item.type === 'coffee_break_morning' ? 'Coffee Break Manhã' :
                            item.type === 'coffee_break_afternoon' ? 'Coffee Break Tarde' : 'Almoço';
        
        excedentesPorTurma[trainingName].servicosExcedentes[serviceLabel] = {
          unitValue: item.unit_value,
          quantity: item.quantity,
          totalValue: item.total_value,
        };
      }
    }
  }

  const temExcedentes = Object.keys(excedentesPorTurma).length > 0;

  if (!temExcedentes) return null;

  return (
    <div className="bg-orange-50 rounded-lg p-6 mb-6 border border-orange-200">
      <h2 className="text-lg font-bold text-orange-900 mb-4">DETALHAMENTO DE EXCEDENTES</h2>
      
      <div className="space-y-6 text-sm text-stone-700">
        {Object.entries(excedentesPorTurma).map(([trainingName, dados], idx) => (
          <div key={idx} className="space-y-3 p-4 bg-white rounded border border-orange-100">
            <p className="font-semibold text-stone-900">
              {trainingName}
            </p>
            
            <p className="text-justify leading-relaxed">
              A turma contratada contempla até <strong>{dados.limiteContratado}</strong> participantes.
            </p>

            <p className="text-justify leading-relaxed">
              Como o treinamento foi realizado com <strong>{dados.participantesRealizados}</strong> participantes, 
              foram identificados <strong>{dados.quantidadeExcedentes}</strong> participante(s) excedente(s), 
              os quais foram faturados conforme a regra comercial vigente da contratante.
            </p>

            {/* Itens excedentes */}
            <div className="space-y-2 mt-4 pt-4 border-t border-orange-100">
              {/* Participantes Excedentes */}
              <div className="flex justify-between text-sm">
                <span><strong>Participantes Excedentes:</strong></span>
                <span>
                  {dados.quantidadeExcedentes} × {formatCurrency(dados.valorUnitarioExcedente)} = <strong>{formatCurrency(dados.valorTotalExcedente)}</strong>
                </span>
              </div>

              {/* Serviços Excedentes */}
              {Object.entries(dados.servicosExcedentes).map(([serviceName, svc], svcIdx) => (
                <div key={svcIdx} className="flex justify-between text-sm">
                  <span><strong>{serviceName} Excedente:</strong></span>
                  <span>
                    {svc.quantity} × {formatCurrency(svc.unitValue)} = <strong>{formatCurrency(svc.totalValue)}</strong>
                  </span>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            {Object.keys(dados.servicosExcedentes).length > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-orange-100">
                <span><strong>Subtotal dos Excedentes:</strong></span>
                <span className="font-bold text-orange-700">
                  {formatCurrency(
                    dados.valorTotalExcedente + 
                    Object.values(dados.servicosExcedentes).reduce((sum, s) => sum + s.totalValue, 0)
                  )}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}