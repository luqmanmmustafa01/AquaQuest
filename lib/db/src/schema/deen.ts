import { pgTable, text, serial, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userCurrencyTable = pgTable("user_currency", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  coins: integer("coins").notNull().default(0),
  gems: integer("gems").notNull().default(0),
  spinTickets: integer("spin_tickets").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const duaCategoryEnum = ["personal", "family", "health", "guidance", "gratitude"] as const;

export const duasTable = pgTable("duas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("personal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deenProgressTable = pgTable("deen_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  date: date("date").notNull(),
  prayersCompleted: jsonb("prayers_completed").notNull().default([]),
  quranPages: integer("quran_pages").notNull().default(0),
  dhikrCompleted: jsonb("dhikr_completed").notNull().default([]),
  sunnahCompleted: jsonb("sunnah_completed").notNull().default([]),
  deenScore: integer("deen_score").notNull().default(0),
  prayerStreak: integer("prayer_streak").notNull().default(0),
  quranStreak: integer("quran_streak").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDuaSchema = createInsertSchema(duasTable).omit({ id: true, createdAt: true });
export const insertDeenProgressSchema = createInsertSchema(deenProgressTable).omit({ id: true, updatedAt: true });

export type Dua = typeof duasTable.$inferSelect;
export type DeenProgress = typeof deenProgressTable.$inferSelect;
export type UserCurrency = typeof userCurrencyTable.$inferSelect;
