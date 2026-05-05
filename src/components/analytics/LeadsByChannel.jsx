import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = {
  Instagram: '#E4405F',
  Facebook: '#1877F2',
  WhatsApp: '#25D366',
  LinkedIn: '#0A66C2',
  TikTok: '#000000',
  Site: '#3B82F6',
  Email: '#8B5CF6',
  Telefone: '#6B7280',
  Outro: '#9CA3AF',
  Indicação: '#10B981'
};

export default function LeadsByChannel({ leads = [] }) {
  const data = useMemo(() => {
    const channels = {};

    leads.forEach(lead => {
      const channel = lead.origin_channel || 'Outro';
      channels[channel] = (channels[channel] || 0) + 1;
    });

    return Object.entries(channels)
      .map(([channel, count]) => ({ name: channel, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  return (
    <Card className="border border-gray-200">
      <CardHeader><CardTitle>Leads por Canal de Origem</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#CCCCCC'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}