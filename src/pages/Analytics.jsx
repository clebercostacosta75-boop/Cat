import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, DollarSign, Award, Users } from 'lucide-react';
import CashFlowChart from '@/components/analytics/CashFlowChart';
import CertificateCompletionChart from '@/components/analytics/CertificateCompletionChart';
import InstructorPerformance from '@/components/analytics/InstructorPerformance';
import LeadsByChannel from '@/components/analytics/LeadsByChannel';

export default function Analytics() {
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['charges'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('asaasCobranca', { action: 'listCharges', customerId: 'all' });
        return res.data.charges || [];
      } catch {
        return [];
      }
    },
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list('-created_date'),
    initialData: [],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.StudentCourseEnrollment.list('-created_date'),
    initialData: [],
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list('-created_date'),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const metrics = React.useMemo(() => {
    const receivedCharges = charges.filter(c => c.status === 'RECEIVED' || c.status === 'CONFIRMED');
    const totalRevenue = receivedCharges.reduce((sum, c) => sum + parseFloat(c.value || 0), 0);
    const completedCerts = certificates.filter(c => c.status === 'signed').length;

    return {
      totalRevenue: totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      completedCerts,
      totalLeads: leads.length,
      activeClasses: classSchedules.filter(c => c.status === 'Em Andamento').length,
    };
  }, [charges, certificates, leads, classSchedules]);

  const isLoading = chargesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Relatórios</h1>
          <p className="text-gray-600">Visualize métricas em tempo real do seu negócio</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-gray-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {metrics.totalRevenue}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Certificados</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.completedCerts}</p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalLeads}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Turmas Ativas</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.activeClasses}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashFlowChart charges={charges} enrollments={enrollments} />
          <CertificateCompletionChart certificates={certificates} enrollments={enrollments} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InstructorPerformance classSchedules={classSchedules} />
          <LeadsByChannel leads={leads} />
        </div>
      </div>
    </div>
  );
}