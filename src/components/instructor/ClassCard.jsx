import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClassCard({ classItem }) {
  const navigate = useNavigate();

  const handleOpenDiario = () => {
    navigate(createPageUrl(`ClassDetails?id=${classItem.id}`));
  };

  const statusColors = {
    'Agendado': 'bg-blue-100 text-blue-800 border-blue-200',
    'Em Andamento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Concluído': 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-base">{classItem.training_name}</h4>
          <p className="text-xs text-gray-600 mt-1">{classItem.company_name}</p>
        </div>
        <Badge variant="outline" className={`${statusColors[classItem.status]} text-xs`}>
          {classItem.status}
        </Badge>
      </div>

      <div className="space-y-2 mb-3">
        {classItem.location && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3 h-3" />
            <span>{classItem.location}</span>
          </div>
        )}
        
        {classItem.start_date && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{classItem.start_date} {classItem.end_date ? `a ${classItem.end_date}` : ''}</span>
          </div>
        )}

        {classItem.students_count && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            <span>{classItem.students_count} alunos</span>
          </div>
        )}

        {classItem.training_schedule && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>🕐 {classItem.training_schedule}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handleOpenDiario}
          className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Lançar Presença
        </Button>
      </div>
    </div>
  );
}