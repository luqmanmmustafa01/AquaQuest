import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  age: integer("age").notNull(),
  height: text("height").notNull(),
  weight: text("weight").notNull(),
  goal: text("goal").notNull(),
  experienceLevel: text("experience_level").notNull(),
  workoutStreak: integer("workout_streak").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => userProfiles.id),
  plan: jsonb("plan").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  workoutPlanId: integer("workout_plan_id").references(() => workoutPlans.id),
  dayIndex: integer("day_index").notNull(),
  exerciseName: text("exercise_name").notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

export const workoutCompletions = pgTable("workout_completions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => workoutPlans.id),
  dayIndex: integer("day_index").notNull(),
  dayName: text("day_name"),
  dayFocus: text("day_focus"),
  exercisesCompleted: integer("exercises_completed").notNull().default(0),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});
