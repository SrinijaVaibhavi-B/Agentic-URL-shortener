import { useGetUrlAnalytics, getGetUrlAnalyticsQueryKey } from '@workspace/api-client-react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowLeft, Users, MousePointerClick, Percent, Link } from 'lucide-react';
import { Link as WouterLink } from 'wouter';

export default function Analytics() {
  const [, params] = useRoute('/analytics/:slug');
  const slug = params?.slug || '';

  const { data: analytics, isLoading } = useGetUrlAnalytics(slug, {
    query: { enabled: !!slug, queryKey: getGetUrlAnalyticsQueryKey(slug) }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono">LOADING_TELEMETRY...</div>;
  if (!analytics) return <div className="p-8 text-center text-muted-foreground">No data found for slug: {slug}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <WouterLink href="/urls" className="hover:bg-muted p-2 rounded-md transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </WouterLink>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Link className="h-6 w-6 text-primary" />
            /{analytics.slug}
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Analytics Report</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{analytics.totalClicks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{analytics.uniqueVisitors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CTR (Est)</CardTitle>
            <Percent className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{(analytics.clickThroughRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Click Volume (7 Days)</CardTitle>
            <CardDescription>Daily traffic distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailyClicks}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontFamily: 'monospace' }} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Top Referrers</CardTitle>
            <CardDescription>Traffic sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topReferrers && analytics.topReferrers.length > 0 ? (
                analytics.topReferrers.map(ref => (
                  <div key={ref.source} className="flex items-center justify-between">
                    <span className="font-medium text-sm">{ref.source}</span>
                    <span className="font-mono text-sm text-muted-foreground">{ref.clicks} clicks</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">No referrer data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
