import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FormationsList({ formations, onChange }) {
  const [adding, setAdding] = useState(false);
  const [newFormation, setNewFormation] = useState({
    category: 'Curso Profissionalizante',
    title: '',
    institution: '',
    year: '',
    description: ''
  });

  const categories = [
    'Curso Profissionalizante',
    'Treinamento Normativo',
    'Nível Técnico',
    'Graduação',
    'Pós-Graduação',
    'Mestrado',
    'Doutorado'
  ];

  const categoryColors = {
    'Curso Profissionalizante': 'bg-blue-100 text-blue-800',
    'Treinamento Normativo': 'bg-yellow-100 text-yellow-800',
    'Nível Técnico': 'bg-cyan-100 text-cyan-800',
    'Graduação': 'bg-green-100 text-green-800',
    'Pós-Graduação': 'bg-purple-100 text-purple-800',
    'Mestrado': 'bg-pink-100 text-pink-800',
    'Doutorado': 'bg-red-100 text-red-800'
  };

  const handleAdd = () => {
    if (!newFormation.title) {
      alert('Digite o título da formação');
      return;
    }
    onChange([...formations, newFormation]);
    setNewFormation({
      category: 'Curso Profissionalizante',
      title: '',
      institution: '',
      year: '',
      description: ''
    });
    setAdding(false);
  };

  const handleRemove = (index) => {
    onChange(formations.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Formação e Habilidades Profissionais
          </h3>
          {!adding && (
            <Button onClick={() => setAdding(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Formação
            </Button>
          )}
        </div>

        {/* FORMULÁRIO ADICIONAR */}
        {adding && (
          <Card className="mb-4 bg-stone-50">
            <CardContent className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select 
                    value={newFormation.category} 
                    onValueChange={(value) => setNewFormation({...newFormation, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título/Nome *</Label>
                  <Input
                    value={newFormation.title}
                    onChange={(e) => setNewFormation({...newFormation, title: e.target.value})}
                    placeholder="Ex: NR-35, Engenharia de Segurança"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instituição</Label>
                  <Input
                    value={newFormation.institution}
                    onChange={(e) => setNewFormation({...newFormation, institution: e.target.value})}
                    placeholder="Nome da instituição"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ano de Conclusão</Label>
                  <Input
                    value={newFormation.year}
                    onChange={(e) => setNewFormation({...newFormation, year: e.target.value})}
                    placeholder="2024"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newFormation.description}
                    onChange={(e) => setNewFormation({...newFormation, description: e.target.value})}
                    placeholder="Informações adicionais sobre a formação"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setAdding(false)} variant="outline" size="sm">
                  Cancelar
                </Button>
                <Button onClick={handleAdd} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* LISTA DE FORMAÇÕES */}
        <div className="space-y-3">
          {formations.map((formation, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={categoryColors[formation.category]}>
                        {formation.category}
                      </Badge>
                      {formation.year && (
                        <span className="text-xs text-stone-500">• {formation.year}</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-stone-900 mb-1">{formation.title}</h4>
                    {formation.institution && (
                      <p className="text-sm text-stone-600 mb-1">
                        📍 {formation.institution}
                      </p>
                    )}
                    {formation.description && (
                      <p className="text-sm text-stone-600 mt-2">{formation.description}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleRemove(index)}
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {formations.length === 0 && !adding && (
            <div className="text-center py-12 text-stone-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p>Nenhuma formação cadastrada</p>
              <p className="text-sm mt-1">Clique em "Adicionar Formação" para começar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}