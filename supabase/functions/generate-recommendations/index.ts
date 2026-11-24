import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  environment: string | null;
  model_external: string | null;
  model_internal: string | null;
  rules_of_engagement: string | null;
  scope: {
    fqdns?: string[];
    urls?: string[];
    ips?: string[];
    mobile_apps?: string[];
    emails?: string[];
    phone_numbers?: string[];
  } | null;
  start_date: string | null;
  end_date: string | null;
}

interface VulnStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  byStatus: Record<string, number>;
}

interface Recommendation {
  id: string;
  category: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  rationale: string;
  expectedBenefits: string[];
  implementationSteps: string[];
  estimatedEffort: string;
  prerequisites?: string[];
  owner?: string;
  timelineWindow?: string;
  dependencies?: string[];
  relatedFindings?: string[];
  successMetrics?: string[];
  riskReduction?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const { projectId, action } = await req.json();
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Handle delete action
    if (action === 'delete') {
      const { error: deleteError } = await supabase
        .from('recommendations')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete recommendations: ${deleteError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, deleted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project data — verify the caller owns it (IDOR prevention)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    // Fetch vulnerability statistics — scoped to the authenticated user
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('severity, status, owasp_category, cwe_id, affected_assets, title')
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (vulnError) {
      throw new Error('Failed to fetch vulnerabilities');
    }

    const vulnStats: VulnStats = {
      total: vulnerabilities?.length || 0,
      critical: vulnerabilities?.filter(v => v.severity === 'critical').length || 0,
      high: vulnerabilities?.filter(v => v.severity === 'high').length || 0,
      medium: vulnerabilities?.filter(v => v.severity === 'medium').length || 0,
      low: vulnerabilities?.filter(v => v.severity === 'low').length || 0,
      info: vulnerabilities?.filter(v => v.severity === 'info').length || 0,
      byStatus: {
        open: vulnerabilities?.filter(v => v.status === 'open').length || 0,
        fixed: vulnerabilities?.filter(v => v.status === 'fixed').length || 0,
        accepted: vulnerabilities?.filter(v => v.status === 'accepted').length || 0,
      }
    };

    // Fetch attack vector data
    const { data: attackVector } = await supabase
      .from('attack_vectors')
      .select('description, vulnerability_count, timeline')
      .eq('project_id', projectId)
      .maybeSingle();

    // Fetch remediation strategy
    const { data: remediationStrategy } = await supabase
      .from('remediation_strategies')
      .select('executive_summary, items, total_effort, quick_wins, long_term_goals')
      .eq('project_id', projectId)
      .maybeSingle();

    // Build comprehensive context for AI
    const projectScope = project.scope as ProjectData['scope'];
    const scopeSummary = projectScope ? {
      fqdns: projectScope.fqdns?.length || 0,
      urls: projectScope.urls?.length || 0,
      ips: projectScope.ips?.length || 0,
      mobileApps: projectScope.mobile_apps?.length || 0,
      emails: projectScope.emails?.length || 0,
      phoneNumbers: projectScope.phone_numbers?.length || 0,
    } : null;

    // Get unique OWASP categories and CWEs
    const owaspCategories = [...new Set(vulnerabilities?.filter(v => v.owasp_category).map(v => v.owasp_category))];
    const cweIds = [...new Set(vulnerabilities?.filter(v => v.cwe_id).map(v => v.cwe_id))];
    const topFindings = (vulnerabilities || []).slice(0, 8).map((v) => `${v.title} [${v.severity}]`);
    
    // Get affected asset types
    const allAssets = vulnerabilities?.flatMap(v => v.affected_assets || []) || [];
    const hasWebAssets = allAssets.some(a => a?.includes('http') || a?.includes('www'));
    const hasAPIAssets = allAssets.some(a => a?.includes('api') || a?.includes('endpoint'));
    const hasNetworkAssets = scopeSummary?.ips && scopeSummary.ips > 0;
    const hasMobileAssets = scopeSummary?.mobileApps && scopeSummary.mobileApps > 0;

    const prompt = `You are an elite penetration testing consultant and security strategist. Based on the comprehensive analysis of a completed penetration test, provide detailed recommendations for improving the client's security posture and future testing approach.

PROJECT CONTEXT:
- Project Name: ${project.name}
- Description: ${project.description || 'Not provided'}
- Environment: ${project.environment || 'Not specified'}
- Testing Model (External): ${project.model_external || 'Not specified'}
- Testing Model (Internal): ${project.model_internal || 'Not specified'}
- Test Duration: ${project.start_date && project.end_date ? `${project.start_date} to ${project.end_date}` : 'Not specified'}
- Rules of Engagement: ${project.rules_of_engagement || 'Not specified'}

SCOPE OF WORK:
${scopeSummary ? `
- FQDNs: ${scopeSummary.fqdns}
- URLs: ${scopeSummary.urls}
- IPs: ${scopeSummary.ips}
- Mobile Apps: ${scopeSummary.mobileApps}
- Emails: ${scopeSummary.emails}
- Phone Numbers: ${scopeSummary.phoneNumbers}
` : 'No scope defined'}

VULNERABILITY STATISTICS:
- Total Vulnerabilities: ${vulnStats.total}
- Critical: ${vulnStats.critical}
- High: ${vulnStats.high}
- Medium: ${vulnStats.medium}
- Low: ${vulnStats.low}
- Informational: ${vulnStats.info}
- Status: Open (${vulnStats.byStatus.open}), Fixed (${vulnStats.byStatus.fixed}), Accepted (${vulnStats.byStatus.accepted})

VULNERABILITY CATEGORIES:
- OWASP Categories Found: ${owaspCategories.join(', ') || 'None'}
- CWE IDs Found: ${cweIds.join(', ') || 'None'}

ASSET TYPES TESTED:
- Web Applications: ${hasWebAssets ? 'Yes' : 'No'}
- APIs: ${hasAPIAssets ? 'Yes' : 'No'}
- Network Infrastructure: ${hasNetworkAssets ? 'Yes' : 'No'}
- Mobile Applications: ${hasMobileAssets ? 'Yes' : 'No'}

${attackVector ? `
ATTACK VECTOR ANALYSIS SUMMARY:
${attackVector.description?.substring(0, 500)}...
Vulnerability Count in Attack Chain: ${attackVector.vulnerability_count}
` : 'No attack vector analysis available.'}

${remediationStrategy ? `
REMEDIATION STRATEGY SUMMARY:
Executive Summary: ${(remediationStrategy.executive_summary as string)?.substring(0, 300)}...
Total Effort: ${remediationStrategy.total_effort}
Quick Wins: ${(remediationStrategy.quick_wins as string[])?.length || 0}
Remediation Items: ${(remediationStrategy.items as unknown[])?.length || 0}
` : 'No remediation strategy available.'}

TOP FINDINGS TO REFERENCE:
${topFindings.length > 0 ? topFindings.map((finding, index) => `${index + 1}. ${finding}`).join('\n') : 'No findings available'}

GENERATE COMPREHENSIVE RECOMMENDATIONS:

Analyze all the above information and provide actionable recommendations across these categories:

1. **SCOPE EXPANSION** - Suggest additional areas to include in future tests:
   - Identify gaps in current scope coverage
   - Recommend additional asset types (APIs, internal networks, cloud, OSINT, social engineering)
   - Suggest specific areas based on vulnerability patterns found

2. **METHODOLOGY IMPROVEMENTS** - Recommend changes to testing approach:
   - Testing model changes (black box → gray box → white box)
   - Additional assessment types (red team, purple team, security audit)
   - Specialized testing (API security, cloud security, container security)

3. **CONTINUOUS SECURITY** - Ongoing security measures:
   - Security monitoring and detection capabilities
   - Vulnerability management improvements
   - Security training recommendations

4. **COMPLIANCE & GOVERNANCE** - Regulatory and policy recommendations:
   - Relevant compliance frameworks
   - Policy improvements
   - Security governance enhancements

5. **TECHNOLOGY & TOOLS** - Security technology recommendations:
   - Security tools and solutions
   - Automation opportunities
   - Integration improvements

For each recommendation, provide:
- Clear title and category
- Priority (high/medium/low)
- Detailed description
- Rationale based on findings
- Expected benefits (list)
- Implementation steps (list)
- Estimated effort
- Recommended owner (e.g. AppSec, Engineering, DevOps, Platform, Security Leadership)
- Timeline window (e.g. 0-30 days, 30-90 days, 90+ days)
- Related findings from the vulnerabilities above
- Success metrics / validation criteria
- Dependencies or blockers
- Risk reduction statement
- Prerequisites if any

QUALITY BAR:
- Recommendations must be specific, implementation-ready, and clearly tied to the findings and testing outcomes.
- Avoid generic advice like "improve security" without concrete action.
- Favor 5-8 high quality recommendations over a long vague list.
- Include both tactical fixes and strategic program improvements.
- Ensure the priority matrix references recommendation IDs that actually exist.

RESPOND WITH ONLY THIS JSON (no markdown, no code blocks):
{
  "summary": "2-3 paragraph executive summary of the overall recommendations",
  "keyFindings": ["Finding 1", "Finding 2", "..."],
  "recommendations": [
    {
      "id": "REC-001",
      "category": "Scope Expansion",
      "title": "Include API Security Testing",
      "priority": "high",
      "description": "Detailed description of the recommendation...",
      "rationale": "Based on the vulnerabilities found in web endpoints, there's a high likelihood...",
      "expectedBenefits": ["Benefit 1", "Benefit 2"],
      "implementationSteps": ["Step 1", "Step 2"],
      "estimatedEffort": "2-3 weeks",
      "owner": "Engineering",
      "timelineWindow": "0-30 days",
      "dependencies": ["Dependency 1"],
      "relatedFindings": ["Finding title 1"],
      "successMetrics": ["Metric 1"],
      "riskReduction": "Reduces likelihood of account compromise through exposed auth flows",
      "prerequisites": ["Prerequisite 1"]
    }
  ],
  "priorityMatrix": {
    "immediate": ["REC-001", "REC-002"],
    "shortTerm": ["REC-003"],
    "longTerm": ["REC-004", "REC-005"]
  },
  "estimatedTotalInvestment": "Summary of total investment needed",
  "expectedROI": "Summary of expected return on investment"
}`;

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: 'You are an elite cybersecurity consultant specializing in penetration testing strategy and security program development. Provide actionable, specific, and prioritized recommendations based on assessment findings. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from DeepSeek API');
    }

    // Parse JSON response
    let parsed;
    try {
      let jsonStr = aiResponse.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {

      throw new Error('Failed to parse recommendations response');
    }

    console.log('Recommendations generated successfully');

    const projectContext = {
      name: project.name,
      environment: project.environment,
      modelExternal: project.model_external,
      modelInternal: project.model_internal,
      vulnStats,
      scopeSummary,
    };

    // Persist (one row per project)
    const { data: saved, error: saveError } = await supabase
      .from('recommendations')
      .upsert(
        {
          project_id: projectId,
          user_id: user.id,
          summary: parsed.summary || '',
          key_findings: parsed.keyFindings || [],
          recommendations: parsed.recommendations || [],
          priority_matrix: parsed.priorityMatrix || {},
          estimated_total_investment: parsed.estimatedTotalInvestment || null,
          expected_roi: parsed.expectedROI || null,
          project_context: projectContext,
        },
        { onConflict: 'project_id' }
      )
      .select('id, updated_at, client_visible')
      .single();

    if (saveError) {
      console.error('Failed to persist recommendations:', saveError);
      throw new Error('Failed to save recommendations');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        id: saved.id,
        client_visible: saved.client_visible,
        summary: parsed.summary,
        keyFindings: parsed.keyFindings || [],
        recommendations: parsed.recommendations || [],
        priorityMatrix: parsed.priorityMatrix || { immediate: [], shortTerm: [], longTerm: [] },
        estimatedTotalInvestment: parsed.estimatedTotalInvestment || '',
        expectedROI: parsed.expectedROI || '',
        projectContext,
        savedAt: saved.updated_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate recommendations error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
