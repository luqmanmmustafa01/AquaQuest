import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { fishPool, userFish, oceanSummons, userStardust, userSummonPity } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { userCurrencyTable } from "@workspace/db/schema";

const router = Router();
const USER_ID = 1;

const RARITY_ORDER = ["common", "rare", "epic", "legendary", "mythical"];

function getRarityMinIndex(rarity: string): number {
  return RARITY_ORDER.indexOf(rarity);
}

function determineRarity(epicPity: number, legendaryPity: number, isFeatured: boolean): string {
  if (legendaryPity >= 99) return "legendary";
  if (epicPity >= 49) {
    return Math.random() < 0.3 ? "legendary" : "epic";
  }
  const roll = Math.random();
  const mythicalCutoff = 0.0025;
  const legendaryCutoff = mythicalCutoff + (isFeatured ? 0.05 : 0.0275);
  const epicCutoff = legendaryCutoff + 0.12;
  const rareCutoff = epicCutoff + 0.25;

  if (roll < mythicalCutoff) return "mythical";
  if (roll < legendaryCutoff) return "legendary";
  if (roll < epicCutoff) return "epic";
  if (roll < rareCutoff) return "rare";
  return "common";
}

async function getOrCreatePity() {
  const rows = await db.select().from(userSummonPity).where(eq(userSummonPity.userId, USER_ID)).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(userSummonPity).values({ userId: USER_ID }).returning();
  return inserted[0];
}

async function getOrCreateStardust() {
  const rows = await db.select().from(userStardust).where(eq(userStardust.userId, USER_ID)).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(userStardust).values({ userId: USER_ID, amount: 0 }).returning();
  return inserted[0];
}

async function getOrCreateCurrency() {
  const rows = await db.select().from(userCurrencyTable).where(eq(userCurrencyTable.userId, USER_ID)).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(userCurrencyTable).values({ userId: USER_ID, coins: 0, gems: 0, spinTickets: 0, stardust: 0 }).returning();
  return inserted[0];
}

router.get("/pool", async (_req, res) => {
  const fish = await db.select().from(fishPool).where(eq(fishPool.isActive, true)).orderBy(fishPool.rarity, fishPool.name);
  res.json(fish);
});

router.get("/collection", async (_req, res) => {
  const rows = await db
    .select({
      id: userFish.id,
      fishId: userFish.fishId,
      obtainedAt: userFish.obtainedAt,
      isCompanion: userFish.isCompanion,
      evolutionStage: userFish.evolutionStage,
      name: fishPool.name,
      rarity: fishPool.rarity,
      description: fishPool.description,
      emoji: fishPool.emoji,
      isFeatured: fishPool.isFeatured,
    })
    .from(userFish)
    .leftJoin(fishPool, eq(userFish.fishId, fishPool.id))
    .where(eq(userFish.userId, USER_ID))
    .orderBy(desc(userFish.obtainedAt));

  const stardust = await getOrCreateStardust();
  const pity = await getOrCreatePity();

  res.json({
    fish: rows,
    stardust: stardust.amount,
    epicPity: pity.epicPity,
    legendaryPity: pity.legendaryPity,
    totalSummons: pity.totalSummons,
  });
});

router.get("/stardust", async (_req, res) => {
  const stardust = await getOrCreateStardust();
  res.json({ stardust: stardust.amount });
});

const pullSchema = z.object({
  banner: z.enum(["main", "featured"]),
  count: z.union([z.literal(1), z.literal(10)]),
  currency: z.enum(["tickets", "coins"]),
});

router.post("/pull", async (req, res) => {
  const parsed = pullSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { banner, count, currency } = parsed.data;
  const isFeatured = banner === "featured";

  const ticketCost = count === 1 ? 1 : 8;
  const coinCost = count === 1 ? 100 : 800;

  const currencyRow = await getOrCreateCurrency();

  if (currency === "tickets") {
    if (currencyRow.spinTickets < ticketCost) {
      res.status(400).json({ error: `Not enough Spin Tickets. Need ${ticketCost}, have ${currencyRow.spinTickets}.` });
      return;
    }
    await db.update(userCurrencyTable)
      .set({ spinTickets: currencyRow.spinTickets - ticketCost })
      .where(eq(userCurrencyTable.userId, USER_ID));
  } else {
    if (currencyRow.coins < coinCost) {
      res.status(400).json({ error: `Not enough Coins. Need ${coinCost}, have ${currencyRow.coins}.` });
      return;
    }
    await db.update(userCurrencyTable)
      .set({ coins: currencyRow.coins - coinCost })
      .where(eq(userCurrencyTable.userId, USER_ID));
  }

  let pity = await getOrCreatePity();
  const allFish = await db.select().from(fishPool).where(eq(fishPool.isActive, true));

  const existingFishIds = new Set(
    (await db.select({ fishId: userFish.fishId }).from(userFish).where(eq(userFish.userId, USER_ID)))
      .map((r) => r.fishId)
  );

  const results: Array<{
    fish: typeof allFish[0];
    isDuplicate: boolean;
    stardustEarned: number;
  }> = [];

  let totalStardustEarned = 0;
  let newEpicPity = pity.epicPity;
  let newLegendaryPity = pity.legendaryPity;
  let newTotalSummons = pity.totalSummons;

  for (let i = 0; i < count; i++) {
    newEpicPity++;
    newLegendaryPity++;
    newTotalSummons++;

    const rarity = determineRarity(newEpicPity - 1, newLegendaryPity - 1, isFeatured);
    const rarityIndex = getRarityMinIndex(rarity);

    let eligible = allFish.filter((f) => f.rarity === rarity);

    if (eligible.length === 0) {
      eligible = allFish.filter((f) => getRarityMinIndex(f.rarity) >= rarityIndex);
    }

    let selectedFish = eligible[Math.floor(Math.random() * eligible.length)];

    if (isFeatured && (rarity === "legendary") && Math.random() < 0.7) {
      const featuredFish = eligible.find((f) => f.isFeatured);
      if (featuredFish) selectedFish = featuredFish;
    }

    if (getRarityMinIndex(rarity) >= getRarityMinIndex("epic")) {
      newEpicPity = 0;
    }
    if (getRarityMinIndex(rarity) >= getRarityMinIndex("legendary")) {
      newLegendaryPity = 0;
    }

    const isDuplicate = existingFishIds.has(selectedFish.id);
    let stardustEarned = 0;

    if (isDuplicate) {
      stardustEarned = 10;
      totalStardustEarned += 10;
    } else {
      await db.insert(userFish).values({
        userId: USER_ID,
        fishId: selectedFish.id,
      });
      existingFishIds.add(selectedFish.id);
    }

    await db.insert(oceanSummons).values({
      userId: USER_ID,
      fishId: selectedFish.id,
      banner,
      pityCount: newTotalSummons,
    });

    results.push({ fish: selectedFish, isDuplicate, stardustEarned });
  }

  await db.update(userSummonPity)
    .set({
      epicPity: newEpicPity,
      legendaryPity: newLegendaryPity,
      totalSummons: newTotalSummons,
      updatedAt: new Date(),
    })
    .where(eq(userSummonPity.userId, USER_ID));

  if (totalStardustEarned > 0) {
    const stardust = await getOrCreateStardust();
    await db.update(userStardust)
      .set({ amount: stardust.amount + totalStardustEarned, updatedAt: new Date() })
      .where(eq(userStardust.userId, USER_ID));
  }

  const updatedStardust = await getOrCreateStardust();
  const updatedCurrency = await getOrCreateCurrency();

  res.json({
    results,
    totalStardustEarned,
    stardust: updatedStardust.amount,
    currency: {
      coins: updatedCurrency.coins,
      gems: updatedCurrency.gems,
      spinTickets: updatedCurrency.spinTickets,
    },
    epicPity: newEpicPity,
    legendaryPity: newLegendaryPity,
    totalSummons: newTotalSummons,
  });
});

const stardustShopSchema = z.object({
  action: z.literal("buy_ticket"),
});

router.post("/stardust-shop", async (req, res) => {
  const parsed = stardustShopSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const stardust = await getOrCreateStardust();
  if (stardust.amount < 100) {
    res.status(400).json({ error: `Not enough Stardust. Need 100, have ${stardust.amount}.` });
    return;
  }

  await db.update(userStardust)
    .set({ amount: stardust.amount - 100, updatedAt: new Date() })
    .where(eq(userStardust.userId, USER_ID));

  const currencyRow = await getOrCreateCurrency();
  await db.update(userCurrencyTable)
    .set({ spinTickets: currencyRow.spinTickets + 1 })
    .where(eq(userCurrencyTable.userId, USER_ID));

  const updatedStardust = await getOrCreateStardust();
  const updatedCurrency = await getOrCreateCurrency();

  res.json({
    stardust: updatedStardust.amount,
    spinTickets: updatedCurrency.spinTickets,
    message: "Exchanged 100 Stardust for 1 Spin Ticket!",
  });
});

export default router;
