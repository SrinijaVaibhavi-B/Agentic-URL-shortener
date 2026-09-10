import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetExecution,
  useListExecutionEvents,
  useListExecutionArtifacts,
  useGetExecutionReceipt,
  useStopExecution,
  useReplanExecution,
  getGetExecutionQueryKey,
  getListExecutionEventsQueryKey,
  getListExecutionArtifactsQueryKey,
  getGetExecutionReceiptQueryKey,
  type ExecutionArtifact
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Terminal,
  OctagonX,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  FileCode,
  FileText,
  FileCheck,
  Cpu,
  Clock,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface ExecutionMonitorProps {
  executionId: string;
  onExit: () => void;
  onReplan: (planId: string) => void;
}

export function ExecutionMonitor({ executionId, onExit, onReplan }: ExecutionMonitorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: execution, isLoading: execLoading } = useGetExecution(executionId, {
    query: {
      queryKey: getGetExecutionQueryKey(executionId),
      refetchInterval: (query) => ['completed', 'failed', 'stopped'].includes(query.state.data?.status || '') ? false : 1000
    }
  });

  const isTerminal = execution ? ['completed', 'failed', 'stopped'].includes(execution.status) : false;

  const { data: events, isLoading: eventsLoading } = useListExecutionEvents(executionId, {
    query: {
      queryKey: getListExecutionEventsQueryKey(executionId),
      refetchInterval: isTerminal ? false : 1000
    }
  });

  const { data: artifacts } = useListExecutionArtifacts(executionId, {
    query: {
      queryKey: getListExecutionArtifactsQueryKey(executionId),
      refetchInterval: isTerminal ? false : 2000
    }
  });

  const { data: receipt } = useGetExecutionReceipt(executionId, {
    query: {
      queryKey: getGetExecutionReceiptQueryKey(executionId),
      enabled: isTerminal
    }
  });

  const stopExecution = useStopExecution();
  const replanExecution = useReplanExecution();

  const [feedback, setFeedback] = useState('');
  const [showReplan, setShowReplan] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<ExecutionArtifact | null>(null);

  if (execLoading && !execution) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">CONNECTING_TO_EXECUTION_CONTEXT...</div>;
  }

  if (!execution) return null;

  const handleStop = () => {
    stopExecution.mutate({ executionId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExecutionQueryKey(executionId) });
      },
      onError: (err) => {
        toast({
          title: 'Stop failed',
          description: String(err),
          variant: 'destructive'
        });
      }
    });
  };

  const handleReplan = () => {
    if (!feedback.trim()) return;
    replanExecution.mutate({ executionId, data: { feedback } }, {
      onSuccess: (plan) => {
        setShowReplan(false);
        setFeedback('');
        queryClient.invalidateQueries({ queryKey: getGetExecutionQueryKey(executionId) });
        onReplan(plan.id);
      },
      onError: (err) => {
        toast({
          title: 'Replan request failed',
          description: String(err),
          variant: 'destructive'
        });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'failed': return 'destructive';
      case 'replanning': return 'warning';
      case 'stopped': return 'secondary';
      default: return 'outline';
    }
  };

  const getEventIcon = (level: string) => {
    switch (level) {
      case 'info': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertOctagon className="h-4 w-4 text-amber-500" />;
      default: return <Terminal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getArtifactIcon = (kind: string) => {
    switch (kind) {
      case 'patch': return <FileCode className="h-4 w-4 text-blue-500" />;
      case 'receipt': return <FileCheck className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Execution: {executionId.split('-')[0]}
          </h2>
          <div className="flex items-center gap-2 mt-2 font-mono text-xs">
            <Badge variant={getStatusColor(execution.status)} className="uppercase">{execution.status}</Badge>
            <span className="text-muted-foreground">ATTEMPT: {execution.attempt}</span>
            {execution.finishedAt && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {format(new Date(execution.finishedAt), 'HH:mm:ss')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isTerminal && (
            <>
              <Button variant="outline" onClick={() => setShowReplan(true)} className="font-mono text-xs">
                <RotateCcw className="h-4 w-4 mr-2" /> REPLAN
              </Button>
              <Button variant="destructive" onClick={handleStop} disabled={stopExecution.isPending || execution.stopRequested} className="font-mono text-xs">
                <OctagonX className="h-4 w-4 mr-2" /> {execution.stopRequested ? 'STOPPING...' : 'HALT'}
              </Button>
            </>
          )}
          {isTerminal && (
            <Button variant="outline" onClick={onExit} className="font-mono text-xs">
              EXIT COCKPIT
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-sm font-mono flex items-center justify-between">
                <span className="flex items-center gap-2"><Terminal className="h-4 w-4" /> stdout</span>
                <span className="text-xs font-normal text-muted-foreground">Live Telemetry</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-[#0f172a] text-slate-300">
              <ScrollArea className="h-[500px] w-full p-4 font-mono text-xs">
                {eventsLoading && !events ? (
                  <div className="animate-pulse">Awaiting telemetry...</div>
                ) : (
                  <div className="space-y-2">
                    {events?.map((event) => (
                      <div key={event.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                        <span className="text-slate-500 shrink-0 w-20">
                          {format(new Date(event.createdAt), 'HH:mm:ss')}
                        </span>
                        <span className="shrink-0">{getEventIcon(event.level)}</span>
                        <div className="flex-1 min-w-0 break-words">
                          <span className={event.level === 'error' ? 'text-red-400' : event.level === 'warning' ? 'text-amber-400' : 'text-slate-300'}>
                            {event.message}
                          </span>
                          {Object.keys(event.metadata).length > 0 && (
                            <pre className="mt-1 text-[10px] text-slate-500 bg-black/30 p-2 rounded overflow-x-auto opacity-0 group-hover:opacity-100 transition-opacity">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                    {!isTerminal && (
                      <div className="flex gap-3 p-1 animate-pulse">
                        <span className="text-slate-500 shrink-0 w-20">--:--:--</span>
                        <span className="w-2 h-4 bg-primary inline-block shrink-0" />
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {receipt && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-green-600 flex items-center justify-between">
                  <span className="flex items-center gap-2"><FileCheck className="h-4 w-4" /> Execution Receipt</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full justify-between font-mono text-xs h-auto py-3 bg-background"
                  onClick={() => setSelectedArtifact(receipt)}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-foreground">Verified Proof of Work</span>
                    <span className="text-[10px] text-muted-foreground break-all">{receipt.id}</span>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Artifacts</CardTitle>
              <CardDescription>Outputs generated during execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {artifacts?.length === 0 ? (
                  <div className="text-xs text-muted-foreground font-mono">No artifacts emitted yet.</div>
                ) : (
                  artifacts?.map(art => (
                    <Button
                      key={art.id}
                      variant="outline"
                      className="w-full justify-start font-mono text-xs h-auto py-3"
                      onClick={() => setSelectedArtifact(art)}
                    >
                      {getArtifactIcon(art.kind)}
                      <div className="ml-3 text-left min-w-0">
                        <div className="truncate font-medium">{art.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{art.kind}</div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {execution.error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive uppercase tracking-wider flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4" /> Fatal Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-mono text-destructive/80 break-words bg-destructive/10 p-2 rounded border border-destructive/20">
                  {execution.error}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showReplan} onOpenChange={setShowReplan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replan Execution</DialogTitle>
            <DialogDescription>
              Interrupt current execution to request changes. The agent will formulate a new plan for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Explain what needs to change..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="resize-none font-mono text-xs"
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReplan(false)}>Cancel</Button>
            <Button onClick={handleReplan} disabled={!feedback.trim() || replanExecution.isPending}>
              Submit Replan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedArtifact} onOpenChange={(o) => !o && setSelectedArtifact(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedArtifact && getArtifactIcon(selectedArtifact.kind)}
              {selectedArtifact?.name}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase">
              {selectedArtifact?.kind}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border bg-muted/30 relative">
            <ScrollArea className="h-full">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                {selectedArtifact?.content}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}