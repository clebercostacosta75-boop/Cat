import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, User, MapPin, CreditCard, GraduationCap, Sparkles } from "lucide-react";
import { createPageUrl } from "@/utils";
import InstructorForm from "@/components/instructor/InstructorForm";
import FormationsList from "@/components/instructor/FormationsList";
import DocumentsManager from "@/components/instructor/DocumentsManager";
import ProfessionalProfile from "@/components/instructor/ProfessionalProfile";

export default function InstructorDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);

  const { data: instructor, isLoading } = useQuery({
    queryKey: ['instructor', id],
    queryFn: async () => {
      const instructors = await base44.entities.Instructor.filter({ id });
      return instructors[0];
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Instructor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor', id] });
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
      alert('Instrutor atualizado com sucesso!');
    },
  });

  const handleSave = () => {
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const handleChange = (updates) => {
    setFormData(prev => ({
      ...(prev || instructor),
      ...updates
    }));
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-stone-600">Carregando...</p>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="p-8">
        <p className="text-stone-600">Instrutor não encontrado</p>
        <Link to={createPageUrl("Instructors")}>
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    );
  }

  const currentData = formData || instructor;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Instructors")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-stone-900">{instructor.name}</h1>
              <p className="text-stone-600">{instructor.specialty || 'Instrutor'}</p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!formData || updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        <Card className="border-none shadow-xl">
          <CardContent className="p-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">Dados Básicos</span>
                </TabsTrigger>
                <TabsTrigger value="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="hidden md:inline">Endereço</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden md:inline">Financeiro</span>
                </TabsTrigger>
                <TabsTrigger value="qualifications" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span className="hidden md:inline">Qualificações</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden md:inline">Perfil IA</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <InstructorForm 
                  instructor={currentData}
                  onChange={handleChange}
                  section="basic"
                />
              </TabsContent>

              <TabsContent value="address">
                <InstructorForm 
                  instructor={currentData}
                  onChange={handleChange}
                  section="address"
                />
              </TabsContent>

              <TabsContent value="financial">
                <InstructorForm 
                  instructor={currentData}
                  onChange={handleChange}
                  section="financial"
                />
              </TabsContent>

              <TabsContent value="qualifications" className="space-y-6">
                <FormationsList 
                  formations={currentData.formations || []}
                  onChange={(formations) => handleChange({ formations })}
                />
                
                <DocumentsManager 
                  documents={currentData.documents || []}
                  onChange={(documents) => handleChange({ documents })}
                  instructorId={id}
                />
              </TabsContent>

              <TabsContent value="profile">
                <ProfessionalProfile 
                  instructor={currentData}
                  onUpdate={(professional_profile) => handleChange({ professional_profile })}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}