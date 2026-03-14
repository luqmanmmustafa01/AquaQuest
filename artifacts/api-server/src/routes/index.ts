import { Router, type IRouter } from "express";
import healthRouter from "./health";
import questsRouter from "./quests";
import creaturesRouter from "./creatures";
import achievementsRouter from "./achievements";
import workoutsRouter from "./workouts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/quests", questsRouter);
router.use("/creatures", creaturesRouter);
router.use("/achievements", achievementsRouter);
router.use("/workouts", workoutsRouter);

export default router;
