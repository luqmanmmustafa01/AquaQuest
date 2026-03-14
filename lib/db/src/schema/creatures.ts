import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rarityEnum = pgEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary"]);

export const creaturesTable = pgTable("creatures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  rarity: rarityEnum("rarity").notNull().default("common"),
  depthFound: integer("depth_found").notNull().default(0),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("🐠"),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
});

export const insertCreatureSchema = createInsertSchema(creaturesTable).omit({ id: true, discoveredAt: true });

export type InsertCreature = z.infer<typeof insertCreatureSchema>;
export type Creature = typeof creaturesTable.$inferSelect;
