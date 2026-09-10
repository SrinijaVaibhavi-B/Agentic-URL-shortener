import { Router, type IRouter } from "express";
import {
  CreateAgentPlanBody,
  CreateAgentPlanResponse,
} from "@workspace/api-zod";
import { generateAgentPlan } from "../lib/agent-planner";
import {
  actorFor,
  requireAuthenticatedOperator,
} from "../middlewares/operator-auth";

const router: IRouter = Router();
router.use(requireAuthenticatedOperator);

router.post("/agent/plans", async (req, res): Promise<void> => {
  const input = CreateAgentPlanBody.parse(req.body);
  if (!input.scenarioId && !input.changeRequest?.trim()) {
    res.status(400).json({ error: "A scenarioId or changeRequest is required" });
    return;
  }
  try {
    const plan = await generateAgentPlan({
      ...input,
      actorId: actorFor(req),
    });
    if (!plan) {
      res.status(404).json({ error: "Scenario not found" });
      return;
    }
    res.status(201).json(CreateAgentPlanResponse.parse(plan));
  } catch (error) {
    req.log.error({ error }, "AI planning failed");
    res.status(502).json({ error: "AI planning is temporarily unavailable" });
  }
});

export default router;