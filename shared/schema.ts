import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("parent"), // "parent" or "child"
  parentId: varchar("parent_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskTypeEnum = pgEnum("task_type", ["oneTime", "recurring"]);
export const taskStatusEnum = pgEnum("task_status", ["available", "submitted", "approved", "rejected"]);

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: taskTypeEnum("type").notNull(),
  paymentAmount: integer("payment_amount").notNull(), // in cents
  assignedToId: varchar("assigned_to_id").notNull().references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  status: taskStatusEnum("status").notNull().default("available"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskSubmissions = pgTable("task_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  submittedById: varchar("submitted_by_id").notNull().references(() => users.id),
  timeMinutes: integer("time_minutes").default(0), // for recurring tasks
  totalAmount: integer("total_amount").notNull(), // calculated amount in cents
  status: taskStatusEnum("status").notNull().default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
});

export const balances = pgTable("balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  accumulated: integer("accumulated").notNull().default(0), // in cents
  pending: integer("pending").notNull().default(0), // in cents
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // in cents
  status: varchar("status").notNull().default("pending"), // "pending", "confirmed"
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // "task_approved", "task_rejected", "payment_sent", "payment_received"
  isRead: boolean("is_read").notNull().default(false),
  relatedId: varchar("related_id"), // can reference task, payment, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  parent: one(users, {
    fields: [users.parentId],
    references: [users.id],
    relationName: "parent_child"
  }),
  children: many(users, {
    relationName: "parent_child"
  }),
  createdTasks: many(tasks, {
    relationName: "task_creator"
  }),
  assignedTasks: many(tasks, {
    relationName: "task_assignee"
  }),
  taskSubmissions: many(taskSubmissions),
  balance: one(balances),
  sentPayments: many(payments, {
    relationName: "payment_sender"
  }),
  receivedPayments: many(payments, {
    relationName: "payment_receiver"
  }),
  notifications: many(notifications),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "task_assignee"
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "task_creator"
  }),
  submissions: many(taskSubmissions),
}));

export const taskSubmissionsRelations = relations(taskSubmissions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskSubmissions.taskId],
    references: [tasks.id],
  }),
  submittedBy: one(users, {
    fields: [taskSubmissions.submittedById],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [taskSubmissions.reviewedById],
    references: [users.id],
  }),
}));

export const balancesRelations = relations(balances, ({ one }) => ({
  user: one(users, {
    fields: [balances.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  fromUser: one(users, {
    fields: [payments.fromUserId],
    references: [users.id],
    relationName: "payment_sender"
  }),
  toUser: one(users, {
    fields: [payments.toUserId],
    references: [users.id],
    relationName: "payment_receiver"
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Schemas
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const insertTaskSubmissionSchema = createInsertSchema(taskSubmissions).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedById: true,
  status: true,
});
export type InsertTaskSubmission = z.infer<typeof insertTaskSubmissionSchema>;
export type TaskSubmission = typeof taskSubmissions.$inferSelect;

export type Balance = typeof balances.$inferSelect;

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  status: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type Notification = typeof notifications.$inferSelect;
