import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Check, 
  Clock,
  RefreshCw,
  Crown,
  Shield
} from "lucide-react";

export default function ParentOnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [familyName, setFamilyName] = useState('');
  const [isWaitingForInvitation, setIsWaitingForInvitation] = useState(false);

  // Fetch pending invitations for this user
  const { data: invitations, isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery({
    queryKey: ["/api/family-invitations"],
    select: (data) => data as any[] || [],
    refetchInterval: isWaitingForInvitation ? 3000 : false, // Poll every 3 seconds when waiting
  });

  // WebSocket connection for real-time invitations
  useEffect(() => {
    if (!isWaitingForInvitation) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected for invitation updates");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'family_invitation') {
          toast({
            title: "Nueva invitación recibida",
            description: `Has recibido una invitación para unirte a ${data.familyName}`,
          });
          refetchInvitations();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, [isWaitingForInvitation, refetchInvitations, toast]);

  // Create family mutation
  const createFamilyMutation = useMutation({
    mutationFn: async (familyName: string) => {
      return await apiRequest('POST', '/api/family/create', { name: familyName });
    },
    onSuccess: () => {
      toast({ 
        title: "Familia creada", 
        description: "Tu familia ha sido creada exitosamente. Ahora puedes invitar a otros miembros." 
      });
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
      toast({ 
        title: "Error", 
        description: "No se pudo crear la familia", 
        variant: "destructive" 
      });
    },
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('PATCH', `/api/family-invitations/${invitationId}/accept`, {});
    },
    onSuccess: () => {
      toast({ 
        title: "Invitación aceptada", 
        description: "Ahora eres parte de la familia!" 
      });
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
      toast({ 
        title: "Error", 
        description: "No se pudo aceptar la invitación", 
        variant: "destructive" 
      });
    },
  });

  // Reject invitation mutation
  const rejectInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('PATCH', `/api/family-invitations/${invitationId}/reject`, {});
    },
    onSuccess: () => {
      toast({ 
        title: "Invitación rechazada", 
        description: "La invitación ha sido rechazada" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/family-invitations"] });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "No se pudo rechazar la invitación", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (familyName.trim()) {
      createFamilyMutation.mutate(familyName.trim());
    }
  };

  const handleAcceptInvitation = (invitationId: string) => {
    acceptInvitationMutation.mutate(invitationId);
  };

  const handleRejectInvitation = (invitationId: string) => {
    rejectInvitationMutation.mutate(invitationId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'collaborator':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'collaborator':
        return 'Colaborador';
      default:
        return role;
    }
  };

  const hasInvitations = invitations && invitations.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h1>
          <p className="text-gray-600 mt-2">
            Configura tu cuenta de padre en El Tiempo Es Plata
          </p>
        </div>

        {/* Pending Invitations */}
        {invitationsLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : hasInvitations ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitaciones Recibidas
              </CardTitle>
              <CardDescription>
                Has recibido invitaciones para unirte a estas familias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invitations.map((invitation: any) => (
                <div key={invitation.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{invitation.family?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Invitado por: {invitation.invitedBy?.firstName || invitation.invitedBy?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {getRoleIcon(invitation.parentRole)}
                        <Badge variant={invitation.parentRole === 'admin' ? 'default' : 'secondary'}>
                          {getRoleText(invitation.parentRole)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={acceptInvitationMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {acceptInvitationMutation.isPending ? "Aceptando..." : "Aceptar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectInvitation(invitation.id)}
                      disabled={rejectInvitationMutation.isPending}
                    >
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {hasInvitations ? "o" : "Selecciona una opción"}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Create New Family */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Crear Nueva Familia
            </CardTitle>
            <CardDescription>
              Crea una nueva familia y convierte en administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <Label htmlFor="familyName">Nombre de la familia</Label>
                <Input
                  id="familyName"
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ej: Familia García"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={createFamilyMutation.isPending || !familyName.trim()}
              >
                {createFamilyMutation.isPending ? "Creando..." : "Crear Familia"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Wait for Invitation */}
        {!hasInvitations && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Esperar Invitación
              </CardTitle>
              <CardDescription>
                Si alguien te va a invitar a su familia, puedes esperar aquí
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsWaitingForInvitation(!isWaitingForInvitation)}
              >
                {isWaitingForInvitation ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Esperando invitación...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Esperar Invitación
                  </>
                )}
              </Button>
              {isWaitingForInvitation && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Te notificaremos cuando recibas una invitación
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}