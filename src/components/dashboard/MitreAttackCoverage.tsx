import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Eye, Target } from 'lucide-react';

// All MITRE ATT&CK Enterprise Tactics
const ALL_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', phase: 'Pre-Attack' },
  { id: 'TA0042', name: 'Resource Development', phase: 'Pre-Attack' },
  { id: 'TA0001', name: 'Initial Access', phase: 'Attack' },
  { id: 'TA0002', name: 'Execution', phase: 'Attack' },
  { id: 'TA0003', name: 'Persistence', phase: 'Attack' },
  { id: 'TA0004', name: 'Privilege Escalation', phase: 'Attack' },
  { id: 'TA0005', name: 'Defense Evasion', phase: 'Attack' },
  { id: 'TA0006', name: 'Credential Access', phase: 'Attack' },
  { id: 'TA0007', name: 'Discovery', phase: 'Attack' },
  { id: 'TA0008', name: 'Lateral Movement', phase: 'Attack' },
  { id: 'TA0009', name: 'Collection', phase: 'Post-Attack' },
  { id: 'TA0011', name: 'Command and Control', phase: 'Post-Attack' },
  { id: 'TA0010', name: 'Exfiltration', phase: 'Post-Attack' },
  { id: 'TA0040', name: 'Impact', phase: 'Post-Attack' },
];

interface MitreMapping {
  vulnerability: string;
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
  detection?: string;
  mitigation?: string;
  dataSources?: string[];
  platforms?: string[];
}

interface MitreAttackCoverageProps {
  mitreMapping: MitreMapping[];
}

interface TacticCoverage {
  tactic: typeof ALL_TACTICS[0];
  techniques: MitreMapping[];
  hasDetection: boolean;
  hasMitigation: boolean;
}

export function MitreAttackCoverage({ mitreMapping }: MitreAttackCoverageProps) {
  const stats = useMemo(() => {
    // Group by tactic
    const tacticMap = new Map<string, MitreMapping[]>();
    
    mitreMapping.forEach(mapping => {
      const existing = tacticMap.get(mapping.tacticId) || [];
      existing.push(mapping);
      tacticMap.set(mapping.tacticId, existing);
    });
    
    // Build coverage data
    const coverage: TacticCoverage[] = ALL_TACTICS.map(tactic => {
      const techniques = tacticMap.get(tactic.id) || [];
      return {
        tactic,
        techniques,
        hasDetection: techniques.some(t => t.detection && t.detection.length > 0),
        hasMitigation: techniques.some(t => t.mitigation && t.mitigation.length > 0),
      };
    });
    
    // Calculate statistics
    const coveredTactics = coverage.filter(c => c.techniques.length > 0);
    const tacticsWithDetection = coveredTactics.filter(c => c.hasDetection);
    const tacticsWithMitigation = coveredTactics.filter(c => c.hasMitigation);
    const uniqueTechniques = new Set(mitreMapping.map(m => m.techniqueId)).size;

    const techniqueCounts = mitreMapping.reduce((acc, mapping) => {
      const existing = acc.get(mapping.techniqueId) || { name: mapping.techniqueName, count: 0 };
      existing.count += 1;
      acc.set(mapping.techniqueId, existing);
      return acc;
    }, new Map<string, { name: string; count: number }>());

    const topTechniques = [...techniqueCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, info]) => ({ id, name: info.name, count: info.count }));

    const tacticCounts = coverage
      .filter(c => c.techniques.length > 0)
      .map(c => ({ tactic: c.tactic, count: c.techniques.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Detection gaps
    const detectionGaps = coveredTactics.filter(c => !c.hasDetection);
    const mitigationGaps = coveredTactics.filter(c => !c.hasMitigation);
    
    // Group by phase
    const phases = {
      'Pre-Attack': coverage.filter(c => c.tactic.phase === 'Pre-Attack'),
      'Attack': coverage.filter(c => c.tactic.phase === 'Attack'),
      'Post-Attack': coverage.filter(c => c.tactic.phase === 'Post-Attack'),
    };
    
    return {
      coverage,
      coveredTactics,
      tacticsWithDetection,
      tacticsWithMitigation,
      uniqueTechniques,
      detectionGaps,
      mitigationGaps,
      phases,
      topTechniques,
      tacticCounts,
      coveragePercent: Math.round((coveredTactics.length / ALL_TACTICS.length) * 100),
      detectionPercent: coveredTactics.length > 0 
        ? Math.round((tacticsWithDetection.length / coveredTactics.length) * 100) 
        : 0,
      mitigationPercent: coveredTactics.length > 0 
        ? Math.round((tacticsWithMitigation.length / coveredTactics.length) * 100) 
        : 0,
    };
  }, [mitreMapping]);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Pre-Attack': return 'bg-blue-500';
      case 'Attack': return 'bg-orange-500';
      case 'Post-Attack': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getPhaseTextColor = (phase: string) => {
    switch (phase) {
      case 'Pre-Attack': return 'text-blue-600';
      case 'Attack': return 'text-orange-600';
      case 'Post-Attack': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500" />
          MITRE ATT&CK Coverage Statistics
          <Badge variant="outline" className="ml-auto text-xs">
            {stats.coveredTactics.length} / {ALL_TACTICS.length} Tactics
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="text-3xl font-bold text-purple-600">{stats.coveredTactics.length}</div>
            <div className="text-xs text-muted-foreground">Tactics Covered</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-3xl font-bold text-blue-600">{stats.uniqueTechniques}</div>
            <div className="text-xs text-muted-foreground">Unique Techniques</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-3xl font-bold text-green-600">{stats.tacticsWithDetection.length}</div>
            <div className="text-xs text-muted-foreground">With Detection</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="text-3xl font-bold text-orange-600">{stats.tacticsWithMitigation.length}</div>
            <div className="text-xs text-muted-foreground">With Mitigation</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Tactic Coverage</span>
              <span className="font-medium">{stats.coveragePercent}%</span>
            </div>
            <Progress value={stats.coveragePercent} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Detection Coverage
              </span>
              <span className="font-medium">{stats.detectionPercent}%</span>
            </div>
            <Progress value={stats.detectionPercent} className="h-2 [&>div]:bg-green-500" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Mitigation Coverage
              </span>
              <span className="font-medium">{stats.mitigationPercent}%</span>
            </div>
            <Progress value={stats.mitigationPercent} className="h-2 [&>div]:bg-orange-500" />
          </div>
        </div>

        {/* Coverage Insights */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border/60 bg-muted/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Most Mapped Techniques</div>
            {stats.topTechniques.length === 0 ? (
              <p className="text-sm text-muted-foreground">No technique mappings yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.topTechniques.map((technique) => (
                  <div key={technique.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{technique.id} — {technique.name}</span>
                    <Badge variant="secondary" className="text-xs">{technique.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 rounded-lg border border-border/60 bg-muted/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Most Covered Tactics</div>
            {stats.tacticCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tactic coverage yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.tacticCounts.map(({ tactic, count }) => (
                  <div key={tactic.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{tactic.name}</span>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attack Chain Visualization */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Attack Chain Coverage
          </h4>
          <div className="space-y-4">
            {Object.entries(stats.phases).map(([phase, tactics]) => (
              <div key={phase}>
                <div className={`text-xs font-semibold mb-2 ${getPhaseTextColor(phase)}`}>
                  {phase}
                </div>
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    {tactics.map(({ tactic, techniques, hasDetection, hasMitigation }) => (
                      <Tooltip key={tactic.id}>
                        <TooltipTrigger>
                          <div
                            className={`
                              relative px-3 py-2 rounded-lg border text-xs font-medium transition-all
                              ${techniques.length > 0 
                                ? 'bg-purple-500/10 border-purple-500/30 text-foreground' 
                                : 'bg-muted/50 border-dashed text-muted-foreground opacity-50'
                              }
                            `}
                          >
                            <span>{tactic.name}</span>
                            {techniques.length > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                              >
                                {techniques.length}
                              </Badge>
                            )}
                            {techniques.length > 0 && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                {hasDetection && (
                                  <div className="w-2 h-2 rounded-full bg-green-500" title="Has detection" />
                                )}
                                {hasMitigation && (
                                  <div className="w-2 h-2 rounded-full bg-orange-500" title="Has mitigation" />
                                )}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="text-sm">
                            <div className="font-semibold">{tactic.id}: {tactic.name}</div>
                            {techniques.length > 0 ? (
                              <div className="mt-1 space-y-1">
                                <div className="text-xs text-muted-foreground">
                                  {techniques.length} technique(s) mapped
                                </div>
                                {techniques.slice(0, 3).map((t, i) => (
                                  <div key={i} className="text-xs">• {t.techniqueName}</div>
                                ))}
                                {techniques.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{techniques.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground mt-1">
                                No techniques mapped
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detection Gaps */}
        {stats.detectionGaps.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Detection Gaps ({stats.detectionGaps.length})
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              The following covered tactics lack detection guidance:
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.detectionGaps.map(({ tactic }) => (
                <Badge key={tactic.id} variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  {tactic.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Mitigation Gaps */}
        {stats.mitigationGaps.length > 0 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" />
              Mitigation Gaps ({stats.mitigationGaps.length})
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              The following covered tactics lack mitigation strategies:
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.mitigationGaps.map(({ tactic }) => (
                <Badge key={tactic.id} variant="outline" className="text-xs border-red-500/50 text-red-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  {tactic.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50" />
            <span>Covered Tactic</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted border border-dashed" />
            <span>Uncovered Tactic</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Has Detection</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>Has Mitigation</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
