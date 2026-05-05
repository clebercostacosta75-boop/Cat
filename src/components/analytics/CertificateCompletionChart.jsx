import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CertificateCompletionChart({ certificates = [], enrollments = [] }) {
  const data = useMemo(() => {
    const total = enrollments.length;
    const completed = certificates.filter(c => c.status === 'signed').length;
    const pending = enrollments.filter(e => e.status === 'Aguardando Autorização').length;
    const approved = enrollments.filter(e => e.status === 'Autorizado').length;

    return [
      { status: 'Completos', count: completed, fill: '#059669' },
      { status: 'Em Autorização', count: approved, fill: '#3b82f6' },
      { status: 'Pendentes', count: pending, fill: '#f59e0b' }
    ];
  }, [certificates, enrollments]);

  return (
    <Card className="border border-gray-200">
      <CardHeader><CardTitle>Taxa de Conclusão de Certificados</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}