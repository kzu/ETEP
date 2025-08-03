import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserCheck, 
  Baby, 
  Mail, 
  Check, 
  Clock,
  Users
} from "lucide-react";

export default function RoleSelection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<'parent' | 'child'>('parent');
  const [parentEmail, setParentEmail] = useState('');

  // Fetch pending invitations for this user
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["/api/family-invitations"],
  });

  // Role selection mutation
  const selectRoleMutation = useMutation({
    mutationFn: async (data: { role: 'parent' | 'child'; parentEmail?: string }) => {
      return await apiRequest('PATCH', '/api/user/role', data);
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Rol seleccionado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Iniciando sesión nuevamente...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({ title: "Error", description: "No se pudo seleccionar el rol", variant: "destructive" });
    },
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('PATCH', `/api/family-invitations/${invitationId}/accept`, {});
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Invitación aceptada. Ahora eres parte de la familia!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family-invitations"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Iniciando sesión nuevamente...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({ title: "Error", description: "No se pudo aceptar la invitación", variant: "destructive" });
    },
  });

  const handleRoleSelection = () => {
    const data: any = { role: selectedRole };
    if (selectedRole === 'child' && parentEmail.trim()) {
      data.parentEmail = parentEmail.trim();
    }
    selectRoleMutation.mutate(data);
  };

  const handleAcceptInvitation = (invitationId: string) => {
    acceptInvitationMutation.mutate(invitationId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido/a a El Tiempo Es Plata!</h1>
          <p className="text-gray-600">Para comenzar, necesitamos saber cuál es tu rol en la familia</p>
        </div>

        {/* Pending Invitations */}
        {invitationsLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ) : invitations && invitations.length > 0 ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-accent">
                <Mail className="h-5 w-5" />
                <span>Invitaciones Pendientes</span>
                <Badge variant="secondary">{invitations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Tienes invitaciones para unirte a una familia. Puedes aceptar una de estas invitaciones:
              </p>
              {invitations.map((invitation: any) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center space-x-3">
                    <Users className="h-8 w-8 text-accent bg-accent/10 rounded-full p-1" />
                    <div>
                      <p className="font-medium text-gray-900">Invitación Familiar</p>
                      <p className="text-sm text-gray-500">
                        Enviada el {new Date(invitation.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={acceptInvitationMutation.isPending}
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aceptar
                  </Button>
                </div>
              ))}
              <Separator className="my-4" />
              <p className="text-xs text-gray-500 text-center">
                O puedes elegir tu rol manualmente a continuación
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Selecciona tu Rol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup 
              value={selectedRole} 
              onValueChange={(value) => setSelectedRole(value as 'parent' | 'child')}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Parent Option */}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="parent" id="parent" />
                <Label 
                  htmlFor="parent" 
                  className="flex-1 cursor-pointer p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Padre/Madre</h3>
                      <p className="text-sm text-gray-600">
                        Crear tareas, gestionar pagos y supervisar a los hijos
                      </p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Child Option */}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="child" id="child" />
                <Label 
                  htmlFor="child" 
                  className="flex-1 cursor-pointer p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Baby className="h-8 w-8 text-secondary" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Hijo/a</h3>
                      <p className="text-sm text-gray-600">
                        Completar tareas y ganar dinero
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Parent Email for Children */}
            {selectedRole === 'child' && (
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email del Padre/Madre (opcional)</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  placeholder="padre@ejemplo.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Si conoces el email de tu padre/madre, podrás unirte automáticamente a su familia
                </p>
              </div>
            )}

            <Button 
              onClick={handleRoleSelection}
              disabled={selectRoleMutation.isPending}
              className="w-full"
              size="lg"
            >
              {selectRoleMutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Continuar como {selectedRole === 'parent' ? 'Padre/Madre' : 'Hijo/a'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}