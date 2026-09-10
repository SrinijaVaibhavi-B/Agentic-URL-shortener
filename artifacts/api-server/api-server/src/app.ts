import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { rateLimit, securityHeaders } from "./middlewares/security";

const app: Express = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(securityHeaders);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", rateLimit);
app.use("/api", router);
app.use("/api/{*path}", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});
app.use(
  (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    const validationError =
      error instanceof Error && error.name === "ZodError";
    if (validationError) {
      req.log.warn({ error }, "Request validation failed");
      res.status(400).json({ error: "Request validation failed" });
      return;
    }
    req.log.error({ error }, "Unhandled API request error");
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
