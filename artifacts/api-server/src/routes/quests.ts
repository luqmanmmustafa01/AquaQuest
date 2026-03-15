import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { questsTable } from "@workspace/db/schema";
import { insertQuestSchema, updateQuestSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  CreateQuestBody,
  UpdateQuestBody,
  GetQuestParams,
  UpdateQuestParams,
  DeleteQuestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const quests = await db.select().from(questsTable).orderBy(questsTable.createdAt);
    res.json(quests.map(q => ({
      ...q,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to fetch quests" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = CreateQuestBody.parse(req.body);
    const parsed = insertQuestSchema.parse({
      title: body.title,
      description: body.description ?? null,
      difficulty: body.difficulty,
      xpReward: body.xpReward,
      category: body.category,
      goalType: body.goalType,
      targetDate: body.targetDate ?? null,
    });
    const [quest] = await db.insert(questsTable).values(parsed).returning();
    res.status(201).json({
      ...quest,
      createdAt: quest.createdAt.toISOString(),
      updatedAt: quest.updatedAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = GetQuestParams.parse({ id: Number(req.params.id) });
    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, id));
    if (!quest) {
      return res.status(404).json({ error: "not_found", message: "Quest not found" });
    }
    res.json({
      ...quest,
      createdAt: quest.createdAt.toISOString(),
      updatedAt: quest.updatedAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = UpdateQuestParams.parse({ id: Number(req.params.id) });
    const body = UpdateQuestBody.parse(req.body);
    const updates = updateQuestSchema.parse({
      ...body,
      updatedAt: new Date(),
    });
    const [quest] = await db
      .update(questsTable)
      .set(updates)
      .where(eq(questsTable.id, id))
      .returning();
    if (!quest) {
      return res.status(404).json({ error: "not_found", message: "Quest not found" });
    }
    res.json({
      ...quest,
      createdAt: quest.createdAt.toISOString(),
      updatedAt: quest.updatedAt.toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteQuestParams.parse({ id: Number(req.params.id) });
    await db.delete(questsTable).where(eq(questsTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

export default router;
