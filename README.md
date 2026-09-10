# Agentic URL Shortener

A working URL shortener and an approval-gated agentic software-development control room.

This README is the central assignment handoff: it contains the architecture, setup, demo scenarios, API guide, verification evidence, engineering decisions, and known limitations. Project operating guidance previously in `replit.md` is consolidated here.

## Contents

1. [Assignment and scope](#assignment-and-scope)
2. [Architecture and dependency graph](#architecture-and-dependency-graph)
3. [Setup and operation](#setup-and-operation)
4. [Testing the URL shortener](#testing-the-url-shortener)
5. [Agentic workflow walkthrough](#agentic-workflow-walkthrough)
6. [Three assignment scenarios](#three-assignment-scenarios)
7. [API reference](#api-reference)
8. [Safety, persistence, and recovery](#safety-persistence-and-recovery)
9. [Verification and acceptance coverage](#verification-and-acceptance-coverage)
10. [Repository guide](#repository-guide)
11. [Limitations and trade-offs](#limitations-and-trade-offs)
12. [Final engineering summary](#final-engineering-summary)

## Assignment and scope

The assignment has two layers:

- **Product:** create short URLs, redirect visitors, pause links, and inspect click analytics.
- **Orchestrator:** interpret a plain-English engineering request, propose a dependency graph, collect human approval, generate real code/tests/documentation, run bounded validation, and retain a reviewable patch and execution receipt.

The application combines a governed scenario model with a real repository-specific AI executor. These are distinct:

- Scenario runs demonstrate task dependencies, modeled parallel branches, approval gates, retry, and rollback controls.
- Autonomous runs generate actual file changes in isolation and execute real tests/builds. Their worker currently processes a complete proposal followed by sequential validation commands; it is **not** a separate concurrently executing agent for every DAG node.

**Delivery boundary:** a successful autonomous run produces a tested patch, not an automatically merged or deployed feature. The main application remains unchanged until a maintainer reviews and applies that patch. This is an intentional safety boundary and a remaining gap from a fully automatic request-to-live-feature system.

## Architecture and dependency graph

### System architecture

```text
Browser
 ├─ Public landing / operator sign-in
 └─ Clerk-protected React control room
              │ generated React Query hooks
              ▼
     Express API — /api
       ├─ Public redirects and health probes
       ├─ URL management and analytics
       ├─ Scenario orchestration and audit
       └─ AI plan approval / execution controls
              │
              ├─ PostgreSQL + Drizzle
              │    URLs, clicks, plans, revisions, approvals,
              │    runs, events, artifacts, hash-linked audits
              │
              └─ OpenAI structured planner / file proposal generator
                        │ human approval
                        ▼
                Detached Git worktree
                  snapshot → validated file writes
                        │
                        ▼
                Separate Git-free validation copy
                  private namespaces → tests/build
                        │
                        ▼
                Git patch + output + receipt
                No automatic merge or deployment
```

### SDLC dependency model

```text
Request
   ↓
Requirements / ambiguity / assumptions
   ↓
Design and dependency plan
   ↓
Human approval gate ── request changes ──→ revised plan
   ↓
Implementation ──────┐
Test design ─────────┼──→ synchronization / security review
Documentation ──────┘                  ↓
                                validation gate
                                  /         \
                              pass           fail
                               ↓              ↓
                         patch + receipt   reset isolated changes
                                              ↓
                                       retry within budget
                                              ↓
                                      fail / stop + receipt
```

The graph above describes the intended planning and scenario model. In actual autonomous execution, one structured proposal can contain implementation, tests, and docs; the five validation commands run in order. Replanning creates a linked revision and requires fresh approval rather than resuming individual completed DAG nodes.

### Stack and rationale

| Area | Technology | Rationale |
| --- | --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind, React Query | Interactive cockpit with typed API access |
| API | Express 5, TypeScript | Shared language and straightforward request validation |
| Persistence | PostgreSQL, Drizzle ORM | Transactions, uniqueness, durable history and leases |
| Contracts | OpenAPI, Orval, Zod | One contract generates client hooks and server validators |
| Authentication | Clerk | Operator sign-in and protected management routes |
| AI | OpenAI through the configured AI integration | Structured requirements, plans, and bounded file proposals |
| Tooling | pnpm workspaces, TypeScript project references, esbuild | Shared packages and reproducible builds |
| Execution | Git worktrees and Linux namespaces | Separate generated changes from the primary workspace |

The suggested Python/LangGraph stack was not adopted. TypeScript preserves the existing full-stack implementation and provides equivalent persisted planning/control primitives, but does not claim LangGraph-style per-node durable execution.

## Setup and operation

### Prerequisites

- Node.js 24 and pnpm 10-compatible tooling.
- PostgreSQL accessible to the API.
- Configured Clerk authentication and OpenAI integration.
- Git repository with a valid `HEAD`.
- For autonomous validation: Linux with supported user/mount/PID/network namespaces, `unshare`, `mount`, `setpriv`, and an offline pnpm dependency cache.

The sandbox is tailored to the current Linux environment. Unsupported namespace or mount operations fail closed; there is no unrestricted execution fallback.

### Configuration

Configure values through your environment's secret/configuration management, never in source control:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | API PostgreSQL connection |
| `CLERK_SECRET_KEY` | Server-side authentication credential |
| `CLERK_PUBLISHABLE_KEY` | Server Clerk configuration |
| `VITE_CLERK_PUBLISHABLE_KEY` | Browser Clerk configuration; public by design |
| `SESSION_SECRET` | Stable secret for privacy-oriented visitor hashing |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Configured AI integration endpoint |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Server-only AI integration credential |
| `PORT` | Port for each service |
| `BASE_PATH` | Frontend mount path; `/` in the current app |
| `VITE_CLERK_PROXY_URL` | Optional browser Clerk proxy configuration |

Use production Clerk configuration for a public launch. The development preview has shown Clerk development-instance warnings.

### Install and initialize

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
pnpm run typecheck:libs
```

**Database caution:** `db push` changes the configured database schema. Use it for an intended development database; review and manage production schema changes separately. It is not an autonomous-agent capability.

### Start the app

In the existing workspace, use the configured API and web workflows. They supply service ports and proxy routing.

For manual development, run these in separate terminals:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/agentic-url-shortener run dev
```

The browser must reach both services on one origin: route `/api/*` to the API and `/` to the frontend. The current workspace proxy already supplies this mapping; two standalone localhost ports alone do not.

### Build and quality checks

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run build
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/agentic-url-shortener run build
pnpm audit --prod --audit-level moderate
git diff --check
```

`pnpm run build` also provides the workspace-wide typecheck/build entry point when the required artifact environment variables are set.

### Operational checks

Replace the example origin with the URL where the app is running:

```bash
APP_ORIGIN="https://your-app-domain"
curl -fsS "$APP_ORIGIN/api/healthz"
curl -fsS "$APP_ORIGIN/api/readyz"
```

- Liveness: `{"status":"ok"}`.
- Readiness: verifies database availability and audit-chain integrity.
- Keep a stable `SESSION_SECRET`; changing it changes visitor-hash continuity.
- Re-run codegen after OpenAPI edits.
- Rebuild shared declarations with `pnpm run typecheck:libs` after exported schema changes.

## Testing the URL shortener

1. Sign in and open **URL Management**.
2. Enter a public HTTP/HTTPS destination, such as an Amazon product URL.
3. Optionally enter a custom slug; otherwise the service generates one.
4. Create the endpoint.
5. Click the slug or use **Copy Short URL**, then open it in a new browser tab.
6. Open analytics to inspect clicks and available referrer/country information.
7. Pause the URL and confirm it no longer redirects.

The short-link format is:

```text
https://<current-app-domain>/api/go/<slug>
```

The previous `https://s.internal/<slug>` value was a UI placeholder and is not a reachable public hostname. Copy links again from the updated UI; existing URL records do not need to be recreated.

### Redirect checks

```bash
APP_ORIGIN="https://your-app-domain"
SLUG="your-created-slug"

# Inspect the redirect without recording a click.
curl -sSI "$APP_ORIGIN/api/go/$SLUG"

# Issue a real GET: records a click and returns the destination in Location.
curl -sS -D - -o /dev/null "$APP_ORIGIN/api/go/$SLUG"
```

Expect `302` and a `Location` header containing the original destination, including its query string. Missing or paused links return `404`. The destination website may apply its own login, bot-protection, or regional restrictions independently of the shortener.

Custom-slug collisions are rejected rather than overwriting a link. Unsafe destinations, embedded credentials, and local/private address forms are rejected. Pausing retains records and analytics instead of deleting history.

## Agentic workflow walkthrough

1. Open **Runs** and enter a plain-English request or choose a scenario preset.
2. Review normalized requirements, assumptions, risks, task dependencies, owners, and acceptance criteria.
3. Approve the exact revision, or request changes with feedback. High-risk work additionally requires an explicit confirmation.
4. Observe execution events and generated artifacts.
5. The executor snapshots the current repository into a detached worktree, collects bounded repository context, and requests complete-file changes.
6. Validated proposals are written only inside that worktree.
7. A separate Git-free copy runs:
   - Shared-library declaration build.
   - API tests.
   - API typecheck.
   - Frontend typecheck.
   - Frontend production build.
8. On failure, isolated proposal changes reset before a bounded retry. The executor allows at most two generation attempts.
9. Use **Stop** to request cancellation or **Replan** to supply changed requirements. Replanning retains history and returns to review for fresh approval.
10. Download the final patch, test/build outputs, and receipt.

Successful validation does not guarantee arbitrary feature completeness: the generated tests and existing suite must still be assessed against the request. Maintainers review the patch before applying it.

### Artifacts and receipt

Persisted artifacts include structured proposals, validation output, the final unified diff, and a JSON receipt. Receipts record outcome, attempts, scope/revision context and lineage as applicable; successful receipts identify changed paths and the snapshot baseline. They explicitly indicate that merging and deployment did not occur.

## Three assignment scenarios

These are repeatable evaluator walkthroughs, not a claim that every possible generated request has already passed an end-to-end test.

| Scenario | Example request | Decomposition and gate | Validation / expected evidence |
| --- | --- | --- | --- |
| **Greenfield** | “Add validation that custom aliases must be between 3 and 40 characters; add tests and document the rule.” | Requirements → API/UI impact → implementation/test/docs tasks → approval | Proposed files, boundary tests, typechecks/build, patch and receipt |
| **Brownfield** | “Fix redirect handling so HEAD requests do not increment clicks; add a regression test and document it.” | Inspect existing redirect/click behavior → regression analysis → focused change/test/docs plan | Repository-aware reasoning; existing implementation may already satisfy the request, so review for unnecessary changes |
| **Ambiguous** | “Make analytics more secure.” | Surface privacy/retention assumptions → identify risk → operator feedback before approval | Revised assumptions and plan; request changes to narrow scope, e.g. referrer privacy without schema changes |

The modeled scenario catalog also contains **Launch core shortener**, **Harden collision handling**, and **Add enterprise analytics**, demonstrating seeded decomposition and governance paths. Seeded completion/metrics are demonstration data, not proof of autonomous implementation.

### Suggested evaluation sequence

1. Demonstrate product creation, redirect, click analytics, collision rejection, and pause.
2. Generate a greenfield plan and inspect its graph before approving.
3. Request changes to the ambiguous plan and compare revisions.
4. Run a focused approved request and inspect proposal, validation output, and receipt.
5. Demonstrate stop/replan controls while a run is active; inspect retained history.
6. Explain the distinction between modeled parallelism and the real sequential validation worker.

## API reference

All paths below use the `/api` prefix. Management endpoints require a Clerk-authenticated operator. Use the signed-in UI or a properly authenticated client; do not disable authentication to test them.

| Method and path | Purpose |
| --- | --- |
| `GET /api/healthz` | Public liveness |
| `GET /api/readyz` | Public readiness |
| `GET /api/go/:slug` | Public redirect; records a click |
| `HEAD /api/go/:slug` | Public redirect check; no click |
| `GET /api/urls` | List URLs |
| `POST /api/urls` | Create with `{ destination, slug? }` |
| `GET /api/urls/:slug` | Inspect URL |
| `DELETE /api/urls/:slug` | Pause, not hard-delete |
| `GET /api/urls/:slug/analytics` | Link analytics |
| `GET /api/dashboard` | Dashboard data |
| `GET /api/activity` | Audit activity |
| `GET /api/scenarios` | Scenario catalog |
| `GET, POST /api/runs` | Modeled scenario runs |
| `POST /api/runs/:runId/{approve,retry,rollback,stop}` | Scenario controls |
| `POST /api/agent/plans` | Generate a plan from a request |
| `GET /api/agent/plans/:planId` | Plan and revision history |
| `POST /api/agent/plans/:planId/approve` | Approve or request changes using revision ID and scope hash |
| `GET /api/executions/:executionId` | Execution status |
| `GET /api/executions/:executionId/events` | Execution events |
| `GET /api/executions/:executionId/artifacts` | Persisted artifacts |
| `POST /api/executions/:executionId/replan` | Revise active work |
| `POST /api/executions/:executionId/stop` | Safe stop |
| `GET /api/executions/:executionId/receipt` | Final receipt |

`lib/api-spec/openapi.yaml` is the authoritative typed management contract. Public redirect and readiness implementations are in the API route modules.

## Safety, persistence, and recovery

- **Persistent state:** PostgreSQL stores URLs, raw click events, modeled runs, plans/revisions, execution approvals, events, artifacts, and audits.
- **Transactional governance:** advisory locks and revision-specific decisions prevent stale approvals and duplicate execution for an approved revision.
- **Lease fencing:** workers can publish terminal state and matching receipt/artifacts only under the expected status, stop flag, and lease ownership.
- **Rejection recovery:** replacement-plan generation precedes the atomic decision/revision commit, so generation failure does not strand an irreversible rejection.
- **Bounded autonomy:** strict proposal structure, path/size limits, bounded context/output, exact commands, and two attempts.
- **Protected paths:** traversal, dotfiles, secrets, generated clients, dependencies, package manifests, lockfiles, and build configuration are blocked. Allowed high-risk auth/schema source paths require explicit approval; this does not authorize migrations.
- **Filesystem boundaries:** generated validation code runs only in a disposable Git-free copy, never in the trusted Git worktree used for host-side diff generation.
- **Sandbox:** private mount/PID/network namespaces, empty environment except approved variables, hidden `/home`, `/tmp`, `/var/tmp`, `/proc`, and `/run`, followed by capability dropping and no-new-privileges. Pathname-based host control sockets are masked as well as network access.
- **Timeouts:** validation uses process-group termination and escalation.
- **Rollback:** failed attempts reset isolated proposals to the snapshot baseline. The primary workspace is not rolled back because it was never changed.
- **Replan:** a new linked run incorporates prior plan and bounded artifact context; it does not retain the previous working filesystem.
- **Recovery:** startup/periodic recovery handles interrupted leases and cancellation states.
- **Audit:** SHA-256 predecessor-linked events provide tamper evidence, not independently immutable storage.
- **Web controls:** management authentication, request limits, security headers, process-local rate limiting, readiness checks, structured logging, and graceful shutdown.

## Verification and acceptance coverage

### Recorded verification

The implementation session recorded:

- Full workspace TypeScript checks passing.
- **17 API tests passing**, covering URL policy, graph invariants, path/symlink restrictions, scope binding, snapshot filtering, exact commands, environment filtering, and lifecycle/decision helpers.
- API and frontend production builds passing.
- Dependency audit with no known vulnerabilities at the time of the check.
- Healthy liveness and readiness, including database and audit-chain checks.
- Live AI execution of a request to add a health response header, test, and documentation: completed on attempt one with all five isolated validations, patch, and receipt.
- Before/after Git status unchanged during that live execution. This is a workspace-status check, **not a byte-for-byte filesystem integrity proof**.
- An independent code review reporting no remaining critical/high blocker at the documented single-instance boundary.
- The user's Amazon short-link record returning `302` with the correct destination after the placeholder-link fix.

The live autonomous checks used direct service calls; they do not prove a complete authenticated browser journey. The final automated `/runs` screenshot reached the sign-in gate, not the authenticated cockpit. Concurrent DB race behavior and sandbox attack resistance need broader integration regression coverage beyond helper tests and review.

These are recorded results, not guarantees for a different machine, database, dependency version, or deployment. Re-run the commands above for your environment.

### Assignment coverage

| Requirement | Coverage and honest boundary |
| --- | --- |
| Working shortener and analytics | Implemented; redirects, creation, pause, collisions and analytics exercised |
| Plain-English requirements and ambiguity | Structured AI planning with visible assumptions, risks and feedback |
| Dependency graph and owners | Persisted plan decomposition and modeled scenario DAG |
| Sequential/parallel paths | Modeled parallel branches; autonomous validations are sequential, not per-node parallel workers |
| Real code, tests and docs | Structured file proposals and actual isolated validations; quality remains subject to review |
| Human approval / rejection | Exact revision/scope approval, additional high-risk confirmation, feedback revisions |
| Bounded retry and rollback | Two attempts, isolated reset, failure/stop receipt |
| Mid-flight changes | Linked replanning with prior context; fresh execution rather than in-place remaining-node resumption |
| Logs and artifacts | Polling cockpit, durable events, outputs, downloadable patch and receipt |
| Metrics | Dashboard/scenario telemetry exists; not a comprehensive measured autonomous per-stage metrics system |
| Three scenarios | Presets, modeled examples and repeatable evaluation walkthroughs above |
| Request becomes a live feature | Partial: validated patch delivered; merge/deployment intentionally manual |
| Production scalability | Partial: durable DB and leases, but in-process workers and process-local limiting |
| Caching and create idempotency | No shared redirect cache or general create idempotency-key API; do not confuse approval idempotency with URL-create idempotency |

## Repository guide

| Path | Responsibility |
| --- | --- |
| `artifacts/agentic-url-shortener/src/pages/` | Dashboard, URL management, analytics, runs, audit, architecture |
| `artifacts/agentic-url-shortener/src/components/control-room/` | Request intake, plan review, execution monitor |
| `artifacts/api-server/src/routes/` | HTTP endpoints and validation |
| `artifacts/api-server/src/lib/production-state.ts` | Durable URL, click, scenario and audit behavior |
| `artifacts/api-server/src/lib/agent-planner.ts` | Structured plan generation and persistence |
| `artifacts/api-server/src/lib/autonomous-executor.ts` | Approval, isolated execution, receipts and recovery |
| `artifacts/api-server/src/lib/execution-policy.ts` | Scope, path, command and lifecycle policies |
| `artifacts/api-server/src/middlewares/` | Authentication, security and Clerk proxy |
| `lib/db/src/schema/` | PostgreSQL schema |
| `lib/api-spec/openapi.yaml` | Contract source of truth |
| `lib/api-client-react/`, `lib/api-zod/` | Generated hooks/types and validators |
| `lib/integrations-openai-ai-server/` | Configured AI client |
| `screenshots/` | Captured visual evidence |

Keep generated APIs contract-driven. Regenerate rather than manually changing generated behavior. Keep environment credentials out of code, screenshots, logs, and documentation. Frontend links must use the actual app origin and public redirect path, never a placeholder hostname.

## Limitations and trade-offs

1. **Single-tenant, bounded repository scope:** not an arbitrary repository ingestion service or multi-tenant execution platform.
2. **No automatic release:** no merge, push, dependency changes, migration, or deployment by the agent. Offline installation of unchanged dependencies is infrastructure preparation only.
3. **Not a full DAG runtime:** plans express dependencies, but real execution does not schedule independent agents per task or checkpoint every graph node.
4. **In-process workers:** database leases provide recovery, but an external durable queue is the next scale boundary. Process termination can consume an attempt.
5. **Environment-specific isolation:** namespace support must be available; production environments require their own compatibility and security validation.
6. **Offline validation:** tests cannot contact production databases or external services. Passing the local suite does not establish live integration correctness.
7. **Model uncertainty:** generated code/tests/docs can be incomplete or incorrect. Review acceptance criteria and diffs; bounded retries are not a correctness guarantee.
8. **Limited privacy/analytics precision:** no raw IP persistence; visitor uniqueness is approximate, and country data depends on trusted upstream information.
9. **Rate limiting and caching:** limiter state is process-local; no shared cache or general create idempotency-key support.
10. **Audit retention:** hash chains need external append-only/WORM export for stronger regulatory requirements; artifact growth/retention needs operational management.
11. **Authentication launch configuration:** development Clerk settings must not be treated as production-ready public sign-in configuration.
12. **Bundle size:** frontend builds currently emit a large-chunk warning; it is nonblocking but worth optimizing.

## Final engineering summary

**Plan:** build the URL product, add durable governance/authentication, then connect structured AI planning to real isolated file generation and validation.

**Rationale:** prioritize visible human control, reversible execution, typed interfaces and persistent evidence over unrestricted agent autonomy. Keep PostgreSQL as the system of record and retain the existing TypeScript stack.

**Delivered artifacts:** runnable frontend/API, database schema, OpenAPI contract and generated clients, scenario model, AI planner/executor, policy tests, reviewable patches/receipts, and this consolidated setup/architecture/evaluation guide.

**Key assumptions:** trusted single-tenant operators, a configured repository and offline dependencies, compatible Linux isolation, and human review before applying generated changes.

**Residual risks:** model-generated test quality, deployment-specific sandbox compatibility, incomplete per-node orchestration, shared-process scaling, and operational retention/security requirements.

**Outcome:** the project demonstrates a working shortener and a real, governed request-to-tested-patch workflow. It does not claim a fully autonomous request-to-production system or independent parallel coding agents where those capabilities are not implemented.