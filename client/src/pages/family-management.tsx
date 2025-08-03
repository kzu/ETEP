import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, UserPlus, Shield, User, Trash2, Crown, Clock } from "lucide-react";

interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface Family {
  id: string;
  name: string;
  createdAt: string;
}

export default function FamilyManagement() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("child");
  const { toast } = useToast();

  // Fetch family data
  const { data: familyData, isLoading } = useQuery({
    queryKey: ['/api/family'],
    select: (data) => data as { family: Family; members: FamilyMember[] }
  });

  // Get current user info
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user']
  });

  // Fetch pending invitations sent from this family
  const { data: pendingInvitations, isLoading: invitationsLoading, refetch: refetchPendingInvitations } = useQuery({
    queryKey: ['/api/family/invitations/pending'],
    select: (data) => data as any[]
  });

  // WebSocket for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected for family management");
      socket.send(JSON.stringify({ type: 'auth', userId: user.id }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' && data.data?.type === 'invitation_created') {
          console.log("New invitation created, refreshing pending invitations");
          refetchPendingInvitations();
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
  }, [user?.id, refetchPendingInvitations]);

  // Send invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { inviteeEmail: string; inviteeRole: string }) =>
      apiRequest('POST', '/api/family-invitations', data),
    onSuccess: () => {
      toast({
        title: "Invitación enviada",
        description: "La invitación ha sido enviada exitosamente."
      });
      setInviteEmail("");
      setInviteRole("child");
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la invitación",
        variant: "destructive"
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) =>
      apiRequest('DELETE', `/api/family/members/${memberId}`),
    onSuccess: () => {
      toast({
        title: "Miembro removido",
        description: "El miembro ha sido removido de la familia."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo remover el miembro",
        variant: "destructive"
      });
    }
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) =>
      apiRequest('PATCH', `/api/family/members/${memberId}/role`, { newRole }),
    onSuccess: () => {
      toast({
        title: "Rol actualizado",
        description: "El rol del miembro ha sido actualizado."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el rol",
        variant: "destructive"
      });
    }
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) =>
      apiRequest('DELETE', `/api/family/invitations/${invitationId}`),
    onSuccess: () => {
      toast({
        title: "Invitación cancelada",
        description: "La invitación ha sido cancelada."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/family/invitations/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo cancelar la invitación",
        variant: "destructive"
      });
    }
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    inviteMutation.mutate({
      inviteeEmail: inviteEmail.trim(),
      inviteeRole: inviteRole
    });
  };

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  const handleChangeRole = (memberId: string, newRole: string) => {
    changeRoleMutation.mutate({ memberId, newRole });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'collaborator':
        return <Shield className="h-4 w-4" />;
      case 'child':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'collaborator':
        return 'Colaborador';
      case 'child':
        return 'Hijo/a';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default' as const;
      case 'collaborator':
        return 'secondary' as const;
      case 'child':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!familyData) {
    return <div>No se encontró información de la familia.</div>;
  }

  const { family, members } = familyData;
  const adminMembers = members.filter(m => m.role === 'admin');
  const collaboratorMembers = members.filter(m => m.role === 'collaborator');
  const childMembers = members.filter(m => m.role === 'child');
  
  // Get current user's role in the family
  const currentUserMember = members.find(m => m.userId === user?.id);
  const userRole = currentUserMember?.role;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Gestión Familiar</h1>
      </div>

      {/* Family Info */}
      <Card>
        <CardHeader>
          <CardTitle>{family.name}</CardTitle>
          <CardDescription>
            Familia creada el {new Date(family.createdAt).toLocaleDateString('es-ES')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Invite New Member - Only for Admins */}
      {userRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invitar Nuevo Miembro
            </CardTitle>
            <CardDescription>
              Invita a otra persona a unirse a tu familia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="collaborator">Colaborador</SelectItem>
                      <SelectItem value="child">Hijo/a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
              >
                {inviteMutation.isPending ? "Enviando..." : "Enviar Invitación"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations - Only for Admins */}
      {userRole === 'admin' && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Invitaciones Pendientes
          </CardTitle>
          <CardDescription>
            Invitaciones enviadas que aún no han sido aceptadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            </div>
          ) : !pendingInvitations || pendingInvitations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay invitaciones pendientes
            </p>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation: any) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{invitation.inviteeEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Rol: {invitation.inviteeRole === 'parent' ? 'Padre' : 'Hijo'} 
                      {invitation.inviteeRole === 'parent' && invitation.parentRole && ` (${invitation.parentRole === 'admin' ? 'Administrador' : 'Colaborador'})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviada por: {invitation.invitedBy?.firstName || invitation.invitedBy?.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                    disabled={cancelInvitationMutation.isPending}
                  >
                    {cancelInvitationMutation.isPending ? "Cancelando..." : "Cancelar"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros de la Familia</CardTitle>
          <CardDescription>
            Gestiona los miembros y sus roles en la familia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Administrators */}
          {adminMembers.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Administradores
              </h3>
              <div className="space-y-2">
                {adminMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRoleIcon(member.role)}
                      <div>
                        <p className="font-medium">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleText(member.role)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => handleChangeRole(member.userId, newRole)}
                        disabled={member.userId === user?.id} // Disable for current user
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="collaborator">Colaborador</SelectItem>
                          <SelectItem value="child">Hijo/a</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {member.userId !== user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Remover miembro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El miembro será removido de la familia.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.userId)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collaborators */}
          {collaboratorMembers.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Colaboradores
                </h3>
                <div className="space-y-2">
                  {collaboratorMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getRoleIcon(member.role)}
                        <div>
                          <p className="font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleText(member.role)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleChangeRole(member.userId, newRole)}
                          disabled={member.userId === user?.id || userRole !== 'admin'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="collaborator">Colaborador</SelectItem>
                            <SelectItem value="child">Hijo/a</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {userRole === 'admin' && member.userId !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Remover miembro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El miembro será removido de la familia.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.userId)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Children */}
          {childMembers.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Hijos
                </h3>
                <div className="space-y-2">
                  {childMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getRoleIcon(member.role)}
                        <div>
                          <p className="font-medium">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleText(member.role)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleChangeRole(member.userId, newRole)}
                          disabled={member.userId === user?.id || userRole !== 'admin'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="collaborator">Colaborador</SelectItem>
                            <SelectItem value="child">Hijo/a</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {userRole === 'admin' && member.userId !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Remover miembro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El miembro será removido de la familia.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}