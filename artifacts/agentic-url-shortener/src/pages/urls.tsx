import { useState } from 'react';
import {
  useListUrls,
  useCreateUrl,
  useDeleteUrl,
  getListUrlsQueryKey,
  getGetDashboardQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, BarChart2, PauseCircle, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Link as WouterLink } from 'wouter';

export default function Urls() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: urls, isLoading } = useListUrls();

  const createUrl = useCreateUrl();
  const deleteUrl = useDeleteUrl();

  const [destination, setDestination] = useState('');
  const [slug, setSlug] = useState('');
  const shortUrlBase = `${window.location.origin}/api/go/`;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;

    createUrl.mutate({ data: { destination, slug: slug || undefined } }, {
      onSuccess: () => {
        toast({ title: "URL Created", description: "Endpoint registered successfully." });
        queryClient.invalidateQueries({ queryKey: getListUrlsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setDestination('');
        setSlug('');
      },
      onError: (err) => {
        toast({ title: "Creation Failed", description: String(err), variant: "destructive" });
      }
    });
  };

  const handleDelete = (slugToDelete: string) => {
    deleteUrl.mutate({ slug: slugToDelete }, {
      onSuccess: () => {
        toast({ title: "URL Deactivated", description: "Endpoint removed from routing table." });
        queryClient.invalidateQueries({ queryKey: getListUrlsQueryKey() });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "URL copied to clipboard." });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">URL Management</h1>
          <p className="text-muted-foreground">Provision and track shortened endpoints.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" /> Provision URL
              </CardTitle>
              <CardDescription>Create a new redirect endpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="destination">Destination URL</Label>
                  <Input
                    id="destination"
                    placeholder="https://engineering.corp.internal/..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Custom Slug (Optional)</Label>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="max-w-[170px] truncate text-muted-foreground text-sm font-mono bg-muted px-2 py-1.5 rounded border" title={shortUrlBase}>
                      {shortUrlBase}
                    </span>
                    <Input
                      id="slug"
                      placeholder="jira-123"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createUrl.isPending}>
                  {createUrl.isPending ? "Provisioning..." : "Create Endpoint"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground font-mono">FETCHING_RECORDS...</TableCell>
                  </TableRow>
                ) : urls?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No URLs provisioned.</TableCell>
                  </TableRow>
                ) : (
                  urls?.map(url => (
                    <TableRow key={url.slug}>
                      <TableCell className="font-mono font-medium">
                        <a
                          href={`${shortUrlBase}${url.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                          title="Open short URL"
                        >
                          /{url.slug}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs" title={url.destination}>
                        {url.destination}
                      </TableCell>
                      <TableCell>
                        <Badge variant={url.status === 'active' ? 'success' : 'secondary'} className="text-[10px] uppercase">
                          {url.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{url.clicks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${shortUrlBase}${url.slug}`)} title="Copy Short URL">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <WouterLink href={`/analytics/${url.slug}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:bg-accent hover:text-accent-foreground h-9 w-9" title="View Analytics">
                            <BarChart2 className="h-4 w-4 text-blue-500" />
                          </WouterLink>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(url.slug)}
                            title={url.status === 'paused' ? "Already paused" : "Pause redirect"}
                            disabled={deleteUrl.isPending || url.status === 'paused'}
                          >
                            <PauseCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
