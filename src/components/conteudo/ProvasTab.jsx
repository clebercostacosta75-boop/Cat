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
import { Plus, ClipboardList, Edit2, Trash2, ListChecks, Target } from "lucide-react";
import { toast } from "sonner";

const EMPTY_QUIZ = {
  title: "", description: "", tipo: "Prova Final", passing_score: 70,
  time_limit_minutes: "", max_attempts: 3, shuffle_questions: true, status: "Rascunho",
};

export default function ProvasTab({ course }) {
  const queryClient = useQueryClient();
  const [quizForm, setQuizForm] = useState(null);
  const [managingQuiz, setManagingQuiz] = useState(null);

  const { data: quizzes = [] } = useQuery({
    queryKey: ["quizzes", course.id],
    queryFn: () => base44.entities.Quiz.filter({ course_id: course.id }, "-created_date"),
  });

  const saveQuiz = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.Quiz.update(data.id, data)
      : base44.entities.Quiz.create({ ...data, course_id: course.id, course_name: course.name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quizzes", course.id] }); setQuizForm(null); toast.success("Prova salva!"); },
    onError: (e) => toast.error("Erro ao salvar prova: " + e.message),
  });

  const deleteQuiz = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quizzes", course.id] }); toast.success("Prova excluída."); },
  });

  const STATUS_COLOR = { Rascunho: "bg-gray-100 text-gray-600", Publicada: "bg-green-100 text-green-700", Inativa: "bg-red-100 text-red-600" };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{quizzes.length} prova(s) cadastradas para <strong>{course.name}</strong></p>
        <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setQuizForm({ ...EMPTY_QUIZ })}>
          <Plus className="w-4 h-4 mr-1" /> Nova Prova
        </Button>
      </div>

      {quizzes.length === 0 && (
        <Card><CardContent className="p-10 text-center text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          Nenhuma prova cadastrada ainda.
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{quiz.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{quiz.tipo}</p>
                </div>
                <Badge className={STATUS_COLOR[quiz.status]}>{quiz.status}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />Nota mín. {quiz.passing_score}%</span>
                <span>{quiz.max_attempts} tentativa(s)</span>
                {quiz.time_limit_minutes ? <span>{quiz.time_limit_minutes}min</span> : null}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setManagingQuiz(quiz)}>
                  <ListChecks className="w-3.5 h-3.5 mr-1" /> Questões
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQuizForm(quiz)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteQuiz.mutate(quiz.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Prova */}
      <Dialog open={!!quizForm} onOpenChange={(o) => !o && setQuizForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{quizForm?.id ? "Editar Prova" : "Nova Prova"}</DialogTitle></DialogHeader>
          {quizForm && (
            <div className="space-y-3">
              <div><Label>Título *</Label><Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="Ex: Avaliação Final - NR 10" /></div>
              <div><Label>Descrição / Instruções</Label><Textarea rows={2} value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <Select value={quizForm.tipo} onValueChange={(v) => setQuizForm({ ...quizForm, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prova Final">Prova Final</SelectItem>
                      <SelectItem value="Avaliação de Módulo">Avaliação de Módulo</SelectItem>
                      <SelectItem value="Simulado">Simulado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={quizForm.status} onValueChange={(v) => setQuizForm({ ...quizForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rascunho">Rascunho</SelectItem>
                      <SelectItem value="Publicada">Publicada</SelectItem>
                      <SelectItem value="Inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Nota mín. (%)</Label><Input type="number" value={quizForm.passing_score} onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number(e.target.value) })} /></div>
                <div><Label>Tempo limite (min)</Label><Input type="number" value={quizForm.time_limit_minutes} onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value ? Number(e.target.value) : "" })} placeholder="Sem limite" /></div>
                <div><Label>Máx. tentativas</Label><Input type="number" value={quizForm.max_attempts} onChange={(e) => setQuizForm({ ...quizForm, max_attempts: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={quizForm.shuffle_questions} onCheckedChange={(v) => setQuizForm({ ...quizForm, shuffle_questions: !!v })} id="shuffle" />
                <Label htmlFor="shuffle" className="!mt-0">Embaralhar questões a cada tentativa</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setQuizForm(null)}>Cancelar</Button>
                <Button className="bg-gray-900 hover:bg-gray-800" disabled={!quizForm.title} onClick={() => saveQuiz.mutate(quizForm)}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {managingQuiz && <QuizQuestoesModal quiz={managingQuiz} onClose={() => setManagingQuiz(null)} />}
    </div>
  );
}

const EMPTY_QUESTION = { statement: "", type: "multipla_escolha", options: ["", "", "", ""], correct_option: 0, explanation: "", points: 1, order: 1 };

function QuizQuestoesModal({ quiz, onClose }) {
  const queryClient = useQueryClient();
  const [questionForm, setQuestionForm] = useState(null);

  const { data: questions = [] } = useQuery({
    queryKey: ["quizQuestions", quiz.id],
    queryFn: () => base44.entities.QuizQuestion.filter({ quiz_id: quiz.id }, "order"),
  });

  const saveQuestion = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.QuizQuestion.update(data.id, data)
      : base44.entities.QuizQuestion.create({ ...data, quiz_id: quiz.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quizQuestions", quiz.id] }); setQuestionForm(null); toast.success("Questão salva!"); },
    onError: (e) => toast.error("Erro ao salvar questão: " + e.message),
  });

  const deleteQuestion = useMutation({
    mutationFn: (id) => base44.entities.QuizQuestion.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quizQuestions", quiz.id] }); toast.success("Questão excluída."); },
  });

  const setOption = (idx, value) => {
    const opts = [...questionForm.options];
    opts[idx] = value;
    setQuestionForm({ ...questionForm, options: opts });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Questões — {quiz.title}</DialogTitle></DialogHeader>

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{questions.length} questão(ões)</p>
          <Button size="sm" className="bg-gray-900 hover:bg-gray-800" onClick={() => setQuestionForm({ ...EMPTY_QUESTION, order: questions.length + 1 })}>
            <Plus className="w-4 h-4 mr-1" /> Nova Questão
          </Button>
        </div>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-800"><strong>{i + 1}.</strong> {q.statement}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setQuestionForm(q)}><Edit2 className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => deleteQuestion.mutate(q.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <ul className="mt-2 space-y-1 pl-4">
                {(q.options || []).map((opt, idx) => (
                  <li key={idx} className={`text-xs ${idx === q.correct_option ? "text-green-700 font-medium" : "text-gray-500"}`}>
                    {idx === q.correct_option ? "✓ " : "• "}{opt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {questions.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Nenhuma questão cadastrada.</p>}
        </div>

        <Dialog open={!!questionForm} onOpenChange={(o) => !o && setQuestionForm(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{questionForm?.id ? "Editar Questão" : "Nova Questão"}</DialogTitle></DialogHeader>
            {questionForm && (
              <div className="space-y-3">
                <div><Label>Enunciado *</Label><Textarea rows={2} value={questionForm.statement} onChange={(e) => setQuestionForm({ ...questionForm, statement: e.target.value })} /></div>
                <div>
                  <Label>Alternativas — marque a correta</Label>
                  <div className="space-y-2 mt-1">
                    {questionForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio" name="correct_option" checked={questionForm.correct_option === idx}
                          onChange={() => setQuestionForm({ ...questionForm, correct_option: idx })}
                        />
                        <Input value={opt} onChange={(e) => setOption(idx, e.target.value)} placeholder={`Alternativa ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
                <div><Label>Explicação da resposta (opcional)</Label><Textarea rows={2} value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Pontos</Label><Input type="number" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) })} /></div>
                  <div><Label>Ordem</Label><Input type="number" value={questionForm.order} onChange={(e) => setQuestionForm({ ...questionForm, order: Number(e.target.value) })} /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setQuestionForm(null)}>Cancelar</Button>
                  <Button
                    className="bg-gray-900 hover:bg-gray-800"
                    disabled={!questionForm.statement || questionForm.options.filter(Boolean).length < 2}
                    onClick={() => saveQuestion.mutate(questionForm)}
                  >Salvar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
