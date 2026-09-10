import { useGetDashboard } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Layers, Link as LinkIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-primary/20 border-t-2 border-primary animate-spin" />
          <span className="text-sm text-muted-foreground font-mono">INITIALIZING_TELEMETRY...</span>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
        <p className="text-muted-foreground">Engineering orchestration and observability overview.</p>
      </div>

      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{dashboard.activeRuns}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-green-600 font-medium">Live</span> orchestration
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Reliability</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {(dashboard.reliability * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              End-to-end success rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">URLs Created</CardTitle>
            <LinkIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{dashboard.urlsCreated}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Managed endpoints
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className={dashboard.pendingApprovals > 0 ? "h-4 w-4 text-yellow-500" : "h-4 w-4 text-muted-foreground"} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{dashboard.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires human intervention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity Timeline */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Recent Audit Events</CardTitle>
            <CardDescription>System-level event tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-4 text-sm group">
                  <div className="mt-0.5 rounded-full p-1 bg-muted group-hover:bg-primary/10 transition-colors">
                    <Activity className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-none">
                      {event.action} <span className="text-muted-foreground font-normal">on</span> {event.target}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={event.severity === 'info' ? 'secondary' : event.severity === 'success' ? 'success' : event.severity === 'warning' ? 'warning' : 'destructive'} className="text-[10px] px-1 py-0 h-4">
                        {event.severity}
                      </Badge>
                      <span className="font-mono">{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</span>
                      <span>by {event.actor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Status */}
        <Card className="col-span-1 bg-slate-900 text-slate-50 dark:bg-card dark:text-card-foreground border-none">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              System Readiness
            </CardTitle>
            <CardDescription className="text-slate-400 dark:text-muted-foreground">Pre-flight checks and scenario status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">API_GATEWAY</span>
                <span className="text-green-400">ONLINE</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">POSTGRES_STATE</span>
                <span className="text-green-400">DURABLE</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">ORCHESTRATOR</span>
                <span className="text-green-400">IDLE</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-300">AI_PLANNER</span>
                <span className="text-blue-400">GOVERNED_REVIEW</span>
              </div>

              <div className="pt-4">
                <p className="text-slate-400 mb-2">Awaiting operator instruction.</p>
                <div className="flex gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75" />
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
