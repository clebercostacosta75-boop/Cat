import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function NotificationSettings() {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    course_expiring_enabled: true,
    course_expiring_days_before: 30,
    class_slots_limited_enabled: true,
    class_slots_threshold: 5,
    new_message_enabled: true,
    class_scheduled_enabled: true,
    payment_pending_enabled: true,
    document_expiring_enabled: true,
    email_notifications: false,
    push_notifications: true,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: existingPreferences } = useQuery({
    queryKey: ["notificationPreferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const prefs = await base44.entities.NotificationPreference.filter({
        user_id: user.id,
      });
      return prefs[0] || null;
    },
    enabled: !!user?.id,
    initialData: null,
  });

  useEffect(() => {
    if (existingPreferences) {
      setPreferences({
        course_expiring_enabled: existingPreferences.course_expiring_enabled ?? true,
        course_expiring_days_before: existingPreferences.course_expiring_days_before ?? 30,
        class_slots_limited_enabled: existingPreferences.class_slots_limited_enabled ?? true,
        class_slots_threshold: existingPreferences.class_slots_threshold ?? 5,
        new_message_enabled: existingPreferences.new_message_enabled ?? true,
        class_scheduled_enabled: existingPreferences.class_scheduled_enabled ?? true,
        payment_pending_enabled: existingPreferences.payment_pending_enabled ?? true,
        document_expiring_enabled: existingPreferences.document_expiring_enabled ?? true,
        email_notifications: existingPreferences.email_notifications ?? false,
        push_notifications: existingPreferences.push_notifications ?? true,
      });
    }
  }, [existingPreferences]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingPreferences) {
        return base44.entities.NotificationPreference.update(
          existingPreferences.id,
          data
        );
      } else {
        return base44.entities.NotificationPreference.create({
          user_id: user.id,
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
      toast.success("✅ Preferências salvas com sucesso!");
    },
    onError: (error) => {
      toast.error("❌ Erro ao salvar preferências", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(preferences);
  };

  if (!user) return null;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">
            Configurações de Notificações
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Personalize como e quando você deseja receber notificações
          </p>
        </div>

        <Card className="border border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Tipos de Notificação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Cursos Expirando */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-black">
                    Cursos Próximos do Vencimento
                  </Label>
                  <p className="text-xs text-gray-600">
                    Receba alertas sobre cursos que estão próximos de expirar
                  </p>
                </div>
                <Switch
                  checked={preferences.course_expiring_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, course_expiring_enabled: checked })
                  }
                />
              </div>
              {preferences.course_expiring_enabled && (
                <div className="ml-4">
                  <Label className="text-xs text-gray-600">
                    Dias antes do vencimento
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={preferences.course_expiring_days_before}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        course_expiring_days_before: parseInt(e.target.value),
                      })
                    }
                    className="w-24 mt-1"
                  />
                </div>
              )}
            </div>

            {/* Vagas Limitadas */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold text-black">
                    Turmas com Vagas Limitadas
                  </Label>
                  <p className="text-xs text-gray-600">
                    Alertas quando uma turma tiver poucas vagas restantes
                  </p>
                </div>
                <Switch
                  checked={preferences.class_slots_limited_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, class_slots_limited_enabled: checked })
                  }
                />
              </div>
              {preferences.class_slots_limited_enabled && (
                <div className="ml-4">
                  <Label className="text-xs text-gray-600">
                    Notificar quando restar apenas
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={preferences.class_slots_threshold}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        class_slots_threshold: parseInt(e.target.value),
                      })
                    }
                    className="w-24 mt-1"
                  />
                  <span className="text-xs text-gray-500 ml-2">vagas</span>
                </div>
              )}
            </div>

            {/* Novas Mensagens */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-black">
                  Novas Mensagens
                </Label>
                <p className="text-xs text-gray-600">
                  Notificações sobre mensagens na central de comunicação
                </p>
              </div>
              <Switch
                checked={preferences.new_message_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, new_message_enabled: checked })
                }
              />
            </div>

            {/* Turmas Agendadas */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-black">
                  Turmas Agendadas
                </Label>
                <p className="text-xs text-gray-600">
                  Alertas quando uma nova turma for agendada
                </p>
              </div>
              <Switch
                checked={preferences.class_scheduled_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, class_scheduled_enabled: checked })
                }
              />
            </div>

            {/* Pagamentos Pendentes */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-black">
                  Pagamentos Pendentes
                </Label>
                <p className="text-xs text-gray-600">
                  Lembretes sobre pagamentos em aberto
                </p>
              </div>
              <Switch
                checked={preferences.payment_pending_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, payment_pending_enabled: checked })
                }
              />
            </div>

            {/* Documentos Expirando */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-black">
                  Documentos Expirando
                </Label>
                <p className="text-xs text-gray-600">
                  Alertas sobre documentos próximos do vencimento
                </p>
              </div>
              <Switch
                checked={preferences.document_expiring_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, document_expiring_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Canais de Notificação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-black">
                  Notificações no Sistema
                </Label>
                <p className="text-xs text-gray-600">
                  Receba notificações diretamente no sistema
                </p>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, push_notifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-semibold text-black">
                  Notificações por E-mail
                </Label>
                <p className="text-xs text-gray-600">
                  Receba cópias das notificações por e-mail
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, email_notifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </div>
    </div>
  );
}