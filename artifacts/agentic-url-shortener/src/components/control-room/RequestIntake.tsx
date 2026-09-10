import { useState } from 'react';
import { useListScenarios, type Scenario } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Terminal, ArrowRight, Zap } from 'lucide-react';

interface RequestIntakeProps {
  onSubmit: (request: string, scenarioId?: string) => void;
  isLoading: boolean;
}

export function RequestIntake({ onSubmit, isLoading }: RequestIntakeProps) {
  const { data: scenarios, isLoading: loadingScenarios } = useListScenarios();
  const [request, setRequest] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!request.trim() && !selectedScenarioId) return;
    onSubmit(request, selectedScenarioId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <h2 className="text-2xl font-bold tracking-tight flex items-center justify-center md:justify-start gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          Autonomous Operations
        </h2>
        <p className="text-muted-foreground">
          Describe the engineering change. The agent will formulate a plan, assess risks, and request approval before mutating the repository.
        </p>
      </div>

      <Card className="border-primary/20 shadow-lg shadow-primary/5">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <Textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Add a rate limiter to the URL creation endpoint using Redis..."
              className="min-h-[160px] resize-none border-0 focus-visible:ring-0 rounded-b-none text-base md:text-lg p-6 bg-transparent"
              autoFocus
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 border-t">
              <div className="flex-1 flex items-center gap-2 overflow-x-auto w-full">
                <span className="text-xs font-mono text-muted-foreground uppercase shrink-0">Presets:</span>
                {loadingScenarios ? (
                  <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
                ) : (
                  scenarios?.map(scenario => (
                    <Badge
                      key={scenario.id}
                      variant={selectedScenarioId === scenario.id ? 'default' : 'outline'}
                      className="cursor-pointer shrink-0 transition-colors hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setSelectedScenarioId(
                        selectedScenarioId === scenario.id ? undefined : scenario.id
                      )}
                    >
                      {scenario.name}
                    </Badge>
                  ))
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading || (!request.trim() && !selectedScenarioId)}
                className="w-full sm:w-auto font-mono gap-2 relative overflow-hidden group"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Planning...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Generate Plan <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
        <Zap className="h-3 w-3 text-amber-500" />
        <span className="opacity-80">Pro tip: Use Cmd+Enter to submit</span>
      </div>
    </div>
  );
}