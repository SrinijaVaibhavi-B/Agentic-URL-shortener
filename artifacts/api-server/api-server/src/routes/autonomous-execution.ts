import { Router, type IRouter } from "express";
import {
  DecideAgentPlanBody,
  DecideAgentPlanParams,
  DecideAgentPlanResponse,
  GetAgentPlanParams,
  GetAgentPlanResponse,
  GetExecutionParams,
  GetExecutionReceiptParams,
  GetExecutionReceiptResponse,
  GetExecutionResponse,
  ListExecutionArtifactsParams,
  ListExecutionArtifactsResponse,
  ListExecutionEventsParams,
  ListExecutionEventsResponse,
  ReplanExecutionBody,
  ReplanExecutionParams,
  ReplanExecutionResponse,
  StopExecutionParams,
  StopExecutionResponse,
} from "@workspace/api-zod";
import {
  decidePlan,
  executionArtifacts,
  executionDetail,
  executionEvents,
  getPlan,
  receipt,
  replanExecution,
  stopExecution,
} from "../lib/autonomous-executor";
import { actorFor, requireAuthenticatedOperator } from "../middlewares/operator-auth";

const router: IRouter = Router();
router.use(requireAuthenticatedOperator);

router.get("/agent/plans/:planId", async (req, res): Promise<void> => {
  const { planId } = GetAgentPlanParams.parse(req.params);
  const plan = await getPlan(planId);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(GetAgentPlanResponse.parse(plan));
});

router.post("/agent/plans/:planId/approve", async (req, res): Promise<void> => {
  const { planId } = DecideAgentPlanParams.parse(req.params);
  const input = DecideAgentPlanBody.parse(req.body);
  try {
    const result = await decidePlan(planId, input, actorFor(req));
    if (!result) { res.status(404).json({ error: "Plan not found" }); return; }
    res.json(DecideAgentPlanResponse.parse(result));
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Plan decision rejected" });
  }
});

router.get("/executions/:executionId", async (req, res): Promise<void> => {
  const { executionId } = GetExecutionParams.parse(req.params);
  const run = await executionDetail(executionId);
  if (!run) { res.status(404).json({ error: "Execution not found" }); return; }
  res.json(GetExecutionResponse.parse(run));
});
router.get("/executions/:executionId/events", async (req, res): Promise<void> => {
  const { executionId } = ListExecutionEventsParams.parse(req.params);
  if (!(await executionDetail(executionId))) { res.status(404).json({ error: "Execution not found" }); return; }
  res.json(ListExecutionEventsResponse.parse(await executionEvents(executionId)));
});
router.get("/executions/:executionId/artifacts", async (req, res): Promise<void> => {
  const { executionId } = ListExecutionArtifactsParams.parse(req.params);
  if (!(await executionDetail(executionId))) { res.status(404).json({ error: "Execution not found" }); return; }
  res.json(ListExecutionArtifactsResponse.parse(await executionArtifacts(executionId)));
});
router.post("/executions/:executionId/replan", async (req, res): Promise<void> => {
  const { executionId } = ReplanExecutionParams.parse(req.params);
  const { feedback } = ReplanExecutionBody.parse(req.body);
  const plan = await replanExecution(executionId, feedback, actorFor(req));
  if (!plan) { res.status(404).json({ error: "Execution not found" }); return; }
  res.json(ReplanExecutionResponse.parse(plan));
});
router.post("/executions/:executionId/stop", async (req, res): Promise<void> => {
  const { executionId } = StopExecutionParams.parse(req.params);
  const run = await stopExecution(executionId);
  if (!run) { res.status(404).json({ error: "Execution not found" }); return; }
  res.json(StopExecutionResponse.parse(run));
});
router.get("/executions/:executionId/receipt", async (req, res): Promise<void> => {
  const { executionId } = GetExecutionReceiptParams.parse(req.params);
  const item = await receipt(executionId);
  if (!item) { res.status(404).json({ error: "Receipt not available" }); return; }
  res.json(GetExecutionReceiptResponse.parse(item));
});

export default router;