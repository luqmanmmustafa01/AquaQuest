import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const achievementCategoryEnum = pgEnum("achievement_category", ["exploration", "combat", "collection", "social"]);

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("🏆"),
  category: achievementCategoryEnum("category").notNull().default("exploration"),
  unlockedAt: timestamp("unlocked_at"),
});

export const insertAchievementSchema = createInsertSchema(achievementsTable).omit({ id: true });

export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievementsTable.$inferSelect;
