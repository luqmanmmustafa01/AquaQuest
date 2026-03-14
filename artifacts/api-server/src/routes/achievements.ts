import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { achievementsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const achievements = await db.select().from(achievementsTable).orderBy(achievementsTable.id);
    res.json(achievements.map(a => ({
      ...a,
      unlockedAt: a.unlockedAt ? a.unlockedAt.toISOString() : null,
    })));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to fetch achievements" });
  }
});

export default router;
