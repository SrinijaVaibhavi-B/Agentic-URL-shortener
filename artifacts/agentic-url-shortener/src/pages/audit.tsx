import { useListActivity } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Database } from 'lucide-react';

export default function Audit() {
  const { data: events, isLoading } = useListActivity();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">Immutable record of system changes and operator actions.</p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground font-mono">QUERYING_AUDIT_LEDGER...</TableCell>
              </TableRow>
            ) : events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No events recorded.</TableCell>
              </TableRow>
            ) : (
              events?.map(event => (
                <TableRow key={event.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{event.actor}</TableCell>
                  <TableCell className="text-sm">{event.action}</TableCell>
                  <TableCell className="font-mono text-xs">{event.target}</TableCell>
                  <TableCell>
                    <Badge
                      variant={event.severity === 'info' ? 'secondary' : event.severity === 'success' ? 'success' : event.severity === 'warning' ? 'warning' : 'destructive'}
                      className="text-[10px] uppercase px-2 py-0"
                    >
                      {event.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={event.detail}>
                    {event.detail}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
