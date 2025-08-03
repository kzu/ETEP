import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

interface NotificationIconProps {
  userId: string;
}

export function NotificationIcon({ userId }: NotificationIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  });

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      websocket.send(JSON.stringify({ type: 'auth', userId }));
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        console.log('Received notification:', data.data);
        // Refetch notifications when new one arrives
        refetch();
        
        // If it's a task submission notification, also refresh pending tasks
        if (data.data?.type === 'task_submitted') {
          queryClient.invalidateQueries({ queryKey: ["/api/task-submissions/pending"] });
        }
        
        // If it's a payment received notification, refresh user balance
        if (data.data?.type === 'payment_received') {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
        
        // If it's a task approved notification, refresh user balance
        if (data.data?.type === 'task_approved') {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
        
        // If it's a family invitation notification, refresh family invitations
        if (data.data?.type === 'family_invitation') {
          queryClient.invalidateQueries({ queryKey: ["/api/family-invitations"] });
        }
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, [userId, refetch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      // Find the notification to check its type before marking as read
      const notification = notifications.find(n => n.id === notificationId);
      
      await markAsReadMutation.mutateAsync(notificationId);
      
      // If it's an invitation_accepted notification, refresh the page to show new family member
      if (notification?.type === 'invitation_accepted') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleInvitationAction = async (notificationId: string, invitationId: string, action: 'accept' | 'reject', event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const endpoint = action === 'accept' 
        ? `/api/family-invitations/${invitationId}/accept`
        : `/api/family-invitations/${invitationId}/reject`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} invitation`);
      }
      
      // Mark notification as read after action
      await markAsReadMutation.mutateAsync(notificationId);
      
      // Refresh page data if accepted (to show family updates)
      if (action === 'accept') {
        window.location.reload();
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificaciones</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  Marcar todas como leídas
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} sin leer</p>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es
                        })}
                      </p>
                      
                      {/* Family invitation actions */}
                      {notification.type === 'family_invitation' && notification.relatedId && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={(e) => handleInvitationAction(notification.id, notification.relatedId!, 'accept', e)}
                            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                          >
                            Aceptar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleInvitationAction(notification.id, notification.relatedId!, 'reject', e)}
                            className="h-7 px-3 text-xs"
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="ml-2 p-1 h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                        disabled={markAsReadMutation.isPending}
                        title="Marcar como leída"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm"
                onClick={() => setIsOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}