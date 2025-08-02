import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTaskSchema, insertTaskSubmissionSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

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
      const tasks = await storage.getTasksByAssignee(userId);
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
        ...req.body,
        submittedById: userId,
        totalAmount: Math.round(req.body.totalAmount * 100) // convert to cents
      });
      
      const submission = await storage.createTaskSubmission(validatedData);
      
      // Create notification for parent
      if (user.parentId) {
        await storage.createNotification(
          user.parentId,
          "Nueva tarea enviada",
          `${user.firstName || user.email} ha enviado una tarea para revisión`,
          "task_submitted",
          submission.id
        );
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
        const submissions = await storage.getTaskSubmissionsByUser(userId);
        const submission = submissions.find(s => s.id === id);
        
        if (submission) {
          const childBalance = await storage.getBalance(submission.submittedById);
          if (childBalance) {
            await storage.updateBalance(
              submission.submittedById,
              childBalance.accumulated,
              childBalance.pending + submission.totalAmount
            );
          }
          
          // Create notification for child
          await storage.createNotification(
            submission.submittedById,
            "Tarea aprobada",
            `Tu tarea ha sido aprobada. +$${(submission.totalAmount / 100).toFixed(2)}`,
            "task_approved",
            submission.id
          );
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
        amount: Math.round(req.body.amount * 100) // convert to cents
      });
      
      const payment = await storage.createPayment(validatedData);
      
      // Create notification for child
      await storage.createNotification(
        validatedData.toUserId,
        "Pago enviado",
        `Papá envió un pago de $${(validatedData.amount / 100).toFixed(2)}. ¡Confirma para agregarlo a tu cuenta!`,
        "payment_sent",
        payment.id
      );
      
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.patch('/api/payments/:id/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (!user || user.role !== 'child') {
        return res.status(403).json({ message: "Only children can confirm payments" });
      }
      
      const payments = await storage.getPaymentsByUser(userId);
      const payment = payments.find(p => p.id === id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      if (payment.status === 'confirmed') {
        return res.status(400).json({ message: "Payment already confirmed" });
      }
      
      await storage.updatePaymentStatus(id, 'confirmed');
      
      // Update balances
      const childBalance = await storage.getBalance(userId);
      if (childBalance) {
        await storage.updateBalance(
          userId,
          childBalance.accumulated + payment.amount,
          childBalance.pending - payment.amount
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
