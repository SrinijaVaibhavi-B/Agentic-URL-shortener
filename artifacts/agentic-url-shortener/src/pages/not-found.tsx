import { Link } from 'wouter';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-mono">404: RESOURCE_NOT_FOUND</h1>
        <p className="text-muted-foreground max-w-md">
          The requested system endpoint does not exist or has been restricted by access control policies.
        </p>
      </div>
      <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
        Return to Control Room
      </Link>
    </div>
  );
}
