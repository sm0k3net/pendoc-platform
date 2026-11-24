import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

interface RemediationStrategyResponse {
  executive_summary: string;
  total_effort: string;
  recommended_timeline: string;
  quick_wins: string[];
  items: Array<{
    priority: number;
    title: string;
    severity: string;
    effort: string;
    timeline: string;
    description: string;
    steps: string[];
    dependencies?: string[];
  }>;
  long_term_goals: Array<string | {
    goal: string;
    category: string;
    timeframe: string;
    description: string;
    benefits: string[];
    implementation_steps: string[];
  }>;
}

function extractBalancedJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return null;
}

function sanitizeJsonCandidate(raw: string): string {
  const fenceMatch = raw.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
  const withoutFences = fenceMatch ? fenceMatch[1].trim() : raw.trim();
  return extractBalancedJsonObject(withoutFences) || withoutFences;
}

function normalizeStrategyPayload(payload: any): RemediationStrategyResponse {
  const quickWins = Array.isArray(payload?.quick_wins) ? payload.quick_wins.map((item: unknown) => String(item)).filter(Boolean) : [];
  const items = Array.isArray(payload?.items)
    ? payload.items.map((item: any, index: number) => ({
        priority: Number(item?.priority) || index + 1,
        title: String(item?.title || `Remediation Item ${index + 1}`),
        severity: String(item?.severity || 'medium').toLowerCase(),
        effort: String(item?.effort || 'Medium (4-16 hours)'),
        timeline: String(item?.timeline || '1-2 weeks'),
        description: String(item?.description || 'No description provided.'),
        steps: Array.isArray(item?.steps) ? item.steps.map((step: unknown) => String(step)).filter(Boolean) : [],
        dependencies: Array.isArray(item?.dependencies) ? item.dependencies.map((dependency: unknown) => String(dependency)).filter(Boolean) : [],
      }))
    : [];
  const goals = Array.isArray(payload?.long_term_goals)
    ? payload.long_term_goals.map((goal: any) => {
        if (typeof goal === 'string') return goal;
        return {
          goal: String(goal?.goal || 'Strategic security goal'),
          category: String(goal?.category || 'Process'),
          timeframe: String(goal?.timeframe || '6-12 months'),
          description: String(goal?.description || 'No description provided.'),
          benefits: Array.isArray(goal?.benefits) ? goal.benefits.map((item: unknown) => String(item)).filter(Boolean) : [],
          implementation_steps: Array.isArray(goal?.implementation_steps) ? goal.implementation_steps.map((item: unknown) => String(item)).filter(Boolean) : [],
        };
      })
    : [];

  return {
    executive_summary: String(payload?.executive_summary || '').trim(),
    total_effort: String(payload?.total_effort || '').trim(),
    recommended_timeline: String(payload?.recommended_timeline || '').trim(),
    quick_wins: quickWins,
    items,
    long_term_goals: goals,
  };
}

async function repairJsonWithAI(raw: string, deepseekKey: string): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You repair malformed JSON. Return only valid JSON preserving the original meaning. Never add markdown or explanations.'
        },
        {
          role: 'user',
          content: `Repair this malformed JSON into valid JSON with the same schema:\n\n${raw}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI JSON repair failed: ${response.status} ${errorText}`);
  }

  const aiResponse = await response.json();
  return aiResponse.choices?.[0]?.message?.content || '';
}

async function parseStrategyResponse(raw: string, deepseekKey: string): Promise<RemediationStrategyResponse> {
  const initialCandidate = sanitizeJsonCandidate(raw);

  try {
    return normalizeStrategyPayload(JSON.parse(initialCandidate));
  } catch (parseError) {
    console.error('Primary remediation parse failed:', parseError);
    const repaired = await repairJsonWithAI(initialCandidate, deepseekKey);
    const repairedCandidate = sanitizeJsonCandidate(repaired);
    return normalizeStrategyPayload(JSON.parse(repairedCandidate));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, action } = await req.json();
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Handle delete action
    if (action === 'delete') {
      const { error: deleteError } = await supabase
        .from('remediation_strategies')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete remediation strategy: ${deleteError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, deleted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deepseekKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    // Fetch project vulnerabilities — scope query to the caller's project (IDOR prevention)
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('title, description, severity, status, remediation, cvss_score, affected_assets, owasp_category, cwe_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .in('status', ['open', 'retest', 'validated']);

    if (vulnError) throw vulnError;

    if (!vulnerabilities || vulnerabilities.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No open vulnerabilities found. Complete vulnerability assessment first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project info — scoped to the caller
    const { data: project } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    console.log(`Generating remediation strategy for ${vulnerabilities.length} vulnerabilities`);

    // Build the prompt with enhanced long-term goals requirements
    const vulnSummary = vulnerabilities.map((v, i) => {
      return `${i + 1}. [${v.severity?.toUpperCase() || 'UNKNOWN'}] ${v.title}
   Description: ${v.description || 'N/A'}
   CVSS Score: ${v.cvss_score || 'N/A'}
   CWE: ${v.cwe_id || 'N/A'}
   OWASP: ${v.owasp_category || 'N/A'}
   Affected Assets: ${v.affected_assets?.join(', ') || 'N/A'}
   Current Remediation Suggestion: ${v.remediation || 'N/A'}`;
    }).join('\n\n');

    const prompt = `You are a senior security consultant creating a comprehensive remediation strategy for a penetration testing engagement.

PROJECT: ${project?.name || 'Security Assessment'}
${project?.description ? `Description: ${project.description}` : ''}

VULNERABILITIES FOUND (${vulnerabilities.length} total):
${vulnSummary}

Create a comprehensive remediation strategy with the following structure. Return ONLY valid JSON:

{
  "executive_summary": "3-4 paragraph comprehensive summary of the overall security posture, key risks identified, business impact assessment, and high-level remediation approach. Be specific and professional.",
  "total_effort": "Estimated total effort with breakdown (e.g., '80-120 person-hours over 4-6 weeks')",
  "recommended_timeline": "Detailed timeline with phases (e.g., 'Phase 1 (Week 1-2): Critical fixes. Phase 2 (Week 3-4): High priority items. Phase 3 (Week 5-6): Medium/Low priority and hardening')",
  "quick_wins": ["List of 4-6 specific quick wins that can be implemented within 24-48 hours with minimal effort and immediate security impact"],
  "items": [
    {
      "priority": 1,
      "title": "Clear remediation item title",
      "severity": "critical|high|medium|low",
      "effort": "Low (1-4 hours)|Medium (4-16 hours)|High (16+ hours)",
      "timeline": "e.g., '1-2 days', '1 week'",
      "description": "Detailed description of what needs to be done, why it's important, and the security impact",
      "steps": ["Specific Step 1 with commands/actions", "Step 2 with detailed instructions", "Step 3 with verification steps", "..."],
      "dependencies": ["Optional: list of dependencies or prerequisites that must be completed first"]
    }
  ],
  "long_term_goals": [
    {
      "goal": "Strategic security goal title",
      "category": "Policy|Process|Technology|Training|Monitoring",
      "timeframe": "3-6 months|6-12 months|12+ months",
      "description": "Detailed description of the goal and its importance",
      "benefits": ["Key benefit 1", "Key benefit 2"],
      "implementation_steps": ["High-level step 1", "High-level step 2", "High-level step 3"]
    }
  ]
}

IMPORTANT GUIDELINES:
1. Prioritize by risk (severity + exploitability + business impact)
2. Group related vulnerabilities where appropriate
3. Consider dependencies between remediation items
4. Provide specific, actionable steps with technical details
5. Be realistic about effort estimates
6. Include both technical fixes and process improvements
7. Keep all strings valid JSON-safe text with properly escaped quotes
8. Do not include markdown code fences or commentary outside the JSON object
9. Ensure all arrays and objects are syntactically valid JSON

LONG-TERM GOALS REQUIREMENTS:
- Include 5-8 comprehensive long-term security goals
- Cover different categories: Policy, Process, Technology, Training, Monitoring
- Each goal should have clear implementation steps
- Consider industry best practices (NIST, CIS Controls, ISO 27001)
- Include goals for:
  * Security awareness and training programs
  * Vulnerability management process improvement
  * Security monitoring and incident response
  * Secure development lifecycle (SDL) adoption
  * Third-party risk management
  * Regular security assessments and audits
  * Security metrics and KPIs tracking`;

    // Call DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cybersecurity consultant specializing in remediation planning and security program development. Always respond with valid JSON only, no markdown or explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.35,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let strategyData: RemediationStrategyResponse;
    try {
      strategyData = await parseStrategyResponse(content, deepseekKey);
    } catch (parseError) {


      throw new Error('Failed to parse AI response');
    }

    // Save to database - upsert based on project_id
    const { data: existing } = await supabase
      .from('remediation_strategies')
      .select('id, client_visible')
      .eq('project_id', projectId)
      .maybeSingle();

    let savedStrategy;
    if (existing) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from('remediation_strategies')
        .update({
          executive_summary: strategyData.executive_summary,
          items: strategyData.items || [],
          total_effort: strategyData.total_effort,
          recommended_timeline: strategyData.recommended_timeline,
          quick_wins: strategyData.quick_wins || [],
          long_term_goals: strategyData.long_term_goals || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;
      savedStrategy = updated;
    } else {
      // Insert new
      const { data: inserted, error: insertError } = await supabase
        .from('remediation_strategies')
        .insert({
          project_id: projectId,
          user_id: user.id,
          client_visible: existing?.client_visible ?? false,
          executive_summary: strategyData.executive_summary,
          items: strategyData.items || [],
          total_effort: strategyData.total_effort,
          recommended_timeline: strategyData.recommended_timeline,
          quick_wins: strategyData.quick_wins || [],
          long_term_goals: strategyData.long_term_goals || [],
        })
        .select()
        .single();

      if (insertError) throw insertError;
      savedStrategy = inserted;
    }

    console.log('Remediation strategy generated and saved successfully');

    return new Response(
      JSON.stringify({
        id: savedStrategy.id,
        client_visible: savedStrategy.client_visible,
        executive_summary: strategyData.executive_summary,
        items: strategyData.items || [],
        total_effort: strategyData.total_effort,
        recommended_timeline: strategyData.recommended_timeline,
        quick_wins: strategyData.quick_wins || [],
        long_term_goals: strategyData.long_term_goals || [],
        savedAt: savedStrategy.updated_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating remediation strategy:', error);
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