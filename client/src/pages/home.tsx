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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  // Task creation form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    type: 'oneTime',
    paymentAmount: '',
    assignedToId: ''
  });

  // Task submission states
  const [sessionTimes, setSessionTimes] = useState<Record<string, number>>({});
  
  // Invite child states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      await apiRequest('POST', '/api/tasks', taskData);
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Tarea creada exitosamente" });
      setTaskForm({ title: '', description: '', type: 'oneTime', paymentAmount: '', assignedToId: '' });
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
    mutationFn: async ({ taskId, timeMinutes, totalAmount }: any) => {
      await apiRequest('POST', '/api/task-submissions', {
        taskId,
        timeMinutes,
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
    onSuccess: () => {
      toast({ title: "Éxito", description: "Tarea revisada" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-submissions"] });
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
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const updateSessionTime = (taskId: string, change: number) => {
    setSessionTimes(prev => ({
      ...prev,
      [taskId]: Math.max(30, (prev[taskId] || 30) + change)
    }));
  };

  const getSessionTime = (taskId: string) => sessionTimes[taskId] || 30;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}min`;
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
                              amount: (child.balance?.pending || 0) / 100 
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

            {/* Task Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pending Approvals */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Tareas Pendientes de Aprobación</h3>
                  <Badge variant="secondary">{pendingSubmissions?.length || 0}</Badge>
                </div>
                
                <div className="space-y-4">
                  {submissionsLoading ? (
                    Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
                  ) : pendingSubmissions?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay tareas pendientes</p>
                  ) : (
                    pendingSubmissions?.map((submission: any) => (
                      <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">Tarea completada</h4>
                            <p className="text-sm text-gray-600">Por {submission.submittedBy?.firstName}</p>
                            <p className="text-sm text-gray-500">
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
                            className="flex-1 bg-secondary hover:bg-green-600"
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
                </div>
              </Card>

              {/* Create Task */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Crear Nueva Tarea</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título de la Tarea</Label>
                    <Input
                      id="title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej: Lavar los platos"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="assignedTo">Asignar a</Label>
                    <Select value={taskForm.assignedToId} onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedToId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hijo" />
                      </SelectTrigger>
                      <SelectContent>
                        {children?.map((child: any) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.firstName || child.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Tipo de Tarea</Label>
                    <RadioGroup 
                      value={taskForm.type} 
                      onValueChange={(value) => setTaskForm(prev => ({ ...prev, type: value }))}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oneTime" id="oneTime" />
                        <Label htmlFor="oneTime">Una vez</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="recurring" id="recurring" />
                        <Label htmlFor="recurring">Recurrente</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment">Pago por Tarea</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <Input
                        id="payment"
                        type="number"
                        step="0.01"
                        className="pl-8"
                        value={taskForm.paymentAmount}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, paymentAmount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Para tareas recurrentes: pago por cada 30 minutos
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea
                      id="description"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Instrucciones adicionales..."
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => createTaskMutation.mutate(taskForm)}
                    disabled={!taskForm.title || !taskForm.assignedToId || !taskForm.paymentAmount || createTaskMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Tarea
                  </Button>
                </div>
              </Card>
            </div>
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
                              ? `${formatCurrency(task.paymentAmount)}/30min`
                              : formatCurrency(task.paymentAmount)
                            }
                          </Badge>
                        </div>
                        
                        {task.type === 'recurring' && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Tiempo de sesión:</span>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-8 h-8 p-0"
                                  onClick={() => updateSessionTime(task.id, -30)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-lg font-bold text-gray-900 w-16 text-center">
                                  {formatTime(getSessionTime(task.id))}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-8 h-8 p-0"
                                  onClick={() => updateSessionTime(task.id, 30)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-sm text-gray-600">Ganarás: </span>
                              <span className="font-bold text-accent">
                                {formatCurrency((task.paymentAmount * getSessionTime(task.id)) / 30)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <Button 
                          className="w-full"
                          onClick={() => submitTaskMutation.mutate({
                            taskId: task.id,
                            timeMinutes: task.type === 'recurring' ? getSessionTime(task.id) : 0,
                            totalAmount: task.type === 'recurring' 
                              ? (task.paymentAmount * getSessionTime(task.id)) / 30
                              : task.paymentAmount / 100
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
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones</h3>
                  
                  <div className="space-y-3">
                    {notificationsLoading ? (
                      Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)
                    ) : !notifications?.length ? (
                      <p className="text-gray-500 text-center py-4">No hay notificaciones</p>
                    ) : (
                      notifications?.slice(0, 5).map((notification: any) => (
                        <div 
                          key={notification.id} 
                          className={`flex items-start space-x-3 p-3 rounded-lg border ${
                            notification.type === 'task_approved' ? 'bg-green-50 border-green-200' :
                            notification.type === 'payment_sent' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-blue-50 border-blue-200'
                          }`}
                        >
                          {notification.type === 'task_approved' && <Check className="text-secondary mt-1" />}
                          {notification.type === 'payment_sent' && <Coins className="text-accent mt-1" />}
                          {notification.type === 'task_rejected' && <X className="text-red-500 mt-1" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString('es-ES')}
                            </p>
                            {notification.type === 'payment_sent' && notification.relatedId && (
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => confirmPaymentMutation.mutate(notification.relatedId)}
                                disabled={confirmPaymentMutation.isPending}
                              >
                                Confirmar Pago
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
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
    </div>
  );
}
