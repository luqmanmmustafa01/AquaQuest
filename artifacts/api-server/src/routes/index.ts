import { Router, type IRouter } from "express";
import healthRouter from "./health";
import questsRouter from "./quests";
import creaturesRouter from "./creatures";
import achievementsRouter from "./achievements";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/quests", questsRouter);
router.use("/creatures", creaturesRouter);
router.use("/achievements", achievementsRouter);

export default router;
