import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Coins, 
  CreditCard, 
  Check, 
  X, 
  Plus, 
  Minus, 
  Send, 
  Clock, 
  PiggyBank,
  UserPlus,
  Bell,
  History,
  ListTodo,
  User,
  Home as HomeIcon
} from "lucide-react";
import { NotificationIcon } from "@/components/NotificationIcon";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<'parent' | 'child'>('parent');
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "No autorizado",
        description: "Iniciando sesión...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  // Auto-set view based on user role
  useEffect(() => {
    if (user?.role) {
      setCurrentView(user.role as 'parent' | 'child');
    }
  }, [user]);

  // Queries
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ["/api/children"],
    enabled: user?.role === 'parent',
  });

  const { data: assignedTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks/assigned"],
    enabled: user?.role === 'child',
  });

  const { data: pendingSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/task-submissions/pending"],
    enabled: user?.role === 'parent',
  });

  const { data: createdTasks, isLoading: createdTasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: user?.role === 'parent',
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  // Task creation form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    type: 'oneTime',
    paymentAmount: '',
    assignedToIds: [] as string[]
  });

  // Task submission states
  const [sessionUnits, setSessionUnits] = useState<Record<string, number>>({});
  
  // Invite child states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Task creation modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Task management state
  const [activeTab, setActiveTab] = useState("disponibles");
  const [editingTask, setEditingTask] = useState<any>(null);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      await apiRequest('POST', '/api/tasks', taskData);
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Tarea creada exitosamente" });
      setTaskForm({ title: '', description: '', type: 'oneTime', paymentAmount: '', assignedToIds: [] });
      setShowCreateTaskModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
      toast({ title: "Error", description: "No se pudo crear la tarea", variant: "destructive" });
    },
  });

  const submitTaskMutation = useMutation({
    mutationFn: async ({ taskId, units, totalAmount }: any) => {
      await apiRequest('POST', '/api/task-submissions', {
        taskId,
        units,
        totalAmount
      });
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Tarea enviada para revisión" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
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
      toast({ title: "Error", description: "No se pudo enviar la tarea", variant: "destructive" });
    },
  });

  const reviewTaskMutation = useMutation({
    mutationFn: async ({ submissionId, action }: { submissionId: string, action: 'approve' | 'reject' }) => {
      await apiRequest('PATCH', `/api/task-submissions/${submissionId}/${action}`, {});
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Éxito", description: "Tarea revisada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      
      // Auto-switch to the appropriate tab
      if (action === 'approve') {
        setActiveTab("aprobadas");
      } else {
        setActiveTab("rechazadas");
      }
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
      toast({ title: "Error", description: "No se pudo revisar la tarea", variant: "destructive" });
    },
  });

  const sendPaymentMutation = useMutation({
    mutationFn: async ({ toUserId, amount }: { toUserId: string, amount: number }) => {
      await apiRequest('POST', '/api/payments', { toUserId, amount });
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Pago enviado. El hijo debe confirmarlo." });
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
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
      toast({ title: "Error", description: "No se pudo enviar el pago", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      await apiRequest('PATCH', `/api/tasks/${taskData.id}`, taskData);
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Tarea actualizada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingTask(null);
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
      toast({ title: "Error", description: "No se pudo actualizar la tarea", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest('DELETE', `/api/tasks/${taskId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Tarea eliminada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingTask(null);
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
      toast({ title: "Error", description: "No se pudo eliminar la tarea", variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest('PATCH', `/api/payments/${paymentId}/confirm`, {});
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Pago confirmado y agregado a tu cuenta" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
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
      toast({ title: "Error", description: "No se pudo confirmar el pago", variant: "destructive" });
    },
  });

  const inviteChildMutation = useMutation({
    mutationFn: async (childEmail: string) => {
      await apiRequest('POST', '/api/family-invitations', { childEmail });
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Invitación enviada correctamente" });
      setShowInviteModal(false);
      setInviteEmail('');
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
      toast({ title: "Error", description: "No se pudo enviar la invitación", variant: "destructive" });
    },
  });

  // Helper functions
  // Helper function to format currency (values stored as full amounts)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const updateSessionUnits = (taskId: string, change: number) => {
    setSessionUnits(prev => ({
      ...prev,
      [taskId]: Math.max(1, (prev[taskId] || 1) + change)
    }));
  };

  const getSessionUnits = (taskId: string) => sessionUnits[taskId] || 1;

  // Helper functions for task filtering
  const getTaskSubmissionsByStatus = (status: string) => {
    return pendingSubmissions?.filter((submission: any) => submission.status === status) || [];
  };

  const countTasksByStatus = (status: string) => {
    return getTaskSubmissionsByStatus(status).length;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-16 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Coins className="text-2xl text-accent" />
              <h1 className="text-xl font-bold text-gray-900">El Tiempo Es Plata</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Role Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={currentView === 'parent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('parent')}
                  disabled={user.role !== 'parent'}
                >
                  Padre
                </Button>
                <Button
                  variant={currentView === 'child' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('child')}
                  disabled={user.role !== 'child'}
                >
                  Hijo
                </Button>
              </div>
              
              {/* Notification Icon */}
              <NotificationIcon userId={user.id} />
              
              {/* Profile */}
              <div className="flex items-center space-x-2">
                <img 
                  src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover" 
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.firstName || user.email}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
              >
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {currentView === 'parent' ? (
          /* Parent Dashboard */
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Panel de Control Familiar</h2>
              <p className="text-gray-600">Gestiona las tareas y pagos de tus hijos</p>
            </div>

            {/* Children Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {childrenLoading ? (
                Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-48" />)
              ) : (
                <>
                  {children?.map((child: any) => (
                    <Card key={child.id} className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <img 
                          src={child.profileImageUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60"} 
                          alt={child.firstName} 
                          className="w-12 h-12 rounded-full object-cover" 
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{child.firstName || child.email}</h3>
                          <p className="text-sm text-gray-500">Hijo</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Acumulado:</span>
                          <span className="text-lg font-bold text-secondary">
                            {formatCurrency(child.balance?.accumulated || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pendiente:</span>
                          <span className="text-lg font-bold text-accent">
                            {formatCurrency(child.balance?.pending || 0)}
                          </span>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100">
                          <Button 
                            className="w-full"
                            onClick={() => sendPaymentMutation.mutate({ 
                              toUserId: child.id, 
                              amount: child.balance?.pending || 0
                            })}
                            disabled={!child.balance?.pending || sendPaymentMutation.isPending}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pagar Pendiente
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {/* Add Child Card */}
                  <Card 
                    className="p-6 border-dashed border-2 hover:border-gray-400 cursor-pointer transition-colors"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <div className="flex flex-col items-center justify-center text-center h-full">
                      <UserPlus className="h-12 w-12 text-gray-400 mb-3" />
                      <h3 className="font-medium text-gray-900 mb-1">Agregar Hijo</h3>
                      <p className="text-sm text-gray-500">Invita a otro hijo a la app</p>
                    </div>
                  </Card>
                </>
              )}
            </div>

            {/* Task Management with Tabs */}
            <Card className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pendientes" className="flex items-center space-x-2">
                    <span>Pendientes</span>
                    {countTasksByStatus('submitted') > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {countTasksByStatus('submitted')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="aprobadas">
                    <span>Aprobadas</span>
                  </TabsTrigger>
                  <TabsTrigger value="rechazadas">
                    <span>Rechazadas</span>
                  </TabsTrigger>
                  <TabsTrigger value="disponibles">
                    <span>Disponibles</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pendientes" className="mt-6 space-y-4">
                  {submissionsLoading ? (
                    Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
                  ) : getTaskSubmissionsByStatus('submitted').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay tareas pendientes</p>
                  ) : (
                    getTaskSubmissionsByStatus('submitted').map((submission: any) => (
                      <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{submission.task?.title || 'Tarea completada'}</h4>
                            <p className="text-sm text-gray-600">Por {submission.submittedBy?.firstName || submission.submittedBy?.email}</p>
                            <p className="text-sm text-gray-500">
                              {submission.units > 1 && `${submission.units} unidades • `}
                              {new Date(submission.submittedAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-accent">
                            {formatCurrency(submission.totalAmount)}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => reviewTaskMutation.mutate({ 
                              submissionId: submission.id, 
                              action: 'approve' 
                            })}
                            disabled={reviewTaskMutation.isPending}
                          >
                            <Check className="mr-1 h-3 w-3" /> Aprobar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1"
                            onClick={() => reviewTaskMutation.mutate({ 
                              submissionId: submission.id, 
                              action: 'reject' 
                            })}
                            disabled={reviewTaskMutation.isPending}
                          >
                            <X className="mr-1 h-3 w-3" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="aprobadas" className="mt-6 space-y-4">
                  {getTaskSubmissionsByStatus('approved').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay tareas aprobadas</p>
                  ) : (
                    getTaskSubmissionsByStatus('approved').map((submission: any) => (
                      <div key={submission.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{submission.task?.title || 'Tarea completada'}</h4>
                            <p className="text-sm text-gray-600">Por {submission.submittedBy?.firstName || submission.submittedBy?.email}</p>
                            <p className="text-sm text-gray-500">
                              {submission.units > 1 && `${submission.units} unidades • `}
                              Aprobada el {new Date(submission.reviewedAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(submission.totalAmount)}
                            </span>
                            <Badge variant="secondary" className="block mt-1 bg-green-100 text-green-800">
                              <Check className="mr-1 h-3 w-3" /> Aprobada
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="rechazadas" className="mt-6 space-y-4">
                  {getTaskSubmissionsByStatus('rejected').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay tareas rechazadas</p>
                  ) : (
                    getTaskSubmissionsByStatus('rejected').map((submission: any) => (
                      <div key={submission.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{submission.task?.title || 'Tarea completada'}</h4>
                            <p className="text-sm text-gray-600">Por {submission.submittedBy?.firstName || submission.submittedBy?.email}</p>
                            <p className="text-sm text-gray-500">
                              {submission.units > 1 && `${submission.units} unidades • `}
                              Rechazada el {new Date(submission.reviewedAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-red-600">
                              {formatCurrency(submission.totalAmount)}
                            </span>
                            <Badge variant="destructive" className="block mt-1">
                              <X className="mr-1 h-3 w-3" /> Rechazada
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="disponibles" className="mt-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Tareas Disponibles</h3>
                    <Button 
                      onClick={() => setShowCreateTaskModal(true)}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Nueva Tarea</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {createdTasksLoading ? (
                      Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)
                    ) : !createdTasks?.length ? (
                      <div className="text-center py-8 text-gray-500">
                        <ListTodo className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No hay tareas creadas</p>
                        <p className="text-sm">Haz clic en "Nueva Tarea" para crear una</p>
                      </div>
                    ) : (
                      createdTasks?.map((task: any) => {
                        const assignedChildren = task.assignedToIds?.length > 0 
                          ? children?.filter((child: any) => task.assignedToIds.includes(child.id)) || []
                          : [];
                        
                        const assignmentText = task.assignedToIds?.length === 0 || !task.assignedToIds
                          ? 'Disponible para todos'
                          : assignedChildren.map(child => child.firstName || child.email).join(', ');
                        
                        return (
                          <div 
                            key={task.id} 
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 group"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                                  <p className="text-sm text-gray-600">
                                    Asignada a: {assignmentText}
                                  </p>
                                  {task.description && (
                                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                  )}
                                </div>
                                <div className="text-right flex items-center space-x-2">
                                  <div>
                                    <Badge variant={task.status === 'available' ? 'secondary' : task.status === 'submitted' ? 'default' : 'outline'}>
                                      {task.status === 'available' ? 'Disponible' : 
                                       task.status === 'submitted' ? 'Enviada' : 
                                       task.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                                    </Badge>
                                    <div className="text-sm font-medium text-gray-900 mt-1">
                                      {task.type === 'recurring' 
                                        ? `${formatCurrency(task.paymentAmount)}/unidad`
                                        : formatCurrency(task.paymentAmount)
                                      }
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {task.type === 'recurring' ? 'Recurrente' : 'Una vez'}
                                    </div>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingTask(task)}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm('¿Estás seguro de eliminar esta tarea? Esta acción no afectará las tareas ya completadas por los hijos.')) {
                                          deleteTaskMutation.mutate(task.id);
                                        }
                                      }}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        ) : (
          /* Child Dashboard */
          <div>
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <img 
                  src={user.profileImageUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"} 
                  alt={user.firstName} 
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" 
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    ¡Hola {user.firstName || user.email}!
                  </h2>
                  <p className="text-gray-600">Ve tus tareas y ganancias</p>
                </div>
              </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-secondary to-green-600 text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Dinero Acumulado</h3>
                  <PiggyBank className="h-8 w-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{formatCurrency(user.balance?.accumulated || 0)}</p>
                <p className="text-green-100 text-sm">Total ganado hasta ahora</p>
              </Card>
              
              <Card className="bg-gradient-to-br from-accent to-yellow-600 text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Pendiente de Pago</h3>
                  <Clock className="h-8 w-8 opacity-80" />
                </div>
                <p className="text-3xl font-bold">{formatCurrency(user.balance?.pending || 0)}</p>
                <p className="text-yellow-100 text-sm">Esperando pago de papá</p>
              </Card>
            </div>

            {/* ListTodo and Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Available ListTodo */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Tareas Disponibles</h3>
                
                <div className="space-y-4">
                  {tasksLoading ? (
                    Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)
                  ) : assignedTasks?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay tareas disponibles</p>
                  ) : (
                    assignedTasks?.map((task: any) => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-600">
                              {task.type === 'recurring' ? 'Tarea recurrente' : 'Tarea de una vez'}
                            </p>
                            <p className="text-sm text-gray-500">{task.description}</p>
                          </div>
                          <Badge variant="secondary">
                            {task.type === 'recurring' 
                              ? `${formatCurrency(task.paymentAmount)}/unidad`
                              : formatCurrency(task.paymentAmount)
                            }
                          </Badge>
                        </div>
                        
                        {task.type === 'recurring' && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Unidades realizadas:</span>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-8 h-8 p-0"
                                  onClick={() => updateSessionUnits(task.id, -1)}
                                  disabled={getSessionUnits(task.id) <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-gray-900">
                                    {getSessionUnits(task.id)} unidad{getSessionUnits(task.id) > 1 ? 'es' : ''}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-8 h-8 p-0"
                                  onClick={() => updateSessionUnits(task.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-sm text-gray-600">Total a ganar: </span>
                              <span className="font-bold text-accent">
                                {formatCurrency(task.paymentAmount * getSessionUnits(task.id))}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatCurrency(task.paymentAmount)} × {getSessionUnits(task.id)} unidad{getSessionUnits(task.id) > 1 ? 'es' : ''}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <Button 
                          className="w-full"
                          onClick={() => submitTaskMutation.mutate({
                            taskId: task.id,
                            units: task.type === 'recurring' ? getSessionUnits(task.id) : 1,
                            totalAmount: task.type === 'recurring' 
                              ? task.paymentAmount * getSessionUnits(task.id)
                              : task.paymentAmount
                          })}
                          disabled={submitTaskMutation.isPending}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Tarea Completada
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Notifications */}
              <div className="space-y-6">
                {/* Panel de notificaciones removido - se usa solo el icono desplegable */}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around py-2">
          <button className="flex flex-col items-center py-2 px-4 text-primary">
            <HomeIcon className="h-5 w-5" />
            <span className="text-xs mt-1">Inicio</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-400">
            <ListTodo className="h-5 w-5" />
            <span className="text-xs mt-1">Tareas</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-400">
            <History className="h-5 w-5" />
            <span className="text-xs mt-1">Historial</span>
          </button>
          <button className="flex flex-col items-center py-2 px-4 text-gray-400">
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Invite Child Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Invitar Hijo</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email del hijo</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="hijo@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Tu hijo recibirá una invitación para unirse a la familia cuando inicie sesión
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => inviteChildMutation.mutate(inviteEmail)}
                disabled={!inviteEmail.trim() || inviteChildMutation.isPending}
              >
                {inviteChildMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Invitación
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={showCreateTaskModal} onOpenChange={setShowCreateTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="modal-title">Título de la Tarea</Label>
              <Input
                id="modal-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Lavar los platos"
              />
            </div>
            
            <div>
              <Label>Asignar a (opcional)</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assign-all"
                    checked={taskForm.assignedToIds.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setTaskForm(prev => ({ ...prev, assignedToIds: [] }));
                      }
                    }}
                  />
                  <Label htmlFor="assign-all" className="text-sm">
                    Disponible para todos los hijos
                  </Label>
                </div>
                
                {children?.map((child: any) => (
                  <div key={child.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`child-${child.id}`}
                      checked={taskForm.assignedToIds.includes(child.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTaskForm(prev => ({ 
                            ...prev, 
                            assignedToIds: [...prev.assignedToIds, child.id] 
                          }));
                        } else {
                          setTaskForm(prev => ({ 
                            ...prev, 
                            assignedToIds: prev.assignedToIds.filter(id => id !== child.id) 
                          }));
                        }
                      }}
                      disabled={taskForm.assignedToIds.length === 0}
                    />
                    <Label htmlFor={`child-${child.id}`} className="text-sm">
                      {child.firstName || child.email}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Tipo de Tarea</Label>
              <RadioGroup 
                value={taskForm.type} 
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, type: value }))}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oneTime" id="modal-oneTime" />
                  <Label htmlFor="modal-oneTime">Una vez</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="modal-recurring" />
                  <Label htmlFor="modal-recurring">Recurrente</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="modal-payment">Pago por Tarea</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <Input
                  id="modal-payment"
                  type="number"
                  min="0"
                  step="1000"
                  className="pl-8"
                  value={taskForm.paymentAmount}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, paymentAmount: e.target.value }))}
                  placeholder="5000"
                />
              </div>
              {taskForm.type === 'recurring' && (
                <p className="text-sm text-gray-500 mt-1">
                  Para tareas recurrentes, esto es el pago por unidad
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="modal-description">Descripción (opcional)</Label>
              <Textarea
                id="modal-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Instrucciones adicionales..."
                rows={3}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowCreateTaskModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => createTaskMutation.mutate({
                  ...taskForm,
                  paymentAmount: parseInt(taskForm.paymentAmount) || 0
                })}
                disabled={createTaskMutation.isPending || !taskForm.title || !taskForm.paymentAmount}
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Tarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={editingTask !== null} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ListTodo className="h-5 w-5" />
              <span>Editar Tarea</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingTask && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Lavar los platos"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Descripción (opcional)</Label>
                <Textarea
                  id="edit-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalles adicionales sobre la tarea..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Tipo de tarea</Label>
                <RadioGroup
                  value={editingTask.type}
                  onValueChange={(value) => setEditingTask(prev => ({ ...prev, type: value }))}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oneTime" id="edit-oneTime" />
                    <Label htmlFor="edit-oneTime">Una vez</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="edit-recurring" />
                    <Label htmlFor="edit-recurring">Recurrente</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="edit-payment">Pago</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="edit-payment"
                    type="number"
                    min="0"
                    step="1000"
                    className="pl-8"
                    value={editingTask.paymentAmount}
                    onChange={(e) => setEditingTask(prev => ({ 
                      ...prev, 
                      paymentAmount: parseInt(e.target.value || '0')
                    }))}
                    placeholder="5000"
                  />
                </div>
                {editingTask.type === 'recurring' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Para tareas recurrentes, esto es el pago por unidad
                  </p>
                )}
              </div>
              
              <div>
                <Label>Asignar tarea</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-all-children"
                      checked={!editingTask.assignedToIds || editingTask.assignedToIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditingTask(prev => ({ ...prev, assignedToIds: [] }));
                        }
                      }}
                    />
                    <Label htmlFor="edit-all-children">Disponible para todos los hijos</Label>
                  </div>
                  
                  {children?.map((child: any) => (
                    <div key={child.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-child-${child.id}`}
                        checked={editingTask.assignedToIds?.includes(child.id) || false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingTask(prev => ({
                              ...prev,
                              assignedToIds: [...(prev.assignedToIds || []), child.id]
                            }));
                          } else {
                            setEditingTask(prev => ({
                              ...prev,
                              assignedToIds: prev.assignedToIds?.filter(id => id !== child.id) || []
                            }));
                          }
                        }}
                        disabled={!editingTask.assignedToIds || editingTask.assignedToIds.length === 0}
                      />
                      <Label htmlFor={`edit-child-${child.id}`} className={(!editingTask.assignedToIds || editingTask.assignedToIds.length === 0) ? 'text-gray-400' : ''}>
                        {child.firstName || child.email}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => updateTaskMutation.mutate(editingTask)}
                  disabled={updateTaskMutation.isPending || !editingTask.title || !editingTask.paymentAmount}
                >
                  Guardar Cambios
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('¿Eliminar esta tarea? No afectará las tareas completadas.')) {
                      deleteTaskMutation.mutate(editingTask.id);
                    }
                  }}
                  disabled={deleteTaskMutation.isPending}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
