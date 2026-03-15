import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard", "legendary"]);
export const questStatusEnum = pgEnum("quest_status", ["active", "completed", "failed"]);
export const goalCategoryEnum = pgEnum("goal_category", ["fitness", "wellness", "productivity"]);
export const goalTypeEnum = pgEnum("goal_type", ["daily", "weekly", "long_term"]);

export const questsTable = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  difficulty: difficultyEnum("difficulty").notNull().default("easy"),
  status: questStatusEnum("status").notNull().default("active"),
  xpReward: integer("xp_reward").notNull().default(100),
  category: goalCategoryEnum("category").notNull().default("fitness"),
  goalType: goalTypeEnum("goal_type").notNull().default("daily"),
  streak: integer("streak").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  targetDate: text("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuestSchema = createInsertSchema(questsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateQuestSchema = insertQuestSchema.partial();

export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof questsTable.$inferSelect;
