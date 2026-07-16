import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, Trash2, AlertTriangle, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function AcessoPortalTab() {
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState(null);
  const [search, setSearch] = useState("");
  const [showDeletePerms, setShowDeletePerms] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role || "user")).catch(() => {});
  }, []);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-pf"],
    queryFn: () => base44.entities.Student.list("-created_date"),
    initialData: [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Student.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students-pf"] }); toast.success("Acesso atualizado!"); },
  });

  const isMaster = userRole === "admin" || userRole === "Administrador Master" || userRole === "gestor_master";

  const { data: allProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["all-user-profiles-portal"],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: isMaster,
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, permissions }) => base44.entities.UserProfile.update(id, { permissions }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-user-profiles-portal"] }); toast.success("Permissão atualizada!"); },
  });

  const toggleDeletePermission = (profile) => {
    const perms = profile.permissions || [];
    const newPerms = perms.includes("delete_students")
      ? perms.filter(p => p !== "delete_students")
      : [...perms, "delete_students"];
    updateProfileMutation.mutate({ id: profile.id, permissions: newPerms });
  };

  const norm = (v) => (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").trim();
  const searchNorm = norm(search);
  const filtered = !searchNorm ? students : students.filter(s =>
    [s.full_name, s.social_name, s.cpf, s.email, s.whatsapp].some(f => norm(f).includes(searchNorm))
  );

  return (
    <div className="space-y-4">
      {!isMaster && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Atenção:</strong> Liberação ou bloqueio de acesso ao portal requer autorização do Gestor Master.
          </p>
        </div>
      )}
      {isMaster && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <strong>Gestor Master:</strong> Você tem permissão para liberar/bloquear acesso e gerenciar permissões de exclusão.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 flex-shrink-0"
              onClick={() => setShowDeletePerms(!showDeletePerms)}>
              <Trash2 className="w-3 h-3 mr-1" />{showDeletePerms ? "Fechar" : "Permissões de Exclusão"}
            </Button>
          </div>

          {showDeletePerms && (
            <Card className="border border-red-200">
              <CardHeader className="pb-2 bg-red-50 border-b border-red-100">
                <CardTitle className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Gerenciar Permissão de Exclusão de Alunos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingProfiles ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Carregando usuários...</div>
                ) : allProfiles.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Nenhum perfil encontrado.</div>
                ) : (
                  <div className="divide-y">
                    {allProfiles.map(profile => {
                      const hasDeletePerm = (profile.permissions || []).includes("delete_students");
                      const isAdminRole = ["admin", "Administrador Master", "gestor_master"].includes(profile.role);
                      return (
                        <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{profile.user_name}</p>
                            <p className="text-xs text-gray-500">{profile.user_email} — {profile.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdminRole ? (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">Acesso total (Master)</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className={hasDeletePerm ? "border-red-300 text-red-700 hover:bg-red-50" : "border-gray-300 text-gray-600 hover:bg-gray-50"}
                                onClick={() => toggleDeletePermission(profile)}
                                disabled={updateProfileMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {hasDeletePerm ? "Revogar" : "Conceder"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(student => {
                const ativo = student.status === "Ativo";
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-500">CPF: {student.cpf}</p>
                      {student.email && <p className="text-xs text-gray-400">{student.email}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {ativo ? (<><Unlock className="w-3 h-3 mr-1 inline" /> Acesso Liberado</>) : (<><Lock className="w-3 h-3 mr-1 inline" /> Acesso Bloqueado</>)}
                      </Badge>
                      {isMaster && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: student.id, status: ativo ? "Inativo" : "Ativo" })}
                          className={ativo ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-600 hover:bg-green-50"}
                        >
                          {ativo ? <><Lock className="w-3 h-3 mr-1" /> Bloquear</> : <><Unlock className="w-3 h-3 mr-1" /> Liberar</>}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}