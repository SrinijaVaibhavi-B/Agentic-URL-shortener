import {
  Router,
  type IRouter,
  type Request,
} from "express";
import {
  ApproveRunParams,
  ApproveRunResponse,
  CreateRunBody,
  CreateRunResponse,
  CreateUrlBody,
  CreateUrlResponse,
  DeleteUrlParams,
  GetDashboardResponse,
  GetUrlAnalyticsParams,
  GetUrlAnalyticsResponse,
  GetUrlParams,
  GetUrlResponse,
  ListActivityResponse,
  ListRunsResponse,
  ListScenariosResponse,
  ListUrlsResponse,
  RetryRunParams,
  RetryRunResponse,
  RollbackRunParams,
  RollbackRunResponse,
  StopRunParams,
  StopRunResponse,
} from "@workspace/api-zod";
import {
  approveRun,
  startScenario,
  createUrl,
  getDashboard,
  deactivateUrl,
  getAnalytics,
  getUrl,
  listAudit,
  listRuns,
  listUrls,
  registerClick,
  recordRejectedUrl,
  retryRun,
  rollbackRun,
  stopRun,
  listScenarios,
} from "../lib/production-state";
import { validateDestination } from "../lib/url-policy";
import {
  actorFor,
  requireAuthenticatedOperator,
} from "../middlewares/operator-auth";

const router: IRouter = Router();

router.head("/go/:slug", async (req, res): Promise<void> => {
  const item = await getUrl(req.params.slug);
  if (!item || item.status !== "active") {
    res.status(404).end();
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, item.destination);
});

router.get("/go/:slug", async (req, res): Promise<void> => {
  const destination = await registerClick(req.params.slug, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    referrer: req.get("referer"),
    country: req.get("cf-ipcountry"),
  });
  if (!destination) {
    res.status(404).json({ error: "URL not found or paused" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, destination);
});

router.use(requireAuthenticatedOperator);

router.get("/dashboard", async (_req, res): Promise<void> => {
  res.json(GetDashboardResponse.parse(await getDashboard()));
});

router.get("/scenarios", async (_req, res): Promise<void> => {
  res.json(ListScenariosResponse.parse(await listScenarios()));
});

router.get("/runs", async (_req, res): Promise<void> => {
  res.json(ListRunsResponse.parse(await listRuns()));
});

router.post("/runs", async (req, res): Promise<void> => {
  const input = CreateRunBody.parse(req.body);
  const run = await startScenario(input.scenarioId, actorFor(req));
  if (!run) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }
  res.status(201).json(CreateRunResponse.parse(run));
});

router.post("/runs/:runId/approve", async (req, res): Promise<void> => {
  const { runId } = ApproveRunParams.parse(req.params);
  const run = await approveRun(runId, actorFor(req));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(ApproveRunResponse.parse(run));
});

router.post("/runs/:runId/retry", async (req, res): Promise<void> => {
  const { runId } = RetryRunParams.parse(req.params);
  const run = await retryRun(runId, actorFor(req));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(RetryRunResponse.parse(run));
});

router.post("/runs/:runId/rollback", async (req, res): Promise<void> => {
  const { runId } = RollbackRunParams.parse(req.params);
  const run = await rollbackRun(runId, actorFor(req));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(RollbackRunResponse.parse(run));
});

router.post("/runs/:runId/stop", async (req, res): Promise<void> => {
  const { runId } = StopRunParams.parse(req.params);
  const run = await stopRun(runId, actorFor(req));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(StopRunResponse.parse(run));
});

router.get("/urls", async (_req, res): Promise<void> => {
  res.json(ListUrlsResponse.parse(await listUrls()));
});

router.post("/urls", async (req, res): Promise<void> => {
  const input = CreateUrlBody.parse(req.body);
  let destination: string;
  try {
    destination = validateDestination(input.destination);
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Destination failed security policy validation";
    await recordRejectedUrl(
      `Destination was blocked before persistence: ${detail}.`,
      actorFor(req),
    );
    res.status(400).json({ error: detail });
    return;
  }
  try {
    const created = await createUrl({
      ...input,
      destination,
      owner: actorFor(req),
    });
    res.status(201).json(CreateUrlResponse.parse(created));
  } catch (error) {
    res.status(409).json({
      error: error instanceof Error ? error.message : "Unable to create URL",
    });
  }
});

router.get("/urls/:slug", async (req, res): Promise<void> => {
  const { slug } = GetUrlParams.parse(req.params);
  const item = await getUrl(slug);
  if (!item) {
    res.status(404).json({ error: "URL not found" });
    return;
  }
  res.json(GetUrlResponse.parse(item));
});

router.delete("/urls/:slug", async (req, res): Promise<void> => {
  const { slug } = DeleteUrlParams.parse(req.params);
  if (!(await deactivateUrl(slug, actorFor(req)))) {
    res.status(404).json({ error: "URL not found" });
    return;
  }
  res.status(204).send();
});

router.get("/urls/:slug/analytics", async (req, res): Promise<void> => {
  const { slug } = GetUrlAnalyticsParams.parse(req.params);
  const analytics = await getAnalytics(slug);
  if (!analytics) {
    res.status(404).json({ error: "URL not found" });
    return;
  }
  res.json(GetUrlAnalyticsResponse.parse(analytics));
});

router.get("/activity", async (_req, res): Promise<void> => {
  res.json(ListActivityResponse.parse(await listAudit()));
});

export default router;