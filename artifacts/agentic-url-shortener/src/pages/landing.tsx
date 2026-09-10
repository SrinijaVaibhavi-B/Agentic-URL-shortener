import { Link } from "wouter";
import {
  ArrowRight,
  GitBranch,
  Link as LinkIcon,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const capabilities = [
  {
    icon: GitBranch,
    title: "Governed orchestration",
    description:
      "Dependency-aware execution with approval gates, retries, rollback, safe stop, and durable decision lineage.",
  },
  {
    icon: LinkIcon,
    title: "Reliable redirects",
    description:
      "Transactional slug allocation, durable click events, reversible pause controls, and live analytics.",
  },
  {
    icon: ShieldCheck,
    title: "Production controls",
    description:
      "Authenticated access, redirect policy checks, rate limits, readiness probes, and tamper-evident audit history.",
  },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-mono font-semibold">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-8 w-8" />
          AGENTIC_CTRL
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-slate-200 hover:bg-slate-800 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button>Request access</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-sm text-blue-200">
            <LockKeyhole className="h-3.5 w-3.5" />
            Authenticated engineering control plane
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Ship short links with governed agentic delivery.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            A durable URL platform and SDLC orchestration system with explicit
            gates, observable decisions, bounded autonomy, and operator control.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up">
              <Button size="lg">
                Create operator account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 bg-transparent text-white hover:bg-slate-800"
              >
                Open control room
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <Card
                key={capability.title}
                className="border-slate-800 bg-slate-900/80 text-slate-50"
              >
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{capability.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {capability.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}