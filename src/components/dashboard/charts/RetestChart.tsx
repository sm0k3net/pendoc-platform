import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Clock, CheckCircle } from 'lucide-react';

interface RetestStats {
  waiting: number;
  completed: number;
  no_retest: number;
}

interface RetestChartProps {
  retestStats: RetestStats;
  className?: string;
}

const RETEST_COLORS = {
  waiting: '#f97316',
  completed: '#22c55e',
  no_retest: '#9ca3af',
};

export function RetestChart({ retestStats, className }: RetestChartProps) {
  const total = retestStats.waiting + retestStats.completed + retestStats.no_retest;

  const chartData = useMemo(() => {
    return [
      { name: 'Waiting', value: retestStats.waiting, color: RETEST_COLORS.waiting },
      { name: 'Completed', value: retestStats.completed, color: RETEST_COLORS.completed },
      { name: 'No Re-test', value: retestStats.no_retest, color: RETEST_COLORS.no_retest },
    ];
  }, [retestStats]);

  if (total === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Re-test Status
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
          <RefreshCw className="h-4 w-4 text-primary" />
          Re-test Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={70}
              />
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
                formatter={(value: number) => [value, 'Vulnerabilities']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-xl font-bold text-orange-500">{retestStats.waiting}</p>
            <p className="text-[10px] text-muted-foreground">Waiting</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-500">{retestStats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <RefreshCw className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-400">{retestStats.no_retest}</p>
            <p className="text-[10px] text-muted-foreground">No Re-test</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
