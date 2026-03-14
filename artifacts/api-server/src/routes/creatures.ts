import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { creaturesTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const creatures = await db.select().from(creaturesTable).orderBy(creaturesTable.discoveredAt);
    res.json(creatures.map(c => ({
      ...c,
      depthFound: c.depthFound,
      discoveredAt: c.discoveredAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to fetch creatures" });
  }
});

export default router;
