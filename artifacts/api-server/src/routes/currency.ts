import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userCurrencyTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

async function getOrCreateCurrency() {
  const [existing] = await db
    .select()
    .from(userCurrencyTable)
    .where(eq(userCurrencyTable.userId, DEFAULT_USER_ID));
  if (existing) return existing;
  const [created] = await db
    .insert(userCurrencyTable)
    .values({ userId: DEFAULT_USER_ID, coins: 0, gems: 0, spinTickets: 0 })
    .returning();
  return created;
}

router.get("/", async (_req, res) => {
  try {
    const currency = await getOrCreateCurrency();
    res.json(currency);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

const UpdateCurrencyBody = z.object({
  coins: z.number().int().optional(),
  gems: z.number().int().optional(),
  spinTickets: z.number().int().optional(),
});

router.patch("/", async (req, res) => {
  try {
    const body = UpdateCurrencyBody.parse(req.body);
    await getOrCreateCurrency();
    const [updated] = await db
      .update(userCurrencyTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(userCurrencyTable.userId, DEFAULT_USER_ID))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "validation_error", message: String(err) });
  }
});

export default router;
