import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function InstructorPerformance({ classSchedules = [] }) {
  const data = useMemo(() => {
    const instructors = {};

    classSchedules.forEach(cs => {
      if (cs.instructor_name) {
        if (!instructors[cs.instructor_name]) {
          instructors[cs.instructor_name] = { name: cs.instructor_name, turmas: 0, alunos: 0 };
        }
        instructors[cs.instructor_name].turmas += 1;
        instructors[cs.instructor_name].alunos += cs.students_count || 0;
      }
    });

    return Object.values(instructors).sort((a, b) => b.alunos - a.alunos).slice(0, 8);
  }, [classSchedules]);

  return (
    <Card className="border border-gray-200">
      <CardHeader><CardTitle>Performance de Instrutores (Top 8)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="alunos" fill="#8b5cf6" name="Alunos" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}