import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, PlayCircle, FileText, Edit2, Trash2, GripVertical, Clock, Layers } from "lucide-react";
import { toast } from "sonner";

const EMPTY_MODULE = { name: "", description: "", order: 1 };
const EMPTY_LESSON = {
  module_id: "", title: "", description: "", video_provider: "youtube",
  video_url: "", duration_minutes: "", material_url: "", order: 1, obrigatoria: true,
};

function embedUrl(provider, url) {
  if (!url) return "";
  if (provider === "youtube") {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  if (provider === "vimeo") {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : url;
  }
  return url;
}

export default function ModulosAulasTab({ course }) {
  const queryClient = useQueryClient();
  const [moduleForm, setModuleForm] = useState(null); // null = fechado, {} = novo, obj = editando
  const [lessonForm, setLessonForm] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);

  const { data: modules = [] } = useQuery({
    queryKey: ["courseModules", course.id],
    queryFn: () => base44.entities.CourseModule.filter({ course_id: course.id }, "order"),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", course.id],
    queryFn: () => base44.entities.Lesson.filter({ course_id: course.id }, "order"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["courseModules", course.id] });
    queryClient.invalidateQueries({ queryKey: ["lessons", course.id] });
  };

  const saveModule = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.CourseModule.update(data.id, data)
      : base44.entities.CourseModule.create({ ...data, course_id: course.id, course_name: course.name }),
    onSuccess: () => { invalidate(); setModuleForm(null); toast.success("Módulo salvo!"); },
    onError: (e) => toast.error("Erro ao salvar módulo: " + e.message),
  });

  const deleteModule = useMutation({
    mutationFn: (id) => base44.entities.CourseModule.delete(id),
    onSuccess: () => { invalidate(); toast.success("Módulo excluído."); },
  });

  const saveLesson = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.Lesson.update(data.id, data)
      : base44.entities.Lesson.create({ ...data, course_id: course.id, course_name: course.name }),
    onSuccess: () => { invalidate(); setLessonForm(null); toast.success("Aula salva!"); },
    onError: (e) => toast.error("Erro ao salvar aula: " + e.message),
  });

  const deleteLesson = useMutation({
    mutationFn: (id) => base44.entities.Lesson.delete(id),
    onSuccess: () => { invalidate(); toast.success("Aula excluída."); },
  });

  const lessonsOf = (moduleId) =>
    lessons.filter((l) => l.module_id === moduleId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const lessonsSemModulo = lessons.filter((l) => !l.module_id).sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {modules.length} módulo(s) · {lessons.length} aula(s) cadastradas para <strong>{course.name}</strong>
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setModuleForm({ ...EMPTY_MODULE, order: modules.length + 1 })}>
            <Plus className="w-4 h-4 mr-1" /> Novo Módulo
          </Button>
          <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setLessonForm({ ...EMPTY_LESSON, order: lessons.length + 1 })}>
            <Plus className="w-4 h-4 mr-1" /> Nova Aula
          </Button>
        </div>
      </div>

      {modules.length === 0 && lessons.length === 0 && (
        <Card><CardContent className="p-10 text-center text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          Nenhum módulo ou aula cadastrada ainda. Comece criando um módulo.
        </CardContent></Card>
      )}

      {modules.sort((a, b) => (a.order || 0) - (b.order || 0)).map((mod) => (
        <Card key={mod.id} className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{mod.name}</p>
                  {mod.description && <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setModuleForm(mod)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteModule.mutate(mod.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            <div className="mt-3 pl-6 space-y-2">
              {lessonsOf(mod.id).map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} onEdit={() => setLessonForm(lesson)} onDelete={() => deleteLesson.mutate(lesson.id)} onPreview={() => setPreviewLesson(lesson)} />
              ))}
              <Button size="sm" variant="ghost" className="text-xs text-gray-500 h-7" onClick={() => setLessonForm({ ...EMPTY_LESSON, module_id: mod.id, order: lessonsOf(mod.id).length + 1 })}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar aula neste módulo
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {lessonsSemModulo.length > 0 && (
        <Card className="border-dashed border-gray-300">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Aulas sem módulo</p>
            <div className="space-y-2">
              {lessonsSemModulo.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} onEdit={() => setLessonForm(lesson)} onDelete={() => deleteLesson.mutate(lesson.id)} onPreview={() => setPreviewLesson(lesson)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Módulo */}
      <Dialog open={!!moduleForm} onOpenChange={(o) => !o && setModuleForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{moduleForm?.id ? "Editar Módulo" : "Novo Módulo"}</DialogTitle></DialogHeader>
          {moduleForm && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={moduleForm.name} onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })} placeholder="Ex: Módulo 1 - Introdução" /></div>
              <div><Label>Descrição</Label><Textarea rows={3} value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} /></div>
              <div><Label>Ordem</Label><Input type="number" value={moduleForm.order} onChange={(e) => setModuleForm({ ...moduleForm, order: Number(e.target.value) })} /></div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setModuleForm(null)}>Cancelar</Button>
                <Button className="bg-gray-900 hover:bg-gray-800" disabled={!moduleForm.name} onClick={() => saveModule.mutate(moduleForm)}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Aula */}
      <Dialog open={!!lessonForm} onOpenChange={(o) => !o && setLessonForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lessonForm?.id ? "Editar Aula" : "Nova Vídeo Aula"}</DialogTitle></DialogHeader>
          {lessonForm && (
            <div className="space-y-3">
              <div><Label>Módulo</Label>
                <Select value={lessonForm.module_id || "none"} onValueChange={(v) => setLessonForm({ ...lessonForm, module_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sem módulo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem módulo</SelectItem>
                    {modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Título *</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Ex: Aula 1 - Riscos elétricos" /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provedor do Vídeo</Label>
                  <Select value={lessonForm.video_provider} onValueChange={(v) => setLessonForm({ ...lessonForm, video_provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="upload">Upload / arquivo</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Duração (min)</Label><Input type="number" value={lessonForm.duration_minutes} onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: Number(e.target.value) })} /></div>
              </div>
              <div><Label>URL do Vídeo *</Label><Input value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Material de Apoio (URL do PDF, opcional)</Label><Input value={lessonForm.material_url} onChange={(e) => setLessonForm({ ...lessonForm, material_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div><Label>Ordem</Label><Input type="number" value={lessonForm.order} onChange={(e) => setLessonForm({ ...lessonForm, order: Number(e.target.value) })} /></div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox checked={lessonForm.obrigatoria} onCheckedChange={(v) => setLessonForm({ ...lessonForm, obrigatoria: !!v })} id="obrigatoria" />
                  <Label htmlFor="obrigatoria" className="!mt-0">Aula obrigatória</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setLessonForm(null)}>Cancelar</Button>
                <Button className="bg-gray-900 hover:bg-gray-800" disabled={!lessonForm.title || !lessonForm.video_url} onClick={() => saveLesson.mutate(lessonForm)}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewLesson} onOpenChange={(o) => !o && setPreviewLesson(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{previewLesson?.title}</DialogTitle></DialogHeader>
          {previewLesson && (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={embedUrl(previewLesson.video_provider, previewLesson.video_url)}
                className="w-full h-full" allowFullScreen title={previewLesson.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonRow({ lesson, onEdit, onDelete, onPreview }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
      <button onClick={onPreview} className="flex items-center gap-2 text-left flex-1 min-w-0">
        <PlayCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm text-gray-800 truncate">{lesson.title}</span>
        {lesson.duration_minutes ? (
          <span className="flex items-center gap-0.5 text-xs text-gray-400 flex-shrink-0"><Clock className="w-3 h-3" />{lesson.duration_minutes}min</span>
        ) : null}
        {lesson.material_url && <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        {!lesson.obrigatoria && <Badge variant="outline" className="text-[10px]">Opcional</Badge>}
      </button>
      <div className="flex gap-1 flex-shrink-0">
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Edit2 className="w-3 h-3" /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}
