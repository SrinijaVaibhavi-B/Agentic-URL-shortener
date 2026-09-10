import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getReadiness } from "../lib/production-state";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res): Promise<void> => {
  try {
    const readiness = await getReadiness();
    res.status(readiness.database && readiness.auditChain ? 200 : 503).json({
      status:
        readiness.database && readiness.auditChain ? "ready" : "degraded",
      checks: readiness,
    });
  } catch (error) {
    res.status(503).json({
      status: "unavailable",
      error: error instanceof Error ? error.message : "Readiness check failed",
    });
  }
});

export default router;
