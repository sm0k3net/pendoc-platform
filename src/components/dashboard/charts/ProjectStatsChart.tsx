import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface FileStats {
  total: number;
  notes: number;
  code: number;
  images: number;
  reports: number;
  other: number;
}

interface ProjectStatsChartProps {
  fileStats: FileStats;
  folderCount: number;
  className?: string;
}

const FILE_TYPE_COLORS = {
  notes: '#8b5cf6',
  code: '#10b981',
  images: '#f59e0b',
  reports: '#3b82f6',
  other: '#6b7280',
};

export function ProjectStatsChart({ fileStats, folderCount, className }: ProjectStatsChartProps) {
  const chartData = useMemo(() => {
    return [
      { name: 'Notes', value: fileStats.notes, color: FILE_TYPE_COLORS.notes },
      { name: 'Code', value: fileStats.code, color: FILE_TYPE_COLORS.code },
      { name: 'Images', value: fileStats.images, color: FILE_TYPE_COLORS.images },
      { name: 'Reports', value: fileStats.reports, color: FILE_TYPE_COLORS.reports },
      { name: 'Other', value: fileStats.other, color: FILE_TYPE_COLORS.other },
    ];
  }, [fileStats]);

  const hasFiles = fileStats.total > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Project Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasFiles ? (
          <>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    width={60}
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
                    formatter={(value: number) => [value, 'Files']}
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
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{fileStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Files</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{folderCount}</p>
                <p className="text-xs text-muted-foreground">Folders</p>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No files yet</p>
            <p className="text-xs">Create files or upload reports to see statistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
