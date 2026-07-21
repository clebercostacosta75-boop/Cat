import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, PlayCircle, ClipboardList } from "lucide-react";
import ModulosAulasTab from "@/components/conteudo/ModulosAulasTab";
import ProvasTab from "@/components/conteudo/ProvasTab";

export default function GestaoConteudoCurso() {
  const [courseId, setCourseId] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-conteudo"],
    queryFn: () => base44.entities.Course.list("name", 1000),
  });

  const course = courses.find((c) => c.id === courseId);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <PlayCircle className="w-7 h-7 text-blue-600" /> Conteúdo Pedagógico do Curso
        </h1>
        <p className="text-gray-500 mt-1">Cadastre vídeo aulas e provas para cada curso.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Selecione o curso</label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Escolha um curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!course && (
        <Card><CardContent className="p-12 text-center text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          Selecione um curso acima para gerenciar suas aulas e provas.
        </CardContent></Card>
      )}

      {course && (
        <Tabs defaultValue="aulas">
          <TabsList>
            <TabsTrigger value="aulas"><PlayCircle className="w-4 h-4 mr-1.5" />Módulos e Aulas</TabsTrigger>
            <TabsTrigger value="provas"><ClipboardList className="w-4 h-4 mr-1.5" />Provas</TabsTrigger>
          </TabsList>
          <TabsContent value="aulas" className="mt-4">
            <ModulosAulasTab course={course} />
          </TabsContent>
          <TabsContent value="provas" className="mt-4">
            <ProvasTab course={course} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
