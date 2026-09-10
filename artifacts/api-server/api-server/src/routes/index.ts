import { Router, type IRouter } from "express";
import healthRouter from "./health";
import controlRoomRouter from "./control-room";
import agentPlansRouter from "./agent-plans";
import autonomousExecutionRouter from "./autonomous-execution";

const router: IRouter = Router();

router.use(healthRouter);
router.use(controlRoomRouter);
router.use(agentPlansRouter);
router.use(autonomousExecutionRouter);

export default router;
