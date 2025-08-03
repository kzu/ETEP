import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTaskSchema, insertTaskSubmissionSchema, insertPaymentSchema, updateUserRoleSchema } from "@shared/schema";
import { z } from "zod";

// Store WebSocket connections by user ID
const userConnections = new Map<string, WebSocket[]>();

// Helper function to broadcast notification to user
function broadcastNotificationToUser(userId: string, notification: any) {
  const connections = userConnections.get(userId);
  if (connections) {
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ensure user has a balance record
      let balance = await storage.getBalance(userId);
      if (!balance) {
        balance = await storage.createBalance(userId);
      }
      
      res.json({ ...user, balance });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Family routes
  app.get('/api/children', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can view children" });
      }
      
      const children = await storage.getChildren(userId);
      
      // Get balances for each child
      const childrenWithBalances = await Promise.all(
        children.map(async (child) => {
          let balance = await storage.getBalance(child.id);
          if (!balance) {
            balance = await storage.createBalance(child.id);
          }
          return { ...child, balance };
        })
      );
      
      res.json(childrenWithBalances);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can view tasks" });
      }
      
      const tasks = await storage.getTasksByCreator(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Update a task (template)
  app.patch('/api/tasks/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId } = req.params;
      const { title, description, type, paymentAmount, assignedToIds } = req.body;
      
      // Get the existing task to verify ownership
      const existingTask = await storage.getTaskById(taskId);
      if (!existingTask || existingTask.createdById !== userId) {
        return res.status(404).json({ message: 'Task not found or not authorized' });
      }
      
      const updatedTask = await storage.updateTask(taskId, {
        title,
        description,
        type,
        paymentAmount,
        assignedToIds: assignedToIds || []
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task' });
    }
  });

  // Delete a task (template)
  app.delete('/api/tasks/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId } = req.params;
      
      // Get the existing task to verify ownership
      const existingTask = await storage.getTaskById(taskId);
      if (!existingTask || existingTask.createdById !== userId) {
        return res.status(404).json({ message: 'Task not found or not authorized' });
      }
      
      await storage.deleteTask(taskId);
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Failed to delete task' });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can create tasks" });
      }
      
      const validatedData = insertTaskSchema.parse({
        ...req.body,
        createdById: userId,
        paymentAmount: Math.round(req.body.paymentAmount * 100) // convert to cents
      });
      
      const task = await storage.createTask(validatedData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get('/api/tasks/assigned', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasksForChild(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching assigned tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/created', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasksByCreator(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching created tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Task submission routes
  app.post('/api/task-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'child') {
        return res.status(403).json({ message: "Only children can submit tasks" });
      }
      
      const validatedData = insertTaskSubmissionSchema.parse({
        taskId: req.body.taskId,
        submittedById: userId,
        units: req.body.units || 1,
        totalAmount: req.body.totalAmount // amount already in cents from frontend
      });
      
      const submission = await storage.createTaskSubmission(validatedData);
      
      // Create notification for parent
      if (user.parentId) {
        const notification = await storage.createNotification({
          userId: user.parentId,
          title: "Nueva tarea enviada",
          message: `${user.firstName || user.email} ha enviado una tarea para revisión`,
          type: "task_submitted",
          relatedId: submission.id
        });
        
        // Broadcast real-time notification to parent
        broadcastNotificationToUser(user.parentId, notification);
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error creating task submission:", error);
      res.status(500).json({ message: "Failed to submit task" });
    }
  });

  app.get('/api/task-submissions/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can view pending submissions" });
      }
      
      const submissions = await storage.getPendingTaskSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching pending submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/task-submissions/approved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can view approved submissions" });
      }
      
      const submissions = await storage.getTaskSubmissionsByStatus(userId, 'approved');
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching approved submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/task-submissions/rejected', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can view rejected submissions" });
      }
      
      const submissions = await storage.getTaskSubmissionsByStatus(userId, 'rejected');
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching rejected submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.patch('/api/task-submissions/:id/:action', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { id, action } = req.params;
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can review tasks" });
      }
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }
      
      const status = action === 'approve' ? 'approved' : 'rejected';
      await storage.updateTaskSubmissionStatus(id, status, userId);
      
      // If approved, update child's balance
      if (action === 'approve') {
        const submission = await storage.getTaskSubmissionById(id);
        
        if (submission) {
          const childBalance = await storage.getBalance(submission.submittedById);
          console.log("Current child balance:", childBalance);
          console.log("Task submission amount:", submission.totalAmount);
          if (childBalance) {
            const newPending = childBalance.pending + submission.totalAmount;
            console.log("Updating child balance - new pending:", newPending);
            await storage.updateBalance(
              submission.submittedById,
              childBalance.accumulated,
              newPending
            );
            // Verify the update
            const updatedBalance = await storage.getBalance(submission.submittedById);
            console.log("Updated child balance:", updatedBalance);
          }
          
          // Create notification for child
          const notification = await storage.createNotification({
            userId: submission.submittedById,
            title: "Tarea aprobada",
            message: `Tu tarea ha sido aprobada. +$${submission.totalAmount}`,
            type: "task_approved",
            relatedId: submission.id
          });
          
          // Broadcast real-time notification
          broadcastNotificationToUser(submission.submittedById, notification);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error reviewing task submission:", error);
      res.status(500).json({ message: "Failed to review task" });
    }
  });

  // Payment routes
  app.post('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can send payments" });
      }
      
      const validatedData = insertPaymentSchema.parse({
        ...req.body,
        fromUserId: userId,
        amount: req.body.amount // amount is already in cents from frontend
      });
      
      const payment = await storage.createPayment(validatedData);
      
      // Automatically move pending amount to accumulated without child confirmation
      const childBalance = await storage.getBalance(validatedData.toUserId);
      if (childBalance) {
        console.log("Current child balance before payment:", childBalance);
        console.log("Payment amount:", validatedData.amount);
        
        const newAccumulated = childBalance.accumulated + validatedData.amount;
        const newPending = Math.max(0, childBalance.pending - validatedData.amount);
        
        console.log("Updating balance - new accumulated:", newAccumulated, "new pending:", newPending);
        
        await storage.updateBalance(
          validatedData.toUserId,
          newAccumulated,
          newPending
        );
        
        // Verify the update
        const updatedBalance = await storage.getBalance(validatedData.toUserId);
        console.log("Updated child balance after payment:", updatedBalance);
      }
      
      // Automatically mark payment as confirmed
      await storage.updatePaymentStatus(payment.id, 'confirmed');
      
      // Create notification for child
      const notification = await storage.createNotification({
        userId: validatedData.toUserId,
        title: "Pago recibido",
        message: `¡Recibiste $${validatedData.amount} de papá! Se agregó a tu dinero acumulado.`,
        type: "payment_received",
        relatedId: payment.id
      });
      
      // Broadcast real-time notification
      broadcastNotificationToUser(validatedData.toUserId, notification);
      
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Payment confirmation route removed - payments are now automatically confirmed

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Role and family management routes
  app.patch('/api/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateUserRoleSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserRole(userId, validatedData);
      
      // Create balance if user becomes a child
      if (validatedData.role === 'child') {
        let balance = await storage.getBalance(userId);
        if (!balance) {
          balance = await storage.createBalance(userId);
        }
      }
      
      res.json({ ...updatedUser, balance: validatedData.role === 'child' ? await storage.getBalance(userId) : null });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.post('/api/family-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can send invitations" });
      }
      
      const { childEmail } = req.body;
      if (!childEmail) {
        return res.status(400).json({ message: "Child email is required" });
      }

      const invitation = await storage.createFamilyInvitation(userId, childEmail);
      
      // Try to find the child user by email and create notification if they exist
      const childUser = await storage.getUserByEmail(childEmail);
      if (childUser) {
        const notification = await storage.createNotification({
          userId: childUser.id,
          title: "Invitación familiar",
          message: `${user.firstName || 'Un padre'} te ha invitado a unirte a su familia. Revisa tus invitaciones pendientes.`,
          type: "family_invitation",
          relatedId: invitation.id
        });
        
        // Broadcast real-time notification to child
        broadcastNotificationToUser(childUser.id, notification);
      }
      
      res.json(invitation);
    } catch (error) {
      console.error("Error creating family invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get('/api/family-invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      const invitations = await storage.getInvitationsByEmail(user.email);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.patch('/api/family-invitations/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const invitation = await storage.getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      await storage.acceptInvitation(id, userId);
      
      // Update user role to child after accepting invitation
      await storage.updateUserRole(userId, { role: 'child' });
      
      // Create balance for the new child
      let balance = await storage.getBalance(userId);
      if (!balance) {
        balance = await storage.createBalance(userId);
      }
      
      // Create notification for the parent
      const user = await storage.getUser(userId);
      const notification = await storage.createNotification({
        userId: invitation.parentId,
        type: 'invitation_accepted',
        title: 'Invitación Aceptada',
        message: `${user?.firstName || 'Tu hijo/a'} ha aceptado la invitación y se ha unido a la familia`,
        relatedId: id
      });
      
      // Broadcast real-time notification
      broadcastNotificationToUser(invitation.parentId, notification);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.patch('/api/family-invitations/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const invitation = await storage.getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Update invitation status to rejected
      await storage.rejectInvitation(id);
      
      // Create notification for the parent
      const user = await storage.getUser(userId);
      const notification = await storage.createNotification({
        userId: invitation.parentId,
        type: 'invitation_rejected',
        title: 'Invitación Rechazada',
        message: `${user?.firstName || 'Un usuario'} ha rechazado la invitación familiar`,
        relatedId: id
      });
      
      // Broadcast real-time notification
      broadcastNotificationToUser(invitation.parentId, notification);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      res.status(500).json({ message: "Failed to reject invitation" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.userId && typeof data.userId === 'string') {
          const userIdValue = data.userId;
          userId = userIdValue;
          
          // Add connection to user's connection list
          if (!userConnections.has(userIdValue)) {
            userConnections.set(userIdValue, []);
          }
          const connections = userConnections.get(userIdValue);
          if (connections) {
            connections.push(ws);
          }
          
          ws.send(JSON.stringify({ type: 'auth_success' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        const userIdValue = userId;
        // Remove connection from user's connection list
        const connections = userConnections.get(userIdValue);
        if (connections) {
          const index = connections.indexOf(ws);
          if (index > -1) {
            connections.splice(index, 1);
          }
          if (connections.length === 0) {
            userConnections.delete(userIdValue);
          }
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  return httpServer;
}
