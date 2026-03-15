import { Router, type IRouter } from "express";
import healthRouter from "./health";
import questsRouter from "./quests";
import creaturesRouter from "./creatures";
import achievementsRouter from "./achievements";
import workoutsRouter from "./workouts";
import currencyRouter from "./currency";
import deenRouter from "./deen";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/quests", questsRouter);
router.use("/creatures", creaturesRouter);
router.use("/achievements", achievementsRouter);
router.use("/workouts", workoutsRouter);
router.use("/currency", currencyRouter);
router.use("/deen", deenRouter);

export default router;
