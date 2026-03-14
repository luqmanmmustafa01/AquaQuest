import { Router } from "express";
import { db } from "@workspace/db";
import { userProfiles, workoutPlans, workoutLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/profile", async (req, res) => {
  try {
    const profiles = await db.select().from(userProfiles).limit(1);
    if (profiles.length === 0) {
      return res.status(404).json({ error: "not_found", message: "No profile found" });
    }
    const p = profiles[0];
    return res.json({
      id: p.id,
      age: p.age,
      height: p.height,
      weight: p.weight,
      goal: p.goal,
      experienceLevel: p.experienceLevel,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

router.post("/profile", async (req, res) => {
  try {
    const { age, height, weight, goal, experienceLevel } = req.body;
    const existing = await db.select().from(userProfiles).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(userProfiles)
        .set({ age, height, weight, goal, experienceLevel, updatedAt: new Date() })
        .where(eq(userProfiles.id, existing[0].id))
        .returning();
      const p = updated[0];
      return res.json({
        id: p.id,
        age: p.age,
        height: p.height,
        weight: p.weight,
        goal: p.goal,
        experienceLevel: p.experienceLevel,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      });
    }
    const inserted = await db
      .insert(userProfiles)
      .values({ age, height, weight, goal, experienceLevel })
      .returning();
    const p = inserted[0];
    return res.json({
      id: p.id,
      age: p.age,
      height: p.height,
      weight: p.weight,
      goal: p.goal,
      experienceLevel: p.experienceLevel,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const profiles = await db.select().from(userProfiles).limit(1);
    if (profiles.length === 0) {
      return res.status(400).json({ error: "no_profile", message: "Set up your profile first" });
    }
    const profile = profiles[0];

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system:
        "You are a certified personal trainer. Always respond with valid JSON only. No preamble, no explanation, no markdown code fences. Raw JSON only.",
      messages: [
        {
          role: "user",
          content: `Generate a personalized 7-day workout plan for this user: Age: ${profile.age}, Height: ${profile.height}, Weight: ${profile.weight}, Goal: ${profile.goal}, Experience level: ${profile.experienceLevel}. Return a JSON array of 7 objects. Each object must have: "day" (e.g. "Monday"), "focus" (e.g. "Upper Body Strength"), "exercises" (array of objects with: "name", "sets" (number), "reps" (string like "10-12"), "rest" (string like "60 seconds"), "notes" (optional string)).`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      return res.status(500).json({ error: "ai_error", message: "Unexpected AI response type" });
    }

    let plan: unknown;
    try {
      plan = JSON.parse(block.text);
    } catch {
      return res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
    }

    const inserted = await db
      .insert(workoutPlans)
      .values({ profileId: profile.id, plan })
      .returning();

    const wp = inserted[0];
    return res.json({
      id: wp.id,
      profileId: wp.profileId,
      plan: wp.plan,
      createdAt: wp.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

router.get("/plans", async (req, res) => {
  try {
    const plans = await db.select().from(workoutPlans).orderBy(workoutPlans.createdAt);
    return res.json(
      plans.map((wp) => ({
        id: wp.id,
        profileId: wp.profileId,
        plan: wp.plan,
        createdAt: wp.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

router.get("/plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const plans = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    if (plans.length === 0) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" });
    }
    const wp = plans[0];
    return res.json({
      id: wp.id,
      profileId: wp.profileId,
      plan: wp.plan,
      createdAt: wp.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

router.post("/logs", async (req, res) => {
  try {
    const { workoutPlanId, dayIndex, exerciseName, completed } = req.body;
    const existing = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.workoutPlanId, workoutPlanId));

    const existing_entry = existing.find(
      (l) => l.dayIndex === dayIndex && l.exerciseName === exerciseName
    );

    if (existing_entry) {
      const updated = await db
        .update(workoutLogs)
        .set({ completed, completedAt: completed ? new Date() : null })
        .where(eq(workoutLogs.id, existing_entry.id))
        .returning();
      const l = updated[0];
      return res.json({
        id: l.id,
        workoutPlanId: l.workoutPlanId,
        dayIndex: l.dayIndex,
        exerciseName: l.exerciseName,
        completed: l.completed,
        completedAt: l.completedAt?.toISOString() ?? null,
      });
    }

    const inserted = await db
      .insert(workoutLogs)
      .values({
        workoutPlanId,
        dayIndex,
        exerciseName,
        completed,
        completedAt: completed ? new Date() : null,
      })
      .returning();
    const l = inserted[0];
    return res.json({
      id: l.id,
      workoutPlanId: l.workoutPlanId,
      dayIndex: l.dayIndex,
      exerciseName: l.exerciseName,
      completed: l.completed,
      completedAt: l.completedAt?.toISOString() ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

router.get("/logs/:planId", async (req, res) => {
  try {
    const planId = parseInt(req.params.planId);
    const logs = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.workoutPlanId, planId));
    return res.json(
      logs.map((l) => ({
        id: l.id,
        workoutPlanId: l.workoutPlanId,
        dayIndex: l.dayIndex,
        exerciseName: l.exerciseName,
        completed: l.completed,
        completedAt: l.completedAt?.toISOString() ?? null,
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: String(err) });
  }
});

export default router;
