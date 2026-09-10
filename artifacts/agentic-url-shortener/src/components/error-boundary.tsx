import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8">
          <div className="rounded-full bg-destructive/10 p-4">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight font-mono">SYS_FAILURE</h1>
            <p className="text-muted-foreground">
              A runtime exception occurred in the frontend component tree.
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded text-left text-xs font-mono text-destructive max-h-48 overflow-auto border border-destructive/20">
              {this.state.error?.message}
            </div>
          </div>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            Attempt Recovery
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
