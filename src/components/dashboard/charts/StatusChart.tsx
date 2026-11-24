import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDot, CheckCircle, XCircle } from 'lucide-react';

interface StatusStats {
  open: number;
  fixed: number;
  accepted: number;
  ignored: number;
}

interface StatusChartProps {
  statusStats: StatusStats;
  className?: string;
}

const STATUS_COLORS = {
  open: '#3b82f6',
  fixed: '#22c55e',
  accepted: '#eab308',
  ignored: '#6b7280',
};

const STATUS_LABELS = {
  open: 'Open',
  fixed: 'Fixed',
  accepted: 'Accepted',
  ignored: 'Ignored',
};

export function StatusChart({ statusStats, className }: StatusChartProps) {
  const total = statusStats.open + statusStats.fixed + statusStats.accepted + statusStats.ignored;

  const chartData = useMemo(() => {
    return [
      { name: 'Open', value: statusStats.open, color: STATUS_COLORS.open },
      { name: 'Fixed', value: statusStats.fixed, color: STATUS_COLORS.fixed },
      { name: 'Accepted', value: statusStats.accepted, color: STATUS_COLORS.accepted },
      { name: 'Ignored', value: statusStats.ignored, color: STATUS_COLORS.ignored },
    ].filter(item => item.value > 0);
  }, [statusStats]);

  if (total === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            Vulnerability Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No vulnerabilities recorded
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" />
          Vulnerability Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                }}
                labelStyle={{
                  color: 'hsl(var(--card-foreground))',
                }}
                itemStyle={{
                  color: 'hsl(var(--card-foreground))',
                }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend
                verticalAlign="bottom"
                height={40}
                iconSize={10}
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Status Breakdown */}
        <div className="mt-2 pt-3 border-t">
          <div className="grid grid-cols-4 gap-1 text-center text-xs">
            {[
              { key: 'open', label: 'Open', color: 'text-blue-500', icon: CircleDot },
              { key: 'fixed', label: 'Fixed', color: 'text-green-500', icon: CheckCircle },
              { key: 'accepted', label: 'Accept', color: 'text-yellow-500', icon: CheckCircle },
              { key: 'ignored', label: 'Ignore', color: 'text-gray-500', icon: XCircle },
            ].map(({ key, label, color, icon: Icon }) => (
              <div key={key} className="flex flex-col items-center">
                <span className={`font-bold ${color}`}>{statusStats[key as keyof StatusStats]}</span>
                <span className="text-muted-foreground text-[10px] flex items-center gap-0.5">
                  <Icon className="h-2.5 w-2.5" />
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
