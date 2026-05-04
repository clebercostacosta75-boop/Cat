import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, BookOpen, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import ClassCard from "@/components/instructor/ClassCard";

export default function DashboardInstrutor() {
  const { user } = useUserRole();

  const { data: instructorData, isLoading: loadingInstructor } = useQuery({
    queryKey: ["instructor-me", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const list = await base44.entities.Instructor.filter({ email: user.email });
      return list[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: myClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["instructorClasses", instructorData?.id],
    queryFn: async () => {
      if (!instructorData?.id) return [];
      const all = await base44.entities.ClassSchedule.filter({ instructor_id: instructorData.id });
      return all.sort((a, b) => (a.start_date > b.start_date ? 1 : -1));
    },
    enabled: !!instructorData?.id,
    initialData: [],
  });

  const upcomingClasses = myClasses.filter(c => c.status === "Agendado" || c.status === "Em Andamento");
  const completedClasses = myClasses.filter(c => c.status === "Concluído");

  if (loadingInstructor || loadingClasses) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Treinamentos</h1>
          <p className="text-gray-500 text-sm mt-1">Olá, {instructorData?.name || user?.full_name || "Instrutor"}!</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <Calendar className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{upcomingClasses.length}</p>
              <p className="text-sm text-gray-600">Próximos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <CheckCircle className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{completedClasses.length}</p>
              <p className="text-sm text-gray-600">Concluídos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <BookOpen className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{myClasses.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>
        </div>

        {upcomingClasses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Próximos Treinamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingClasses.map(c => <ClassCard key={c.id} classItem={c} />)}
            </CardContent>
          </Card>
        )}

        {completedClasses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Treinamentos Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedClasses.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{c.training_name}</p>
                      <p className="text-sm text-gray-600">{c.company_name} • {c.start_date}</p>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800 border border-gray-300">Concluído</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {myClasses.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Nenhum treinamento agendado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}