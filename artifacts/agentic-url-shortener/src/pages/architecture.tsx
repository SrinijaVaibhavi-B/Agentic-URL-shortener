import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Network, Server, ShieldCheck, Database, Zap, FlaskConical, TriangleAlert, GitBranch } from 'lucide-react';

export default function Architecture() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Architecture</h1>
        <p className="text-muted-foreground mt-2">Governance controls, assumptions, and bounded constraints for the Agentic URL Shortener.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Governance Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              The system operates under a <strong>Human-in-the-Loop (HITL)</strong> orchestration model. High-risk execution sequences require explicit operator approval at designated gates before proceeding.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>All state changes write immutable audit events.</li>
              <li>Destructive operations support automated rollback paths.</li>
              <li>Clerk sessions authenticate every control-plane operation.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5 text-blue-500" />
              Orchestration Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              Workflows are defined as Directed Acyclic Graphs (DAGs) representing dependent tasks.
            </p>
            <p className="text-muted-foreground">
               The scheduler evaluates task readiness, fans API and test work out in parallel, synchronizes both paths at security validation, enforces entry/exit gates, and captures detailed telemetry (MTTR, End-to-End Latency) for performance analysis.
            </p>
             <p className="text-muted-foreground">
               AI planning uses structured output, a bounded task schema, dependency validation, a 30-second timeout, two SDK retries, and a mandatory human review boundary. It cannot approve or execute its own plan.
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              Risk & Change Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Unsafe redirects:</strong> absolute URL validation blocks malformed destinations and records the rejection.</p>
            <p><strong className="text-foreground">High-impact changes:</strong> approval gates stop execution before write-path or privacy-sensitive work.</p>
            <p><strong className="text-foreground">Agent failure:</strong> two retries are allowed; budget exhaustion triggers a safe-stop fallback for human review.</p>
            <p><strong className="text-foreground">Bad downstream output:</strong> rollback restores the last approved checkpoint and invalidates dependent tasks.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-primary" />
              Decision Lineage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Every task retains its owner, attempts, dependencies, gate, stage, duration, and current status.</p>
            <p>Every governed transition records actor, action, target, timestamp, severity, and rationale in the audit stream.</p>
            <p>The ambiguous scenario visibly inserts a privacy decision gate when retention assumptions change.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-green-600" />
            Setup & Validation Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="mb-2 font-medium">Run</div>
            <code className="block overflow-x-auto rounded bg-muted p-3 text-xs">pnpm --filter @workspace/api-server run dev{'\n'}pnpm --filter @workspace/agentic-url-shortener run dev</code>
          </div>
          <div>
            <div className="mb-2 font-medium">Validate</div>
            <code className="block overflow-x-auto rounded bg-muted p-3 text-xs">pnpm --filter @workspace/db run push{'\n'}pnpm --filter @workspace/api-spec run codegen{'\n'}pnpm --filter @workspace/api-server run test{'\n'}pnpm run typecheck</code>
          </div>
          <p className="text-muted-foreground md:col-span-2">
            Acceptance coverage includes scenario creation, approval, retry budget, rollback, safe stop, URL creation and validation, analytics, audit lineage, responsive behavior, generated-contract conformance, and service health. Detailed trade-offs remain in README.md.
          </p>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold border-b pb-2 pt-4">Technical Assumptions & Limitations</h2>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x border-b">
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Persistence
                </div>
                <p className="text-xs text-muted-foreground">PostgreSQL persists URLs, click events, runs, AI plans, and chained audit records. Transactions and advisory locks protect collision-sensitive transitions.</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  Scale Bounds
                </div>
                <p className="text-xs text-muted-foreground">The stateless API can restart safely against PostgreSQL. Long-running coding workers and a distributed job queue remain the next scale boundary.</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  Analytics Accuracy
                </div>
                <p className="text-xs text-muted-foreground">Redirect clicks are durable raw events. Unique visitors use a salted one-way hash of network and user-agent signals; no raw IP address is retained.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-900 dark:bg-card text-slate-50 dark:text-card-foreground p-6 rounded-lg font-mono text-sm space-y-4">
        <div className="text-primary font-bold"># RUNTIME_VALIDATION</div>
        <div className="space-y-1 text-slate-400 dark:text-muted-foreground">
          <p>✓ Graph cyclic dependency detection active</p>
          <p>✓ Gate consensus validation enabled</p>
          <p>✓ PostgreSQL readiness and durable click telemetry</p>
          <p>✓ Tamper-evident audit hash-chain validation</p>
          <p>✓ Database advisory locking for critical transitions</p>
          <p>△ Distributed coding-worker queue (future scale boundary)</p>
        </div>
      </div>
    </div>
  );
}
