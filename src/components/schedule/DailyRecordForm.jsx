import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DailyRecordForm({ record, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    specific_date: "",
    schedule_time: "",
    instructor_name: "",
    lunch_cost: 0,
    transport_cost: 0,
    coffee_break_cost: 0,
    taxi_cost: 0,
    hp_cost: 0,
    notes: "",
    ...record
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
    initialData: [],
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const totalCost = 
    (parseFloat(formData.lunch_cost) || 0) + 
    (parseFloat(formData.transport_cost) || 0) + 
    (parseFloat(formData.coffee_break_cost) || 0) + 
    (parseFloat(formData.taxi_cost) || 0) + 
    (parseFloat(formData.hp_cost) || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specific_date">Data Específica *</Label>
          <Input
            id="specific_date"
            type="date"
            value={formData.specific_date}
            onChange={(e) => handleChange('specific_date', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule_time">Horário</Label>
          <Input
            id="schedule_time"
            value={formData.schedule_time}
            onChange={(e) => handleChange('schedule_time', e.target.value)}
            placeholder="Ex: 07:00 às 15:00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instrutor *</Label>
          <Select 
            value={formData.instructor_name} 
            onValueChange={(value) => handleChange('instructor_name', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o instrutor" />
            </SelectTrigger>
            <SelectContent>
              {instructors.map(instructor => (
                <SelectItem key={instructor.id} value={instructor.name}>
                  {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-stone-900 mb-3">Custos Operacionais (R$)</h4>
        <div className="grid md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lunch_cost">Almoço</Label>
            <Input
              id="lunch_cost"
              type="number"
              step="0.01"
              value={formData.lunch_cost}
              onChange={(e) => handleChange('lunch_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transport_cost">Transporte</Label>
            <Input
              id="transport_cost"
              type="number"
              step="0.01"
              value={formData.transport_cost}
              onChange={(e) => handleChange('transport_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coffee_break_cost">Coffee Break</Label>
            <Input
              id="coffee_break_cost"
              type="number"
              step="0.01"
              value={formData.coffee_break_cost}
              onChange={(e) => handleChange('coffee_break_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxi_cost">Taxi</Label>
            <Input
              id="taxi_cost"
              type="number"
              step="0.01"
              value={formData.taxi_cost}
              onChange={(e) => handleChange('taxi_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hp_cost">Custo HP</Label>
            <Input
              id="hp_cost"
              type="number"
              step="0.01"
              value={formData.hp_cost}
              onChange={(e) => handleChange('hp_cost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
          <p className="text-sm text-stone-600">Total do Dia</p>
          <p className="text-xl font-bold text-emerald-600">
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Observações sobre este dia"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {record ? 'Atualizar' : 'Adicionar'} Lançamento
        </Button>
      </div>
    </form>
  );
}