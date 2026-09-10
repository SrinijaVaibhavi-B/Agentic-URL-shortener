import React from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Activity,
  Box,
  Cpu,
  Link as LinkIcon,
  Network,
  TerminalSquare,
  LogOut,
} from 'lucide-react';
import { useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/control-room', label: 'Overview', icon: TerminalSquare },
  { href: '/runs', label: 'Orchestration', icon: Network },
  { href: '/urls', label: 'URL Shortener', icon: LinkIcon },
  { href: '/audit', label: 'Audit Log', icon: Activity },
  { href: '/architecture', label: 'Architecture', icon: Box },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: health } = useHealthCheck({ query: { refetchInterval: 30000, queryKey: getHealthCheckQueryKey() } });
  const isHealthy = health?.status === 'ok';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-mono font-semibold tracking-tight text-sidebar-primary-foreground">
            <Cpu className="h-5 w-5 text-sidebar-primary" />
            <span>AGENTIC_CTRL</span>
          </div>
        </div>

        <nav className="flex flex-1 gap-1 overflow-x-auto p-2 md:block md:space-y-1">
          <div className="hidden px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider md:block">
            Control Room
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href} className="block shrink-0">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer md:gap-3",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="hidden space-y-2 border-t border-sidebar-border p-4 md:block">
          <div className="px-3 text-xs text-sidebar-foreground/60">
            <div className="truncate font-medium text-sidebar-foreground">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Operator'}
            </div>
            <div className="truncate">{user?.primaryEmailAddress?.emailAddress}</div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/70 bg-sidebar-accent/50 rounded-md">
            <div className={cn("h-2 w-2 rounded-full", isHealthy ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
            <span className="font-mono text-xs">{isHealthy ? 'SYS_ONLINE' : 'SYS_DEGRADED'}</span>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-visible md:overflow-hidden">
        {/* Header Breadcrumbs area */}
        <header className="sticky top-0 z-10 hidden h-14 items-center border-b border-border bg-card/50 px-6 backdrop-blur-sm md:flex">
          <div className="flex items-center text-sm text-muted-foreground font-mono">
            <span>root</span>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">
              {navItems.find(i => location === i.href || (i.href !== '/' && location.startsWith(i.href)))?.label || 'Unknown'}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
