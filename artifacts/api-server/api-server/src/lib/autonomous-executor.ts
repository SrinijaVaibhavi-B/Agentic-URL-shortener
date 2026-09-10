import { randomUUID } from "node:crypto";
import { access, chmod, cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  agentPlansTable,
  db,
  executionApprovalsTable,
  executionArtifactsTable,
  executionEventsTable,
  executionRunsTable,
  planRevisionsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  allowlistedCommand,
  boundedContext,
  contextPathAllowed,
  existingDecisionOutcome,
  patchPaths,
  rejectionDraftCommitAllowed,
  safeWorktreePath,
  sanitizedValidationEnv,
  snapshotPathAllowed,
  validatePatchPath,
  validationTargetAllowed,
  validateProposalBounds,
} from "./execution-policy";
import { generateAgentPlan, generateAgentPlanDraft } from "./agent-planner";
import { logger } from "./logger";

const MODEL = "gpt-5.6-terra";
const MAX_OUTPUT = 200_000;
const workerId = `worker-${process.pid}-${randomUUID()}`;
const active = new Set<string>();

function bounded(value: string) {
  return value.length <= MAX_OUTPUT ? value : `${value.slice(0, MAX_OUTPUT)}\n[truncated]`;
}

async function command(cwd: string, executable: string, args: string[], timeoutMs = 180_000) {
  return new Promise<{ code: number; output: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: { ...process.env, CI: "1", PORT: "4173", BASE_PATH: "/" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let output = "";
    const append = (chunk: Buffer) => { if (output.length < MAX_OUTPUT) output += chunk.toString(); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => {
      if (child.pid) {
        try { process.kill(-child.pid, "SIGTERM"); } catch { /* already exited */ }
        setTimeout(() => { try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already exited */ } }, 2_000).unref();
      }
    }, timeoutMs);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output: bounded(output) });
    });
  });
}

async function event(runId: string, type: string, message: string, level = "info", metadata: Record<string, unknown> = {}, leaseOwner?: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`execution-event:${runId}`}))`);
    if (leaseOwner) {
      const [owned] = await tx.select({
        id: executionRunsTable.id, status: executionRunsTable.status,
        stopRequested: executionRunsTable.stopRequested,
      }).from(executionRunsTable)
        .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, leaseOwner))).for("update");
      const allowedCancellationEvent =
        (type === "run.stopped" && owned?.status === "stopped") ||
        (type === "run.paused" && ["replanning", "awaiting_approval"].includes(owned?.status ?? ""));
      if (!owned || (owned.stopRequested && !allowedCancellationEvent)) {
        throw new Error("Stale or cancelled worker event rejected by lease fence");
      }
    }
    const [latest] = await tx.select({ sequence: executionEventsTable.sequence }).from(executionEventsTable)
      .where(eq(executionEventsTable.runId, runId)).orderBy(desc(executionEventsTable.sequence)).limit(1);
    await tx.insert(executionEventsTable).values({
      id: `event-${randomUUID()}`, runId, sequence: (latest?.sequence ?? 0) + 1,
      type, level, message: message.slice(0, 2000), metadata,
    });
  });
}

async function artifact(runId: string, kind: string, name: string, content: string, metadata: Record<string, unknown> = {}, leaseOwner?: string) {
  await db.transaction(async (tx) => {
    if (leaseOwner) {
      const [owned] = await tx.select({
        id: executionRunsTable.id, status: executionRunsTable.status,
        stopRequested: executionRunsTable.stopRequested,
      }).from(executionRunsTable)
        .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, leaseOwner))).for("update");
      if (!owned || (owned.stopRequested && !(kind === "receipt" && owned.status === "stopped"))) {
        throw new Error("Stale or cancelled worker artifact rejected by lease fence");
      }
    }
    await tx.insert(executionArtifactsTable).values({
      id: `artifact-${randomUUID()}`, runId, kind, name,
      content: bounded(content), metadata,
    });
  });
}

async function stopped(runId: string) {
  const [run] = await db.select({ stopRequested: executionRunsTable.stopRequested })
    .from(executionRunsTable).where(eq(executionRunsTable.id, runId));
  return run?.stopRequested ?? true;
}

async function repositoryRoot() {
  const result = await command(process.cwd(), "git", ["rev-parse", "--show-toplevel"], 10_000);
  if (result.code !== 0) throw new Error("Executor is not running inside the configured git repository");
  return result.output.trim();
}

async function installIsolatedDependencies(worktree: string) {
  const installed = await command(worktree, "pnpm", ["install", "--offline", "--frozen-lockfile", "--ignore-scripts"], 180_000);
  if (installed.code !== 0) throw new Error(`Offline isolated dependency install failed closed: ${installed.output}`);
  const fileMode = await command(worktree, "git", ["config", "core.fileMode", "false"], 10_000);
  if (fileMode.code !== 0) throw new Error(`Unable to disable temporary worktree mode tracking: ${fileMode.output}`);
  const writable = await command(worktree, "chmod", ["-R", "a+rwX", "."], 180_000);
  if (writable.code !== 0) throw new Error(`Unable to prepare unprivileged isolated workspace: ${writable.output}`);
}

async function isolatedCommand(worktree: string, repositoryRoot: string, executable: string, args: string[], timeoutMs = 180_000) {
  if (!validationTargetAllowed(worktree, repositoryRoot, false)) throw new Error("Validation command cannot target the repository worktree");
  try {
    await lstat(path.join(worktree, ".git"));
    throw new Error("Validation command cannot target a Git worktree or metadata-bearing directory");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const sandbox = await mkdtemp(path.join(tmpdir(), "agent-sandbox-"));
  const temp = path.join(sandbox, "private-tmp");
  const home = path.join(temp, "home");
  const privateVarTmp = path.join(sandbox, "private-var-tmp");
  const hiddenHome = path.join(sandbox, "hidden-home");
  const hiddenProc = path.join(sandbox, "hidden-proc");
  const hiddenRun = path.join(sandbox, "hidden-run");
  await Promise.all([
    mkdir(home, { recursive: true }),
    mkdir(temp, { recursive: true }),
    mkdir(privateVarTmp, { recursive: true }),
    mkdir(hiddenHome, { recursive: true }),
    mkdir(hiddenProc, { recursive: true }),
    mkdir(hiddenRun, { recursive: true }),
  ]);
  await Promise.all([chmod(home, 0o777), chmod(temp, 0o1777), chmod(privateVarTmp, 0o1777)]);
  const script = [
    "set -eu",
    "mount --make-rprivate /",
    `mount --bind ${JSON.stringify(worktree)} /mnt`,
    `mount --bind ${JSON.stringify(hiddenHome)} /home`,
    `mount --bind ${JSON.stringify(hiddenProc)} /proc`,
    `mount --bind ${JSON.stringify(hiddenRun)} /run`,
    `mount --bind ${JSON.stringify(privateVarTmp)} /var/tmp`,
    `mount --bind ${JSON.stringify(temp)} /tmp`,
    `exec /usr/bin/setpriv --bounding-set=-all --inh-caps=-all --ambient-caps=-all --no-new-privs -- /usr/bin/env -C /mnt -i PATH=${JSON.stringify(process.env.PATH ?? "/usr/bin:/bin")} HOME=/tmp/home TMPDIR=/tmp TMP=/tmp TEMP=/tmp CI=1 NODE_ENV=test PORT=4173 BASE_PATH=/ NO_COLOR=1 ${[executable, ...args].map((part) => JSON.stringify(part)).join(" ")}`,
  ].join("; ");
  try {
    return await new Promise<{ code: number; output: string }>((resolve, reject) => {
      const child = spawn("unshare", ["--user", "--map-root-user", "--mount", "--pid", "--net", "--fork", "sh", "-c", script], {
        cwd: "/",
        env: sanitizedValidationEnv({ path: process.env.PATH ?? "/usr/bin:/bin", home: "/", temp: "/" }),
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });
      let output = "";
      const append = (chunk: Buffer) => { if (output.length < MAX_OUTPUT) output += chunk.toString(); };
      child.stdout.on("data", append); child.stderr.on("data", append);
      const timer = setTimeout(() => {
        if (child.pid) {
          try { process.kill(-child.pid, "SIGTERM"); } catch { /* exited */ }
          setTimeout(() => { try { process.kill(-child.pid!, "SIGKILL"); } catch { /* exited */ } }, 2_000).unref();
        }
      }, timeoutMs);
      child.on("error", reject);
      child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, output: bounded(output) }); });
    });
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}

async function createGitFreeValidationCopy(worktree: string) {
  const validation = await mkdtemp(path.join(tmpdir(), "agent-validation-"));
  await cp(worktree, validation, {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
    filter: (source) => path.basename(source) !== ".git",
  });
  await rm(path.join(validation, ".git"), { recursive: true, force: true });
  try {
    await lstat(path.join(validation, ".git"));
    throw new Error("Git metadata crossed into disposable validation directory");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return validation;
}

async function collectRepositoryContext(worktree: string) {
  const listed = await command(worktree, "git", [
    "ls-files", "--cached", "--", "artifacts/api-server", "artifacts/agentic-url-shortener", "docs", "README.md",
  ], 30_000);
  if (listed.code !== 0) throw new Error(`Unable to inventory repository context: ${listed.output}`);
  const entries: Array<{ path: string; content: string }> = [];
  for (const file of listed.output.split("\n").filter(contextPathAllowed)) {
    try {
      entries.push({ path: file, content: await readFile(path.join(worktree, file), "utf8") });
    } catch {
      // A concurrently removed/non-text file is omitted rather than guessed.
    }
  }
  return boundedContext(entries);
}

async function snapshotWorkingTree(root: string, worktree: string) {
  const scopes = [
    "artifacts/api-server",
    "artifacts/agentic-url-shortener",
    "docs",
    "lib/db",
    "lib/api-zod",
    "lib/api-client-react",
    "lib/api-spec",
    "lib/integrations-openai-ai-server",
    "README.md",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
  ];
  const tracked = await command(root, "git", ["diff", "--binary", "HEAD", "--", ...scopes], 30_000);
  if (tracked.code !== 0) throw new Error(`Unable to snapshot tracked workspace changes: ${tracked.output}`);
  const changed = await command(root, "git", ["diff", "--name-only", "HEAD", "--", ...scopes], 30_000);
  if (changed.code !== 0) throw new Error(`Unable to validate tracked workspace changes: ${changed.output}`);
  for (const file of changed.output.split("\n").filter(Boolean)) {
    if (!snapshotPathAllowed(file)) throw new Error(`Unsafe workspace change excluded from snapshot: ${file}`);
  }
  if (tracked.output) {
    const snapshotPatch = path.join(worktree, ".workspace-snapshot.patch");
    await writeFile(snapshotPatch, tracked.output);
    const checked = await command(worktree, "git", ["apply", "--check", snapshotPatch], 30_000);
    if (checked.code !== 0) throw new Error(`Workspace snapshot did not apply cleanly: ${checked.output}`);
    const applied = await command(worktree, "git", ["apply", snapshotPatch], 30_000);
    if (applied.code !== 0) throw new Error(`Workspace snapshot failed: ${applied.output}`);
    await rm(snapshotPatch, { force: true });
  }
  const untracked = await command(root, "git", ["ls-files", "--others", "--exclude-standard", "--", ...scopes], 30_000);
  if (untracked.code !== 0) throw new Error(`Unable to inventory untracked workspace files: ${untracked.output}`);
  for (const file of untracked.output.split("\n").filter(Boolean)) {
    if (!snapshotPathAllowed(file)) continue;
    const source = path.join(root, file);
    const target = path.join(worktree, file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, force: false, errorOnExist: false });
  }
  const staged = await command(worktree, "git", ["add", "-A", "--", ...scopes], 30_000);
  if (staged.code !== 0) throw new Error(`Unable to stage workspace snapshot: ${staged.output}`);
  const committed = await command(worktree, "git", [
    "-c", "user.name=Autonomous Executor", "-c", "user.email=executor@localhost",
    "commit", "--allow-empty", "-m", "executor workspace snapshot",
  ], 30_000);
  if (committed.code !== 0) throw new Error(`Unable to commit workspace snapshot: ${committed.output}`);
  const baseline = await command(worktree, "git", ["rev-parse", "HEAD"], 10_000);
  if (baseline.code !== 0) throw new Error("Unable to capture workspace snapshot commit");
  return baseline.output.trim();
}

interface FileChange {
  path: string;
  action: "create" | "update";
  content: string;
}

async function generateProposal(request: string, requirements: string[], repositoryContext: string, feedback?: string) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "repository_file_edits", strict: true,
        schema: {
          type: "object", additionalProperties: false, required: ["changes", "summary"],
          properties: {
            summary: { type: "string" },
            changes: {
              type: "array", minItems: 1, maxItems: 12,
              items: {
                type: "object", additionalProperties: false,
                required: ["path", "action", "content"],
                properties: {
                  path: { type: "string" },
                  action: { type: "string", enum: ["create", "update"] },
                  content: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    messages: [
      { role: "system", content: "Return strict JSON only. changes must contain complete desired UTF-8 contents for each file, never a diff or partial snippet. Actions are create or update only; deletion is forbidden. Do not emit placeholders such as @@, TODO, or ellipses. Modify only artifacts/api-server, artifacts/agentic-url-shortener, docs, or README.md. Use only paths shown in repositoryContext unless creating one focused test or documentation file. Never modify dotfiles, secrets, lockfiles, generated API clients, database schema, or authentication unless the request explicitly requires and approves that high-risk scope. Keep the change minimal and production-safe. Include code, focused tests, and documentation/changelog updates whenever relevant to the request." },
      { role: "user", content: JSON.stringify({ request, requirements, validationFeedback: feedback ?? null, repositoryContext }) },
    ],
  }, { maxRetries: 2, timeout: 60_000 });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Patch generator returned no content");
  const parsed = JSON.parse(content) as { changes: FileChange[]; summary: string };
  if (!Array.isArray(parsed.changes) || typeof parsed.summary !== "string") {
    throw new Error("Model proposal failed structural validation");
  }
  return parsed;
}

async function writeProposal(worktree: string, changes: FileChange[], highRiskApproved: boolean) {
  const boundError = validateProposalBounds(changes);
  if (boundError) throw new Error(boundError);
  const targets: Array<{ change: FileChange; path: string }> = [];
  for (const change of changes) {
    const target = safeWorktreePath(worktree, change.path, highRiskApproved);
    if (!target.allowed) throw new Error(`${change.path}: ${target.reason}`);
    const rootReal = await realpath(worktree);
    let cursor = worktree;
    for (const segment of change.path.split("/").slice(0, -1)) {
      cursor = path.join(cursor, segment);
      try {
        const info = await lstat(cursor);
        if (info.isSymbolicLink()) throw new Error(`${change.path}: symbolic-link path components are forbidden`);
        if ((await realpath(cursor)) !== path.join(rootReal, ...path.relative(worktree, cursor).split(path.sep))) {
          throw new Error(`${change.path}: resolved parent path is unsafe`);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
        throw error;
      }
    }
    let exists = true;
    try {
      const leaf = await lstat(target.path);
      if (leaf.isSymbolicLink()) throw new Error(`${change.path}: symbolic-link targets are forbidden`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") exists = false;
      else throw error;
    }
    if (change.action === "update" && !exists) throw new Error(`${change.path}: update target does not exist`);
    if (change.action === "create" && exists) throw new Error(`${change.path}: create target already exists`);
    targets.push({ change, path: target.path });
  }
  for (const target of targets) {
    await mkdir(path.dirname(target.path), { recursive: true });
    await writeFile(target.path, target.change.content, { encoding: "utf8", flag: "w" });
  }
}

async function acquire(runId: string) {
  const [leased] = await db.update(executionRunsTable).set({
    leaseOwner: workerId, leaseExpiresAt: new Date(Date.now() + 5 * 60_000), updatedAt: new Date(),
  }).where(and(
    eq(executionRunsTable.id, runId),
    inArray(executionRunsTable.status, ["queued", "running"]),
    sql`(${executionRunsTable.leaseExpiresAt} IS NULL OR ${executionRunsTable.leaseExpiresAt} < NOW() OR ${executionRunsTable.leaseOwner} = ${workerId})`,
  )).returning();
  return leased;
}

async function renewLease(runId: string) {
  await db.update(executionRunsTable).set({
    leaseExpiresAt: new Date(Date.now() + 5 * 60_000),
    updatedAt: new Date(),
  }).where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, workerId)));
}

type FinalStatus = "completed" | "failed" | "stopped";

async function finalizeWorkerRun(input: {
  runId: string;
  expectedStatuses: string[];
  status: FinalStatus;
  stopRequested: boolean;
  error?: string | null;
  receipt: string;
  eventType: string;
  eventMessage: string;
  eventLevel?: string;
  artifacts?: Array<{ kind: string; name: string; content: string }>;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`execution-event:${input.runId}`}))`);
    const [updated] = await tx.update(executionRunsTable).set({
      status: input.status,
      error: input.error ?? null,
      finishedAt: new Date(),
      updatedAt: new Date(),
      leaseOwner: null,
      leaseExpiresAt: null,
    }).where(and(
      eq(executionRunsTable.id, input.runId),
      eq(executionRunsTable.leaseOwner, workerId),
      inArray(executionRunsTable.status, input.expectedStatuses),
      eq(executionRunsTable.stopRequested, input.stopRequested),
    )).returning();
    if (!updated) return undefined;
    for (const item of [...(input.artifacts ?? []), { kind: "receipt", name: "receipt.json", content: input.receipt }]) {
      await tx.insert(executionArtifactsTable).values({
        id: `artifact-${randomUUID()}`, runId: input.runId, kind: item.kind,
        name: item.name, content: bounded(item.content), metadata: {},
      });
    }
    const [latest] = await tx.select({ sequence: executionEventsTable.sequence }).from(executionEventsTable)
      .where(eq(executionEventsTable.runId, input.runId)).orderBy(desc(executionEventsTable.sequence)).limit(1);
    await tx.insert(executionEventsTable).values({
      id: `event-${randomUUID()}`, runId: input.runId, sequence: (latest?.sequence ?? 0) + 1,
      type: input.eventType, level: input.eventLevel ?? "info", message: input.eventMessage, metadata: {},
    });
    return updated;
  });
}

async function execute(runId: string) {
  if (active.has(runId)) return;
  active.add(runId);
  let worktree: string | undefined;
  try {
    const run = await acquire(runId);
    if (!run) return;
    const [revision] = await db.select().from(planRevisionsTable).where(eq(planRevisionsTable.id, run.revisionId));
    if (!revision) throw new Error("Approved plan revision no longer exists");
    const root = await repositoryRoot();
    const base = await command(root, "git", ["rev-parse", "HEAD"], 10_000);
    if (base.code !== 0) throw new Error("Unable to capture repository base commit");
    worktree = await mkdtemp(path.join(tmpdir(), "agent-execution-"));
    if (!path.resolve(worktree).startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error("Unsafe worktree path");
    const add = await command(root, "git", ["worktree", "add", "--detach", worktree, base.output.trim()], 30_000);
    if (add.code !== 0) throw new Error(`Unable to create isolated worktree: ${add.output}`);
    const snapshotCommit = await snapshotWorkingTree(root, worktree);
    await installIsolatedDependencies(worktree);
    const [started] = await db.update(executionRunsTable).set({
      status: "running", baseCommit: snapshotCommit, repositoryRoot: root,
      updatedAt: new Date(),
    }).where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, workerId), eq(executionRunsTable.status, "queued"))).returning();
    if (!started) throw new Error("Execution start rejected by lease/status fence");
    await event(runId, "worktree.created", "Isolated temporary worktree created from a committed workspace snapshot", "info", { baseCommit: snapshotCommit }, workerId);

    let feedback: string | undefined;
    for (let attempt = Math.max(1, run.attempt + 1); attempt <= 2; attempt += 1) {
      if (await stopped(runId)) break;
      await renewLease(runId);
      const [attempted] = await db.update(executionRunsTable).set({ attempt, updatedAt: new Date() })
        .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, workerId), eq(executionRunsTable.status, "running"), eq(executionRunsTable.stopRequested, false))).returning();
      if (!attempted) throw new Error("Execution attempt rejected by lease/status fence");
      const repositoryContext = await collectRepositoryContext(worktree);
      const generated = await generateProposal(revision.request, revision.normalizedRequirements, repositoryContext, feedback);
      await artifact(runId, "proposal", `attempt-${attempt}.json`, JSON.stringify(generated), { summary: generated.summary, attempt }, workerId);
      if (await stopped(runId)) break;
      try {
        await writeProposal(worktree, generated.changes, revision.highRisk);
      } catch (error) {
        feedback = error instanceof Error ? error.message : "Proposal validation failed";
        await event(runId, "proposal.rejected", feedback, "warning", {
          attempt, paths: Array.isArray(generated.changes) ? generated.changes.map((change) => change.path) : [],
        }, workerId);
        await command(worktree, "git", ["reset", "--hard", snapshotCommit], 30_000);
        await command(worktree, "git", ["clean", "-fd"], 30_000);
        continue;
      }
      let failed = false;
      const validation = await createGitFreeValidationCopy(worktree);
      try {
        for (const name of ["libs:build", "api:test", "api:typecheck", "frontend:typecheck", "frontend:build"]) {
          if (await stopped(runId)) { failed = true; break; }
          await renewLease(runId);
          const allowed = allowlistedCommand(name);
          if (!allowed) throw new Error(`Command policy error: ${name}`);
          const result = await isolatedCommand(validation, root, allowed[0], allowed.slice(1));
          await artifact(runId, "test_output", `${name.replace(":", "-")}.txt`, result.output, { exitCode: result.code, command: name }, workerId);
          await event(runId, "command.finished", `${name} exited with code ${result.code}`, result.code ? "warning" : "info", {}, workerId);
          if (result.code) { feedback = `${name} failed:\n${result.output}`; failed = true; break; }
        }
      } finally {
        await rm(validation, { recursive: true, force: true });
      }
      if (failed) {
        await command(worktree, "git", ["reset", "--hard", snapshotCommit], 30_000);
        await command(worktree, "git", ["clean", "-fd"], 30_000);
        continue;
      }
      if (await stopped(runId)) {
        await command(worktree, "git", ["reset", "--hard", snapshotCommit], 30_000);
        await command(worktree, "git", ["clean", "-fd"], 30_000);
        break;
      }
      const intent = await command(worktree, "git", ["add", "-N", "--all"], 30_000);
      if (intent.code !== 0) throw new Error(`Unable to inventory changed files: ${intent.output}`);
      const diff = await command(worktree, "git", ["diff", "--binary", snapshotCommit], 30_000);
      if (diff.code !== 0 || !diff.output.trim()) {
        feedback = diff.code !== 0 ? `Unable to generate final diff: ${diff.output}` : "Proposal produced an empty final diff";
        await event(runId, "proposal.rejected", feedback, "warning", { attempt }, workerId);
        await command(worktree, "git", ["reset", "--hard", snapshotCommit], 30_000);
        await command(worktree, "git", ["clean", "-fd"], 30_000);
        continue;
      }
      const receipt = JSON.stringify({
        runId, planId: run.planId, revision: revision.revision, scopeHash: run.scopeHash,
        revisionId: revision.id, previousRunId: run.previousRunId,
        baseCommit: snapshotCommit, status: "completed", attempts: attempt,
        changedPaths: patchPaths(diff.output), merged: false, deployed: false,
      }, null, 2);
      const completed = await finalizeWorkerRun({
        runId, expectedStatuses: ["running"], status: "completed", stopRequested: false,
        receipt, eventType: "run.completed",
        eventMessage: "Validation passed; receipt produced. Nothing was merged or deployed.",
        artifacts: [{ kind: "final_patch", name: "approved-change.diff", content: diff.output }],
      });
      if (!completed) throw new Error("Execution lease or status fence rejected stale completion");
      return;
    }
    const [latest] = await db.select({ status: executionRunsTable.status }).from(executionRunsTable).where(eq(executionRunsTable.id, runId));
    const wasStopped = await stopped(runId);
    const pausedForReplan = ["replanning", "awaiting_approval"].includes(latest?.status ?? "");
    if (!pausedForReplan) {
      const finalStatus = wasStopped ? "stopped" : "failed";
      await finalizeWorkerRun({
        runId, expectedStatuses: wasStopped ? ["stopping"] : ["running"],
        status: finalStatus, stopRequested: wasStopped,
        error: wasStopped ? null : bounded(feedback ?? "Two attempts exhausted"),
        receipt: JSON.stringify({
        runId, planId: run.planId, revision: revision.revision,
        revisionId: revision.id, previousRunId: run.previousRunId,
        scopeHash: run.scopeHash, baseCommit: snapshotCommit,
        status: finalStatus, attempts: 2,
        merged: false, deployed: false,
        error: wasStopped ? null : bounded(feedback ?? "Two attempts exhausted"),
        }, null, 2),
        eventType: wasStopped ? "run.stopped" : "run.failed",
        eventMessage: wasStopped ? "Safe stop completed" : "Two execution attempts exhausted",
        eventLevel: wasStopped ? "warning" : "error",
      });
    } else {
      await event(runId, "run.paused", "Execution paused with completed history preserved", "warning", {}, workerId);
      await db.update(executionRunsTable).set({ leaseOwner: null, leaseExpiresAt: null })
        .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, workerId), inArray(executionRunsTable.status, ["replanning", "awaiting_approval"])));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    const [latest] = await db.select({ status: executionRunsTable.status }).from(executionRunsTable).where(eq(executionRunsTable.id, runId));
    const pausedForReplan = ["replanning", "awaiting_approval"].includes(latest?.status ?? "");
    if (latest?.status === "stopping") {
      await finalizeWorkerRun({
        runId, expectedStatuses: ["stopping"], status: "stopped", stopRequested: true,
        error: null,
        receipt: JSON.stringify({ runId, status: "stopped", merged: false, deployed: false }, null, 2),
        eventType: "run.stopped",
        eventMessage: "Safe stop completed during worker finalization",
        eventLevel: "warning",
      });
    } else if (pausedForReplan || latest?.status === "stopped") {
      // The operator-owned stop/replan transition is authoritative. Worker cleanup
      // must not overwrite it or publish a mismatched terminal receipt.
      await db.update(executionRunsTable).set({ leaseOwner: null, leaseExpiresAt: null })
        .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.leaseOwner, workerId), inArray(executionRunsTable.status, ["replanning", "awaiting_approval", "stopped"])));
    } else {
      await finalizeWorkerRun({
        runId, expectedStatuses: ["queued", "running"], status: "failed", stopRequested: false,
        error: bounded(message),
        receipt: JSON.stringify({
          runId, status: "failed", merged: false, deployed: false, error: bounded(message),
        }, null, 2),
        eventType: "run.failed", eventMessage: message, eventLevel: "error",
      });
      logger.error({ error, runId }, "Autonomous execution failed");
    }
  } finally {
    if (worktree) {
      const root = await repositoryRoot().catch(() => undefined);
      if (root) await command(root, "git", ["worktree", "remove", "--force", worktree], 30_000).catch(() => undefined);
      await rm(worktree, { recursive: true, force: true });
    }
    active.delete(runId);
  }
}

export function scheduleExecution(runId: string) {
  setImmediate(() => void execute(runId));
}

export async function getPlan(planId: string) {
  const [plan] = await db.select().from(agentPlansTable).where(eq(agentPlansTable.id, planId));
  if (!plan) return undefined;
  const revisions = await db.select().from(planRevisionsTable).where(eq(planRevisionsTable.planId, planId)).orderBy(asc(planRevisionsTable.revision));
  return { ...plan, createdAt: plan.createdAt.toISOString(), revisions: revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), currentRevision: revisions.at(-1) };
}

async function planFromRevision(revision: typeof planRevisionsTable.$inferSelect) {
  const [plan] = await db.select().from(agentPlansTable).where(eq(agentPlansTable.id, revision.planId));
  if (!plan) throw new Error("Plan not found");
  return {
    id: plan.id, scenarioId: plan.scenarioId,
    normalizedRequirements: revision.normalizedRequirements,
    assumptions: revision.assumptions, risks: revision.risks, tasks: revision.tasks,
    model: revision.model, createdAt: revision.createdAt.toISOString(),
    revision: revision.revision, scopeHash: revision.scopeHash, highRisk: revision.highRisk,
  };
}

export async function decidePlan(planId: string, input: { decision: "approve" | "request_changes"; revisionId: string; scopeHash: string; feedback?: string; approveHighRisk?: boolean }, actorId: string) {
  let rejectionDraft: Awaited<ReturnType<typeof generateAgentPlanDraft>>;
  if (input.decision === "request_changes") {
    if (!input.feedback?.trim()) throw new Error("Feedback is required when requesting changes");
    const [target] = await db.select().from(planRevisionsTable)
      .where(and(eq(planRevisionsTable.planId, planId), eq(planRevisionsTable.id, input.revisionId))).limit(1);
    if (!target) return undefined;
    if (target.scopeHash !== input.scopeHash) throw new Error("Scope hash does not match the current plan revision");
    const [alreadyDecided] = await db.select().from(executionApprovalsTable)
      .where(eq(executionApprovalsTable.revisionId, target.id)).limit(1);
    if (alreadyDecided) {
      if (alreadyDecided.decision !== "request_changes" || alreadyDecided.scopeHash !== input.scopeHash) {
        throw new Error("This plan revision already has a conflicting decision");
      }
      const [durableNext] = await db.select().from(planRevisionsTable).where(and(
        eq(planRevisionsTable.planId, planId),
        eq(planRevisionsTable.revision, target.revision + 1),
      )).limit(1);
      if (!durableNext) throw new Error("Rejected decision is missing its atomic replacement revision");
      return planFromRevision(durableNext);
    }
    const [latest] = await db.select({ id: planRevisionsTable.id }).from(planRevisionsTable)
      .where(eq(planRevisionsTable.planId, planId)).orderBy(desc(planRevisionsTable.revision)).limit(1);
    if (latest?.id !== target.id) throw new Error("Decision targets a superseded plan revision");
    // Generation has no durable side effects. A provider failure therefore leaves
    // this revision undecided and safely retryable.
    rejectionDraft = await generateAgentPlanDraft({
      changeRequest: target.request, feedback: input.feedback,
    });
    if (!rejectionDraft) throw new Error("Unable to generate replacement plan");
  }
  const decision = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`plan-decision:${planId}`}))`);
    const [revision] = await tx.select().from(planRevisionsTable)
      .where(and(eq(planRevisionsTable.planId, planId), eq(planRevisionsTable.id, input.revisionId))).limit(1);
    if (!revision) return undefined;
    if (revision.scopeHash !== input.scopeHash) throw new Error("Scope hash does not match the current plan revision");
    const [existing] = await tx.select().from(executionApprovalsTable).where(eq(executionApprovalsTable.revisionId, revision.id)).limit(1);
    if (existing) {
      if (existing.scopeHash !== input.scopeHash) {
        throw new Error("This plan revision already has a conflicting decision");
      }
      const [existingRun] = await tx.select().from(executionRunsTable).where(eq(executionRunsTable.approvalId, existing.id)).limit(1);
      const outcome = existingDecisionOutcome(existing.decision, input.decision, Boolean(existingRun));
      if (outcome === "conflict") throw new Error("This plan revision already has a conflicting decision");
      if (existingRun) return { run: existingRun };
      const [durableNext] = await tx.select().from(planRevisionsTable).where(and(
        eq(planRevisionsTable.planId, planId),
        eq(planRevisionsTable.revision, revision.revision + 1),
      )).limit(1);
      if (!durableNext) throw new Error("Rejected decision is missing its atomic replacement revision");
      return { rejectedRevision: durableNext };
    }
    const [latest] = await tx.select({ id: planRevisionsTable.id }).from(planRevisionsTable)
      .where(eq(planRevisionsTable.planId, planId)).orderBy(desc(planRevisionsTable.revision)).limit(1);
    if (!rejectionDraftCommitAllowed(revision.id, latest?.id, Boolean(existing))) throw new Error("Decision targets a superseded plan revision");
    if (input.decision === "approve" && revision.highRisk && !input.approveHighRisk) {
      throw new Error("This plan contains schema/auth or other high-risk work and requires explicit high-risk approval");
    }
    const approvalId = `approval-${randomUUID()}`;
    await tx.insert(executionApprovalsTable).values({
      id: approvalId, planId, revisionId: revision.id, actorId,
      decision: input.decision, scopeHash: input.scopeHash, feedback: input.feedback,
      highRiskApproved: Boolean(input.approveHighRisk),
    });
    if (input.decision === "request_changes") {
      if (!rejectionDraft) throw new Error("Replacement plan draft is required");
      const [next] = await tx.insert(planRevisionsTable).values({
        id: rejectionDraft.revisionId,
        planId,
        revision: revision.revision + 1,
        request: rejectionDraft.request,
        normalizedRequirements: rejectionDraft.normalizedRequirements,
        assumptions: rejectionDraft.assumptions,
        risks: rejectionDraft.risks,
        tasks: rejectionDraft.tasks,
        scopeHash: rejectionDraft.scopeHash,
        highRisk: rejectionDraft.highRisk,
        feedback: input.feedback,
        model: rejectionDraft.model,
      }).returning();
      if (!next) throw new Error("Unable to persist replacement plan revision");
      return { rejectedRevision: next };
    }
    const [previous] = await tx.select({ id: executionRunsTable.id }).from(executionRunsTable)
      .where(eq(executionRunsTable.planId, planId)).orderBy(desc(executionRunsTable.startedAt)).limit(1);
    const [run] = await tx.insert(executionRunsTable).values({
      id: `execution-${randomUUID()}`, planId, revisionId: revision.id, approvalId,
      previousRunId: previous?.id, actorId, status: "queued", scopeHash: revision.scopeHash,
    }).returning();
    return { run };
  });
  if (!decision) return undefined;
  if ("rejectedRevision" in decision && decision.rejectedRevision) return planFromRevision(decision.rejectedRevision);
  const run = decision.run;
  await event(run.id, "run.queued", "Scope-bound approval accepted; execution queued");
  if (run.status === "queued" && !active.has(run.id)) scheduleExecution(run.id);
  return runView(run);
}

function runView(run: typeof executionRunsTable.$inferSelect) {
  return { ...run, startedAt: run.startedAt.toISOString(), updatedAt: run.updatedAt.toISOString(), finishedAt: run.finishedAt?.toISOString() ?? null, leaseExpiresAt: run.leaseExpiresAt?.toISOString() ?? null };
}

export async function executionDetail(runId: string) {
  const [run] = await db.select().from(executionRunsTable).where(eq(executionRunsTable.id, runId));
  return run ? runView(run) : undefined;
}
export async function executionEvents(runId: string) {
  const rows = await db.select().from(executionEventsTable).where(eq(executionEventsTable.runId, runId)).orderBy(asc(executionEventsTable.sequence));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
export async function executionArtifacts(runId: string) {
  const rows = await db.select().from(executionArtifactsTable).where(eq(executionArtifactsTable.runId, runId)).orderBy(asc(executionArtifactsTable.createdAt));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
export async function stopExecution(runId: string) {
  const [existing] = await db.select().from(executionRunsTable).where(eq(executionRunsTable.id, runId));
  if (!existing) return undefined;
  if (["completed", "failed", "stopped"].includes(existing.status)) return runView(existing);
  const run = await db.transaction(async (tx) => {
    const [updated] = await tx.update(executionRunsTable).set({
      stopRequested: true,
      status: existing.status === "running" ? "stopping" : "stopped",
      updatedAt: new Date(),
      ...(existing.status === "running" ? {} : { finishedAt: new Date(), leaseOwner: null, leaseExpiresAt: null }),
    })
      .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.status, existing.status), eq(executionRunsTable.stopRequested, existing.stopRequested))).returning();
    if (updated?.status === "stopped") {
      await tx.insert(executionArtifactsTable).values({
        id: `artifact-${randomUUID()}`, runId, kind: "receipt", name: "receipt.json",
        content: JSON.stringify({
          runId, planId: updated.planId, scopeHash: updated.scopeHash, status: "stopped",
          attempts: updated.attempt, merged: false, deployed: false,
        }, null, 2),
        metadata: {},
      });
    }
    return updated;
  });
  if (run) await event(runId, "stop.requested", "Operator requested a safe stop", "warning");
  return run ? runView(run) : executionDetail(runId);
}
export async function replanExecution(runId: string, feedback: string, actorId: string) {
  const [run] = await db.select().from(executionRunsTable).where(eq(executionRunsTable.id, runId));
  if (!run) return undefined;
  if (!["queued", "running"].includes(run.status) || run.stopRequested) {
    throw new Error("Only an active execution can be replanned");
  }
  const [historyEvents, historyArtifacts] = await Promise.all([
    executionEvents(runId),
    executionArtifacts(runId),
  ]);
  const continuity = JSON.stringify({
    previousRunId: runId,
    previousRevisionId: run.revisionId,
    events: historyEvents.slice(-50).map(({ type, level, message, createdAt }) => ({ type, level, message, createdAt })),
    previousPlan: {
      normalizedRequirements: (await db.select().from(planRevisionsTable).where(eq(planRevisionsTable.id, run.revisionId)).limit(1))[0]?.normalizedRequirements ?? [],
    },
    artifacts: historyArtifacts.filter(({ kind }) => ["patch", "final_patch", "receipt", "test_output"].includes(kind)).slice(-20)
      .map(({ kind, name, metadata, content, createdAt }) => ({ kind, name, metadata, content: content.slice(0, 4000), createdAt })),
  }).slice(0, 30_000);
  const [paused] = await db.update(executionRunsTable).set({ status: "replanning", stopRequested: true, updatedAt: new Date() })
    .where(and(eq(executionRunsTable.id, runId), inArray(executionRunsTable.status, ["queued", "running"]), eq(executionRunsTable.stopRequested, false))).returning();
  if (!paused) throw new Error("Execution changed state before replan could be fenced");
  const [revision] = await db.select().from(planRevisionsTable).where(eq(planRevisionsTable.id, run.revisionId));
  if (!revision) throw new Error("Plan revision not found");
  await event(runId, "replan.requested", "Execution paused for a new plan revision", "warning");
  const plan = await generateAgentPlan({
    existingPlanId: run.planId, changeRequest: revision.request, actorId,
    feedback: `${feedback}\n\nCompleted execution history:\n${continuity}`.slice(0, 32_000),
    revision: revision.revision + 1,
  });
  const [awaiting] = await db.update(executionRunsTable).set({ status: "awaiting_approval", updatedAt: new Date() })
    .where(and(eq(executionRunsTable.id, runId), eq(executionRunsTable.status, "replanning"), eq(executionRunsTable.stopRequested, true))).returning();
  if (!awaiting) throw new Error("Execution was stopped while replanning; the new revision was preserved but cannot overwrite terminal state");
  return plan;
}
export async function receipt(runId: string) {
  const [item] = await db.select().from(executionArtifactsTable).where(and(eq(executionArtifactsTable.runId, runId), eq(executionArtifactsTable.kind, "receipt"))).limit(1);
  return item ? { ...item, createdAt: item.createdAt.toISOString() } : undefined;
}
export async function recoverExecutions() {
  await db.transaction(async (tx) => {
    const stoppedRuns = await tx.update(executionRunsTable).set({
      status: "stopped", leaseOwner: null, leaseExpiresAt: null,
      finishedAt: new Date(), updatedAt: new Date(), error: "Worker interrupted during safe stop",
    }).where(and(eq(executionRunsTable.status, "stopping"), sql`(${executionRunsTable.leaseExpiresAt} IS NULL OR ${executionRunsTable.leaseExpiresAt} < NOW())`)).returning();
    for (const run of stoppedRuns) {
      await tx.insert(executionArtifactsTable).values({
        id: `artifact-${randomUUID()}`, runId: run.id, kind: "receipt", name: "receipt.json",
        content: JSON.stringify({
          runId: run.id, planId: run.planId, revisionId: run.revisionId,
          scopeHash: run.scopeHash, status: "stopped", attempts: run.attempt,
          merged: false, deployed: false,
        }, null, 2),
        metadata: {},
      });
    }
  });
  await db.update(executionRunsTable).set({
    status: "awaiting_approval", leaseOwner: null, leaseExpiresAt: null,
    updatedAt: new Date(), error: "Worker interrupted during replan; approval remains required",
  }).where(and(eq(executionRunsTable.status, "replanning"), sql`(${executionRunsTable.leaseExpiresAt} IS NULL OR ${executionRunsTable.leaseExpiresAt} < NOW())`));
  const rows = await db.update(executionRunsTable).set({ status: "queued", leaseOwner: null, leaseExpiresAt: null, error: "Worker interrupted; safely queued for retry", updatedAt: new Date() })
    .where(and(inArray(executionRunsTable.status, ["queued", "running"]), sql`(${executionRunsTable.leaseExpiresAt} IS NULL OR ${executionRunsTable.leaseExpiresAt} < NOW())`)).returning();
  for (const run of rows) scheduleExecution(run.id);
}