import assert from "node:assert/strict";
import test from "node:test";
import {
  allowlistedCommand,
  canTransition,
  boundedContext,
  containsKnownSymlink,
  contextPathAllowed,
  patchPaths,
  safeWorktreePath,
  sanitizedValidationEnv,
  snapshotPathAllowed,
  scopeHash,
  leaseTransitionAllowed,
  existingDecisionOutcome,
  rejectionDraftCommitAllowed,
  validateProposalBounds,
  validatePatchPath,
  validationTargetAllowed,
  workerFinalizationAllowed,
} from "./execution-policy";

test("patch policy confines normal changes and gates schema/auth", () => {
  assert.equal(validatePatchPath("artifacts/api-server/src/lib/x.ts").allowed, true);
  assert.equal(validatePatchPath("../secret").allowed, false);
  assert.equal(validatePatchPath("artifacts/api-server/.env").allowed, false);
  assert.equal(validatePatchPath("pnpm-lock.yaml").allowed, false);
  assert.equal(validatePatchPath("artifacts/api-server/src/middlewares/operator-auth.ts").allowed, false);
  assert.equal(validatePatchPath("artifacts/api-server/src/middlewares/operator-auth.ts", true).allowed, true);
  assert.deepEqual(patchPaths("--- a/artifacts/api-server/a.ts\n+++ b/artifacts/api-server/a.ts"), ["artifacts/api-server/a.ts"]);
});

test("command allowlist is exact", () => {
  assert.deepEqual(allowlistedCommand("libs:build"), ["pnpm", "run", "typecheck:libs"]);
  assert.deepEqual(allowlistedCommand("api:test"), ["pnpm", "--filter", "@workspace/api-server", "run", "test"]);
  assert.equal(allowlistedCommand("sh"), undefined);
});

test("lifecycle rejects unsafe jumps", () => {
  assert.equal(canTransition("queued", "running"), true);
  assert.equal(canTransition("queued", "completed"), false);
  assert.equal(canTransition("completed", "running"), false);
});

test("scope hash is stable and scope sensitive", () => {
  const input = { request: " change ", requirements: ["a"], assumptions: [], risks: [], tasks: [{ id: "1" }], highRisk: false, feedback: null, revisionNonce: "revision-1" };
  assert.equal(scopeHash(input), scopeHash({ ...input }));
  assert.notEqual(scopeHash(input), scopeHash({ ...input, highRisk: true }));
  assert.notEqual(scopeHash(input), scopeHash({ ...input, revisionNonce: "revision-2" }));
});

test("repository context excludes generated/secrets and stays bounded", () => {
  assert.equal(contextPathAllowed("artifacts/api-server/src/app.ts"), true);
  assert.equal(contextPathAllowed("artifacts/api-server/.env"), false);
  assert.equal(contextPathAllowed("lib/api-zod/src/generated/api.ts"), false);
  const context = boundedContext([
    { path: "artifacts/api-server/src/a.ts", content: "a".repeat(50) },
    { path: "artifacts/api-server/.env", content: "secret" },
  ], 60);
  assert.match(context, /a{20}/);
  assert.doesNotMatch(context, /secret/);
  assert.ok(context.length <= 60);
});

test("workspace snapshots include generated contracts but exclude outputs and secrets", () => {
  assert.equal(snapshotPathAllowed("lib/api-zod/src/generated/api.ts"), true);
  assert.equal(snapshotPathAllowed("lib/db/src/schema/autonomous-execution.ts"), true);
  assert.equal(snapshotPathAllowed("artifacts/api-server/dist/index.mjs"), false);
  assert.equal(snapshotPathAllowed("artifacts/api-server/.env"), false);
});

test("safe resolved writes cannot escape worktree and proposals are bounded", () => {
  assert.deepEqual(safeWorktreePath("/tmp/worktree", "artifacts/api-server/src/a.ts"), {
    allowed: true, path: "/tmp/worktree/artifacts/api-server/src/a.ts",
  });
  assert.equal(safeWorktreePath("/tmp/worktree", "../outside.ts").allowed, false);
  assert.equal(safeWorktreePath("/tmp/worktree", "artifacts/api-server/node_modules/evil.js").allowed, false);
  assert.equal(safeWorktreePath("/tmp/worktree", "artifacts/api-server/package.json").allowed, false);
  assert.equal(safeWorktreePath("/tmp/worktree", "artifacts/api-server/vite.config.ts").allowed, false);
  assert.equal(validateProposalBounds([{ path: "a", action: "delete" as "create", content: "" }]), "Proposal contains an unsupported action");
  assert.match(validateProposalBounds(Array.from({ length: 13 }, (_, i) => ({ path: `${i}`, action: "create" as const, content: "" }))) ?? "", /exceeds 12/);
});

test("validation environment contains no inherited secrets and lease completion is fenced", () => {
  const env = sanitizedValidationEnv({ path: "/bin", home: "/tmp/home", temp: "/tmp/temp" });
  assert.deepEqual(Object.keys(env).sort(), ["BASE_PATH", "CI", "HOME", "NODE_ENV", "NO_COLOR", "PATH", "PORT", "TEMP", "TMP", "TMPDIR"]);
  assert.equal("DATABASE_URL" in env, false);
  assert.equal(leaseTransitionAllowed("running", true, "completed"), false);
  assert.equal(leaseTransitionAllowed("running", false, "completed"), true);
  assert.equal(validationTargetAllowed("/tmp/validation", "/repo", false), true);
  assert.equal(validationTargetAllowed("/repo", "/repo", false), false);
  assert.equal(validationTargetAllowed("/tmp/validation", "/repo", true), false);
});

test("stop racing finalization deterministically wins the worker CAS", () => {
  assert.equal(workerFinalizationAllowed("running", ["running"], "worker-a", "worker-a", false, false), true);
  assert.equal(workerFinalizationAllowed("stopping", ["running"], "worker-a", "worker-a", true, false), false);
  assert.equal(workerFinalizationAllowed("replanning", ["running"], "worker-a", "worker-a", true, false), false);
  assert.equal(workerFinalizationAllowed("running", ["running"], "worker-b", "worker-a", false, false), false);
});

test("duplicate decisions are idempotent only for the same approved run", () => {
  assert.equal(existingDecisionOutcome("approve", "approve", true), "return_existing_run");
  assert.equal(existingDecisionOutcome("approve", "request_changes", true), "conflict");
  assert.equal(existingDecisionOutcome("approve", "approve", false), "conflict");
  assert.equal(rejectionDraftCommitAllowed("revision-1", "revision-1", false), true);
  assert.equal(rejectionDraftCommitAllowed("revision-1", "revision-2", false), false);
  assert.equal(rejectionDraftCommitAllowed("revision-1", "revision-1", true), false);
  assert.equal(containsKnownSymlink("artifacts/api-server/src/link/file.ts", new Set(["artifacts/api-server/src/link"])), true);
  assert.equal(containsKnownSymlink("artifacts/api-server/src/file.ts", new Set(["artifacts/api-server/src/file.ts"])), true);
});