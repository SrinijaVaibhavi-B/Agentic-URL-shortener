import { useState, useEffect } from 'react';
import { useCreateAgentPlan } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { RequestIntake } from '@/components/control-room/RequestIntake';
import { PlanReview } from '@/components/control-room/PlanReview';
import { ExecutionMonitor } from '@/components/control-room/ExecutionMonitor';
import { GitPullRequestDraft, ShieldAlert, Cpu } from 'lucide-react';

type CockpitState =
  | { stage: 'intake' }
  | { stage: 'planning'; planId: string }
  | { stage: 'executing'; executionId: string };

export default function Runs() {
  const { toast } = useToast();
  const createAgentPlan = useCreateAgentPlan();

  const [state, setState] = useState<CockpitState>(() => {
    try {
      const stored = sessionStorage.getItem('cockpitState');
      return stored ? JSON.parse(stored) : { stage: 'intake' };
    } catch {
      return { stage: 'intake' };
    }
  });

  useEffect(() => {
    if (state.stage === 'intake') {
      sessionStorage.removeItem('cockpitState');
    } else {
      sessionStorage.setItem('cockpitState', JSON.stringify(state));
    }
  }, [state]);

  const handleIntakeSubmit = (changeRequest: string, scenarioId?: string) => {
    createAgentPlan.mutate(
      {
        data: {
          scenarioId,
          changeRequest: changeRequest.trim() || undefined,
        },
      },
      {
        onSuccess: (plan) => {
          setState({ stage: 'planning', planId: plan.id });
          toast({
            title: 'Plan formulated',
            description: 'Awaiting operator review and authorization.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Planning failed',
            description: String(error),
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))]">
      <div className="border-b bg-muted/20 px-6 py-3 flex items-center gap-4 text-sm font-mono overflow-x-auto">
        <div className={`flex items-center gap-2 ${state.stage === 'intake' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          <GitPullRequestDraft className="h-4 w-4" /> 01_REQUEST
        </div>
        <div className="text-muted-foreground/30">/</div>
        <div className={`flex items-center gap-2 ${state.stage === 'planning' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          <ShieldAlert className="h-4 w-4" /> 02_REVIEW
        </div>
        <div className="text-muted-foreground/30">/</div>
        <div className={`flex items-center gap-2 ${state.stage === 'executing' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          <Cpu className="h-4 w-4" /> 03_EXECUTE
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        {state.stage === 'intake' && (
          <div className="flex-1 flex items-center justify-center py-12">
            <RequestIntake
              onSubmit={handleIntakeSubmit}
              isLoading={createAgentPlan.isPending}
            />
          </div>
        )}

        {state.stage === 'planning' && (
          <div className="flex-1 py-6">
            <PlanReview
              planId={state.planId}
              onApprove={(execution) => setState({ stage: 'executing', executionId: execution.id })}
              onCancel={() => setState({ stage: 'intake' })}
            />
          </div>
        )}

        {state.stage === 'executing' && (
          <div className="flex-1 py-6">
            <ExecutionMonitor
              executionId={state.executionId}
              onExit={() => setState({ stage: 'intake' })}
              onReplan={(planId) => setState({ stage: 'planning', planId })}
            />
          </div>
        )}
      </div>
    </div>
  );
}