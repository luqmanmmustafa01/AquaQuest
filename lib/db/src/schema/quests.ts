import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard", "legendary"]);
export const questStatusEnum = pgEnum("quest_status", ["active", "completed", "failed"]);

export const questsTable = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("easy"),
  status: questStatusEnum("status").notNull().default("active"),
  xpReward: integer("xp_reward").notNull().default(100),
  depthLevel: integer("depth_level").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuestSchema = createInsertSchema(questsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const updateQuestSchema = insertQuestSchema.partial();

export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type Quest = typeof questsTable.$inferSelect;
