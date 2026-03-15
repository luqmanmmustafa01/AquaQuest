import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { duasTable, deenProgressTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;
const TODAY = () => new Date().toISOString().slice(0, 10);

/* ─── DUAS ─── */

router.get("/duas", async (_req, res) => {
  try {
    const duas = await db
      .select()
      .from(duasTable)
      .where(eq(duasTable.userId, DEFAULT_USER_ID))
      .orderBy(duasTable.createdAt);
    res.json(duas.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

const CreateDuaBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.enum(["personal", "family", "health", "guidance", "gratitude"]).default("personal"),
});

router.post("/duas", async (req, res) => {
  try {
    const body = CreateDuaBody.parse(req.body);
    const [dua] = await db
      .insert(duasTable)
      .values({ ...body, userId: DEFAULT_USER_ID })
      .returning();
    res.status(201).json({ ...dua, createdAt: dua.createdAt.toISOString() });
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

router.delete("/duas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db
      .delete(duasTable)
      .where(and(eq(duasTable.id, id), eq(duasTable.userId, DEFAULT_USER_ID)));
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

/* ─── DEEN PROGRESS ─── */

async function getOrCreateProgress(date: string) {
  const [existing] = await db
    .select()
    .from(deenProgressTable)
    .where(
      and(
        eq(deenProgressTable.userId, DEFAULT_USER_ID),
        eq(deenProgressTable.date, date)
      )
    );
  if (existing) return existing;
  const [created] = await db
    .insert(deenProgressTable)
    .values({
      userId: DEFAULT_USER_ID,
      date,
      prayersCompleted: [],
      quranPages: 0,
      dhikrCompleted: [],
      sunnahCompleted: [],
      deenScore: 0,
      prayerStreak: 0,
      quranStreak: 0,
    })
    .returning();
  return created;
}

router.get("/progress", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : TODAY();
    const progress = await getOrCreateProgress(date);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

const UpdateProgressBody = z.object({
  prayersCompleted: z.array(z.string()).optional(),
  quranPages: z.number().int().min(0).optional(),
  dhikrCompleted: z.array(z.string()).optional(),
  sunnahCompleted: z.array(z.string()).optional(),
  deenScore: z.number().int().min(0).max(100).optional(),
  prayerStreak: z.number().int().min(0).optional(),
  quranStreak: z.number().int().min(0).optional(),
});

router.patch("/progress", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : TODAY();
    const body = UpdateProgressBody.parse(req.body);
    await getOrCreateProgress(date);
    const [updated] = await db
      .update(deenProgressTable)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(deenProgressTable.userId, DEFAULT_USER_ID),
          eq(deenProgressTable.date, date)
        )
      )
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

export default router;
