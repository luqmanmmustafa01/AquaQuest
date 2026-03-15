import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const fishPool = pgTable("fish_pool", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rarity: text("rarity").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("🐟"),
  banner: text("banner").notNull().default("main"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const userFish = pgTable("user_fish", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  fishId: integer("fish_id").references(() => fishPool.id),
  obtainedAt: timestamp("obtained_at").defaultNow().notNull(),
  isCompanion: boolean("is_companion").notNull().default(false),
  evolutionStage: integer("evolution_stage").notNull().default(0),
});

export const oceanSummons = pgTable("ocean_summons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  fishId: integer("fish_id").references(() => fishPool.id),
  banner: text("banner").notNull(),
  summonedAt: timestamp("summoned_at").defaultNow().notNull(),
  pityCount: integer("pity_count").notNull().default(0),
});

export const userStardust = pgTable("user_stardust", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  amount: integer("amount").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSummonPity = pgTable("user_summon_pity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  epicPity: integer("epic_pity").notNull().default(0),
  legendaryPity: integer("legendary_pity").notNull().default(0),
  totalSummons: integer("total_summons").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
