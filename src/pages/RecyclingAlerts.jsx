import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertOctagon, Clock, Send, Loader2 } from "lucide-react";
import { logAction } from "@/components/audit/AuditLogger";

export default function RecyclingAlertsPage() {
  const { data: completedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['completedClasses'],
    queryFn: async () => {
      const allClasses = await base44.entities.ClassSchedule.list();
      return allClasses.filter(c => c.status === 'Concluído');
    },
    initialData: [],
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  // Função para verificar status de reciclagem
  const checkRecyclableStatus = (dataRealizacao, validadeMeses) => {
    const hoje = new Date();
    const dataVencimento = new Date(dataRealizacao);
    dataVencimento.setMonth(dataVencimento.getMonth() + validadeMeses);

    const diffTime = dataVencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { status: "VENCIDO", color: "text-red-600", icon: "AlertOctagon", dias: diffDays };
    if (diffDays <= 30) return { status: "RECICLAGEM PRÓXIMA", color: "text-orange-500", icon: "Clock", dias: diffDays };
    return { status: "VÁLIDO", color: "text-green-600", icon: "CheckCircle", dias: diffDays };
  };

  // Calcular treinamentos para reciclagem
  const recyclableTrainings = React.useMemo(() => {
    const expired = [];
    const expiring = [];
    
    completedClasses.forEach(classItem => {
      const course = courses.find(c => c.name === classItem.training_name);
      if (!course || !course.validity || !classItem.end_date) return;
      
      const validityMonths = parseInt(course.validity);
      if (isNaN(validityMonths)) return;
      
      const recycleStatus = checkRecyclableStatus(classItem.end_date, validityMonths);
      
      const item = {
        id: classItem.id,
        aluno_nome: classItem.company_name,
        curso_nome: classItem.training_name,
        dias_restantes: Math.abs(recycleStatus.dias),
        end_date: classItem.end_date,
        company_id: classItem.company_id,
        status: recycleStatus.status
      };
      
      if (recycleStatus.status === "VENCIDO") {
        expired.push(item);
      } else if (recycleStatus.status === "RECICLAGEM PRÓXIMA") {
        expiring.push(item);
      }
    });
    
    return {
      expired: expired.sort((a, b) => b.dias_restantes - a.dias_restantes),
      expiring: expiring.sort((a, b) => a.dias_restantes - b.dias_restantes),
      total: expired.length + expiring.length
    };
  }, [completedClasses, courses]);

  const handleNotifyRecycle = async (item) => {
    try {
      const companies = await base44.entities.Company.list();
      const company = companies.find(c => 
        c.nome_fantasia === item.aluno_nome || 
        c.razao_social === item.aluno_nome ||
        c.id === item.company_id
      );

      if (!company || !company.contacts || company.contacts.length === 0) {
        alert('Empresa não possui contatos cadastrados');
        return;
      }

      const contact = company.contacts.find(c => c.is_whatsapp && c.phone);
      
      if (!contact) {
        alert('Empresa não possui contato com WhatsApp cadastrado');
        return;
      }

      const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
      if (!phoneRegex.test(contact.phone)) {
        alert('Telefone do contato está em formato inválido');
        return;
      }

      const dataVencimento = new Date(item.end_date);
      dataVencimento.setMonth(dataVencimento.getMonth() + parseInt(courses.find(c => c.name === item.curso_nome)?.validity || 12));
      const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');

      const mensagem = `Olá ${contact.name || company.nome_fantasia}, o treinamento de *${item.curso_nome}* da empresa *${item.aluno_nome}* vence em ${dataFormatada} (${item.dias_restantes} dias). Favor agendar a reciclagem com a coordenação.`;
      
      const phoneClean = contact.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(mensagem)}`;
      
      window.open(whatsappUrl, '_blank');
      
      await logAction(
        "ENVIO_WHATSAPP",
        "ClassSchedule",
        item.id,
        `Reciclagem: ${item.curso_nome}`,
        { 
          empresa: item.aluno_nome,
          dias_restantes: item.dias_restantes,
          contato: contact.name,
          telefone: contact.phone,
          status: 'Sucesso'
        }
      );
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      
      await logAction(
        "ENVIO_WHATSAPP",
        "ClassSchedule",
        item.id || '',
        `Reciclagem: ${item.curso_nome}`,
        { 
          empresa: item.aluno_nome,
          status: 'Falha',
          erro: error.message
        }
      );
      
      alert('Erro ao enviar notificação: ' + error.message);
    }
  };

  if (loadingClasses) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Alertas de Reciclagem
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Mantenha os treinamentos de Alubar e Unitapajós atualizados
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <Bell className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-black">{recyclableTrainings.total}</p>
              <p className="text-sm text-gray-600">Total Pendentes</p>
            </CardContent>
          </Card>

          <Card className="border border-red-200">
            <CardContent className="p-4">
              <AlertOctagon className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">{recyclableTrainings.expired.length}</p>
              <p className="text-sm text-gray-600">Vencidos (URGENTE)</p>
            </CardContent>
          </Card>

          <Card className="border border-orange-200">
            <CardContent className="p-4">
              <Clock className="w-6 h-6 text-orange-600 mb-2" />
              <p className="text-2xl font-bold text-orange-600">{recyclableTrainings.expiring.length}</p>
              <p className="text-sm text-gray-600">Próximos 30 Dias</p>
            </CardContent>
          </Card>
        </div>

        {recyclableTrainings.total === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-black mb-2">Nenhuma reciclagem pendente</h3>
              <p className="text-gray-600">Todos os treinamentos estão atualizados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Vencidos - URGENTE */}
            {recyclableTrainings.expired.length > 0 && (
              <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-red-900 flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5" />
                    URGENTE - Treinamentos Vencidos ({recyclableTrainings.expired.length})
                  </CardTitle>
                  <p className="text-xs text-red-700 mt-1">
                    Estes treinamentos já venceram e precisam ser reciclados imediatamente
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recyclableTrainings.expired.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-red-300 shadow-sm">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{item.aluno_nome}</p>
                        <p className="text-xs text-gray-600">{item.curso_nome}</p>
                      </div>
                      <Badge className="text-xs bg-red-100 text-red-800 border border-red-300 mr-3">
                        Vencido há {item.dias_restantes} dias
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleNotifyRecycle(item)} 
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Notificar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Próximos de Vencer */}
            {recyclableTrainings.expiring.length > 0 && (
              <Card className="border border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-orange-900 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Vencem nos Próximos 30 Dias ({recyclableTrainings.expiring.length})
                  </CardTitle>
                  <p className="text-xs text-orange-700 mt-1">
                    Programe as reciclagens para evitar que estes treinamentos vençam
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recyclableTrainings.expiring.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-lg border border-orange-200 shadow-sm">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.aluno_nome}</p>
                        <p className="text-xs text-gray-500">{item.curso_nome}</p>
                      </div>
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300 mr-3">
                        {item.dias_restantes} dias
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleNotifyRecycle(item)}
                        className="border-orange-300 hover:bg-orange-50"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Notificar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}