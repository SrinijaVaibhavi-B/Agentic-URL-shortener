import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAgentPlan, useDecideAgentPlan, getGetAgentPlanQueryKey, type ExecutionRun } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle2, ListChecks, ShieldAlert, GitCommit, GitBranch, ArrowLeft, Send } from 'lucide-react';

interface PlanReviewProps {
  planId: string;
  onApprove: (execution: ExecutionRun) => void;
  onCancel: () => void;
}

export function PlanReview({ planId, onApprove, onCancel }: PlanReviewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: planDetail, isLoading, error } = useGetAgentPlan(planId, {
    query: {
      queryKey: getGetAgentPlanQueryKey(planId),
      refetchInterval: (query) => query.state.data?.revisions ? false : 2000
    }
  });
  const decidePlan = useDecideAgentPlan();

  const [feedback, setFeedback] = useState('');
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(false);

  if (isLoading && !planDetail) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">ANALYZING_REQUIREMENTS...</div>;
  }

  if (error || !planDetail) {
    return <div className="p-12 text-center text-destructive font-mono">ERROR_FETCHING_PLAN</div>;
  }

  // Use the latest revision from the plan detail
  const latestRevision = planDetail.revisions?.[planDetail.revisions.length - 1];

  if (!latestRevision) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">GENERATING_REVISION...</div>;
  }

  const handleApprove = () => {
    decidePlan.mutate(
      {
        planId,
        data: {
          decision: 'approve',
          revisionId: latestRevision.id,
          scopeHash: latestRevision.scopeHash,
          approveHighRisk: highRiskConfirmed
        }
      },
      {
        onSuccess: (result) => {
          // If approved, it should return ExecutionRun
          if ('status' in result) {
            onApprove(result as ExecutionRun);
          }
        },
        onError: (err) => {
          toast({
            title: 'Approval failed',
            description: String(err),
            variant: 'destructive'
          });
        }
      }
    );
  };

  const handleRequestChanges = () => {
    if (!feedback.trim()) return;
    decidePlan.mutate(
      {
        planId,
        data: {
          decision: 'request_changes',
          revisionId: latestRevision.id,
          scopeHash: latestRevision.scopeHash,
          feedback
        }
      },
      {
        onSuccess: () => {
          setFeedback('');
          queryClient.invalidateQueries({ queryKey: getGetAgentPlanQueryKey(planId) });
        },
        onError: (err) => {
          toast({
            title: 'Request changes failed',
            description: String(err),
            variant: 'destructive'
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Plan Review
          </h2>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            ID: {planId} | REV: {latestRevision.revision} | {latestRevision.model}
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel} className="font-mono text-xs">
          <ArrowLeft className="h-4 w-4 mr-2" /> ABORT
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="h-5 w-5" />
                Execution Graph
              </CardTitle>
              <CardDescription>
                Deterministic sequence of actions to fulfill the request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {latestRevision.tasks.map((task, idx) => (
                  <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-mono text-xs">
                      {idx + 1}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm">{task.title}</span>
                        <Badge variant={task.risk === 'high' ? 'destructive' : task.risk === 'medium' ? 'warning' : 'secondary'} className="uppercase text-[10px]">
                          {task.risk}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 font-mono">
                        <GitCommit className="h-3 w-3" /> {task.owner}
                      </div>
                      {task.acceptanceCriteria.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          {task.acceptanceCriteria.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Context Hash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xs break-all bg-background p-2 rounded border">
                {latestRevision.scopeHash}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Risks & Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Identified Risks
                </h4>
                <ul className="text-sm space-y-2">
                  {latestRevision.risks.map((risk, i) => (
                    <li key={i} className="pl-3 border-l-2 border-destructive/50 text-muted-foreground">{risk}</li>
                  ))}
                  {latestRevision.risks.length === 0 && <span className="text-muted-foreground italic text-xs">No explicit risks identified.</span>}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <GitBranch className="h-3 w-3" /> Assumptions
                </h4>
                <ul className="text-sm space-y-2">
                  {latestRevision.assumptions.map((ass, i) => (
                    <li key={i} className="pl-3 border-l-2 border-primary/50 text-muted-foreground">{ass}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Decision Gate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Provide feedback to revise the plan, or leave empty to approve as is..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="resize-none font-mono text-xs bg-muted/50"
                rows={4}
              />

              {latestRevision.highRisk && (
                <div className="flex items-start space-x-2 p-3 bg-destructive/10 rounded-md border border-destructive/20 mt-2">
                  <Checkbox
                    id="high-risk-confirm"
                    checked={highRiskConfirmed}
                    onCheckedChange={(c) => setHighRiskConfirmed(c as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="high-risk-confirm"
                      className="text-xs font-semibold text-destructive cursor-pointer"
                    >
                      Acknowledge High-Risk Operation
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      This plan involves destructive actions, schema changes, or authentication scope modifications. I accept responsibility for this execution.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleRequestChanges}
                  disabled={!feedback.trim() || decidePlan.isPending}
                  className="w-full justify-between"
                >
                  Request Changes <Send className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={decidePlan.isPending || (latestRevision.highRisk && !highRiskConfirmed)}
                  className="w-full justify-between bg-green-600 hover:bg-green-700 text-white disabled:bg-muted disabled:text-muted-foreground"
                >
                  Approve Execution <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}