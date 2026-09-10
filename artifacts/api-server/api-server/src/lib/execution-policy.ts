import { createHash } from "node:crypto";
import path from "node:path";

const NORMAL_PREFIXES = [
  "artifacts/api-server/",
  "artifacts/agentic-url-shortener/",
  "docs/",
];
const NORMAL_FILES = new Set(["README.md"]);
const GATED_PREFIXES = ["lib/db/src/schema/"];
const GENERATED = [
  "lib/api-client-react/src/generated/",
  "lib/api-zod/src/generated/",
];
const LOCKFILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);
const PROTECTED_BUILD_FILES = new Set([
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "vite.config.js",
  "build.mjs",
]);

export function scopeHash(value: {
  request: string;
  requirements: string[];
  assumptions: string[];
  risks: string[];
  tasks: unknown[];
  highRisk: boolean;
  feedback: string | null;
  revisionNonce: string;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      request: value.request.trim(),
      requirements: value.requirements,
      assumptions: value.assumptions,
      risks: value.risks,
      tasks: value.tasks,
      highRisk: value.highRisk,
      feedback: value.feedback,
      revisionNonce: value.revisionNonce,
    }))
    .digest("hex");
}

export function validatePatchPath(file: string, highRiskApproved = false) {
  const normalized = file.replaceAll("\\", "/").replace(/^[ab]\//, "");
  if (!normalized || path.posix.isAbsolute(normalized) || normalized.includes("..")) {
    return { allowed: false, reason: "path traversal or absolute path" };
  }
  if (normalized.split("/").some((part) => part.startsWith("."))) {
    return { allowed: false, reason: "dotfiles are protected" };
  }
  if (LOCKFILES.has(path.posix.basename(normalized))) {
    return { allowed: false, reason: "lockfiles are protected" };
  }
  if (normalized.split("/").includes("node_modules")) {
    return { allowed: false, reason: "dependency directories are protected" };
  }
  if (PROTECTED_BUILD_FILES.has(path.posix.basename(normalized)) || /(?:^|\/)[^/]*\.config\.[cm]?[jt]s$/.test(normalized)) {
    return { allowed: false, reason: "package manifests and build configuration are protected" };
  }
  if (GENERATED.some((prefix) => normalized.startsWith(prefix))) {
    return { allowed: false, reason: "generated API files are protected" };
  }
  if (/(\b|[/_-])(secret|credential|token|private[-_]?key)(\b|[._/-])/i.test(normalized)) {
    return { allowed: false, reason: "secret-bearing paths are protected" };
  }
  const authPath = /(^|\/)(auth|middlewares\/operator-auth|clerk)/i.test(normalized);
  if (authPath && !highRiskApproved) {
    return { allowed: false, reason: "authentication changes require explicit high-risk approval" };
  }
  if (NORMAL_FILES.has(normalized) || NORMAL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return { allowed: true };
  }
  if (highRiskApproved && GATED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return { allowed: true };
  }
  return { allowed: false, reason: "path is outside the approved repository scope" };
}

export function contextPathAllowed(file: string) {
  const result = validatePatchPath(file, false);
  if (!result.allowed) return false;
  return !/\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|map)$/i.test(file);
}

export function snapshotPathAllowed(file: string) {
  const normalized = path.posix.normalize(file.replaceAll("\\", "/"));
  if (
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => part.startsWith(".")) ||
    normalized.split("/").includes("node_modules") ||
    normalized.split("/").includes("dist") ||
    /(\b|[/_-])(secret|credential|token|private[-_]?key)(\b|[._/-])/i.test(normalized)
  ) {
    return false;
  }
  return [
    "artifacts/api-server/",
    "artifacts/agentic-url-shortener/",
    "docs/",
    "lib/db/",
    "lib/api-zod/",
    "lib/api-client-react/",
    "lib/api-spec/",
    "lib/integrations-openai-ai-server/",
  ].some((prefix) => normalized.startsWith(prefix)) ||
    normalized === "README.md" ||
    normalized === "package.json" ||
    normalized === "pnpm-lock.yaml" ||
    normalized === "pnpm-workspace.yaml" ||
    normalized === "tsconfig.json";
}

export function boundedContext(entries: Array<{ path: string; content: string }>, limit = 120_000) {
  let result = "";
  for (const entry of entries) {
    if (!contextPathAllowed(entry.path) || result.length >= limit) continue;
    const header = `\n--- ${entry.path} ---\n`;
    const available = limit - result.length - header.length;
    if (available <= 0) break;
    result += header + entry.content.slice(0, Math.min(12_000, available));
  }
  return result;
}

export function safeWorktreePath(worktree: string, file: string, highRiskApproved = false) {
  const policy = validatePatchPath(file, highRiskApproved);
  if (!policy.allowed) return { allowed: false as const, reason: policy.reason };
  const resolvedRoot = path.resolve(worktree);
  const resolved = path.resolve(resolvedRoot, file);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    return { allowed: false as const, reason: "resolved path escapes worktree" };
  }
  return { allowed: true as const, path: resolved };
}

export interface ProposedFileChange {
  path: string;
  action: "create" | "update";
  content: string;
}

export function validateProposalBounds(changes: ProposedFileChange[]) {
  if (changes.length === 0) return "Proposal contains no changes";
  if (changes.length > 12) return "Proposal exceeds 12 file changes";
  const seen = new Set<string>();
  let total = 0;
  for (const change of changes) {
    if (!["create", "update"].includes(change.action)) return "Proposal contains an unsupported action";
    if (typeof change.path !== "string" || typeof change.content !== "string") return "Proposal contains invalid fields";
    if (seen.has(change.path)) return `Proposal repeats path ${change.path}`;
    seen.add(change.path);
    if (change.content.length > 60_000) return `Proposal file ${change.path} exceeds 60000 characters`;
    total += change.content.length;
  }
  return total > 180_000 ? "Proposal exceeds 180000 total characters" : undefined;
}

export function sanitizedValidationEnv(input: { path: string; home: string; temp: string }) {
  return {
    PATH: input.path,
    HOME: input.home,
    TMPDIR: input.temp,
    TMP: input.temp,
    TEMP: input.temp,
    CI: "1",
    NODE_ENV: "test",
    PORT: "4173",
    BASE_PATH: "/",
    NO_COLOR: "1",
  };
}

export function leaseTransitionAllowed(status: string, stopRequested: boolean, target: string) {
  if (stopRequested && target === "completed") return false;
  return canTransition(status, target) || status === target;
}

export function validationTargetAllowed(validationRoot: string, repositoryRoot: string, hasGitMetadata: boolean) {
  return path.resolve(validationRoot) !== path.resolve(repositoryRoot) && !hasGitMetadata;
}

export function workerFinalizationAllowed(
  currentStatus: string,
  expectedStatuses: string[],
  currentLeaseOwner: string | null,
  expectedLeaseOwner: string,
  stopRequested: boolean,
  expectedStopRequested: boolean,
) {
  return expectedStatuses.includes(currentStatus)
    && currentLeaseOwner === expectedLeaseOwner
    && stopRequested === expectedStopRequested;
}

export function existingDecisionOutcome(existing: string, requested: string, hasRun: boolean) {
  if (existing !== requested) return "conflict" as const;
  if (requested === "approve" && hasRun) return "return_existing_run" as const;
  if (requested === "approve") return "conflict" as const;
  return "return_existing_rejection" as const;
}

export function rejectionDraftCommitAllowed(targetRevisionId: string, latestRevisionId: string | undefined, hasDecision: boolean) {
  return targetRevisionId === latestRevisionId && !hasDecision;
}

export function containsKnownSymlink(file: string, symlinkPaths: Set<string>) {
  const parts = file.replaceAll("\\", "/").split("/");
  return parts.some((_, index) => symlinkPaths.has(parts.slice(0, index + 1).join("/")));
}

export function patchPaths(patch: string) {
  const paths = new Set<string>();
  for (const line of patch.split("\n")) {
    const match = /^(?:---|\+\+\+) (?:[ab]\/)?([^\t]+)(?:\t.*)?$/.exec(line);
    if (match?.[1] && match[1] !== "/dev/null") paths.add(match[1]);
  }
  return [...paths];
}

const COMMANDS = new Map<string, string[]>([
  ["libs:build", ["pnpm", "run", "typecheck:libs"]],
  ["api:test", ["pnpm", "--filter", "@workspace/api-server", "run", "test"]],
  ["api:typecheck", ["pnpm", "--filter", "@workspace/api-server", "run", "typecheck"]],
  ["frontend:typecheck", ["pnpm", "--filter", "@workspace/agentic-url-shortener", "run", "typecheck"]],
  ["frontend:build", ["pnpm", "--filter", "@workspace/agentic-url-shortener", "run", "build"]],
]);

export function allowlistedCommand(name: string) {
  const command = COMMANDS.get(name);
  return command ? [...command] : undefined;
}

const TRANSITIONS: Record<string, Set<string>> = {
  queued: new Set(["running", "stopping", "failed"]),
  running: new Set(["replanning", "stopping", "completed", "failed"]),
  replanning: new Set(["awaiting_approval", "stopping", "failed"]),
  awaiting_approval: new Set(["queued", "stopping"]),
  stopping: new Set(["stopped"]),
  failed: new Set(["queued"]),
};

export function canTransition(from: string, to: string) {
  return TRANSITIONS[from]?.has(to) ?? false;
}