import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BurpSuiteIssue {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: string;
  host: string;
  path: string;
  description: string;
  remediation: string;
  issueDetail: string;
  cweIds: string[];
  referenceUrls: string[];
  request: string;
  response: string;
}

function extractCdata(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('#text' in obj) {
      return String(obj['#text'] ?? '').trim();
    }
    // Handle nested CDATA or text content
    if ('$' in obj) {
      return String(obj['$'] ?? '').trim();
    }
  }
  try {
    return String(value).trim();
  } catch {
    return '';
  }
}

function mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const s = severity.toLowerCase().trim();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return 'info';
}

function extractCweIds(classifications: string): string[] {
  const cweIds: string[] = [];
  // Parse CWE IDs from vulnerabilityClassifications HTML
  const cweMatches = classifications.matchAll(/CWE-(\d+)/g);
  for (const match of cweMatches) {
    cweIds.push(`CWE-${match[1]}`);
  }
  return [...new Set(cweIds)]; // Remove duplicates
}

function extractReferenceUrls(references: string): string[] {
  const urls: string[] = [];
  // Extract URLs from references HTML
  const urlMatches = references.matchAll(/href="([^"]+)"/g);
  for (const match of urlMatches) {
    urls.push(match[1]);
  }
  return [...new Set(urls)];
}

function stripHtml(html: string): string {
  // Remove HTML tags but preserve text content
  return html
    .replace(/<\/?p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?ul>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '\"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseBurpSuiteXml(xmlContent: string): BurpSuiteIssue[] {
  // Burp XML exports often contain a DTD with ATTLIST/ELEMENT declarations.
  // The Deno XML parser we use does not support these DTD sequences, so we strip them.
  const sanitized = (xmlContent ?? '')
    // Remove DOCTYPE with internal subset: <!DOCTYPE ... [ ... ]>
    .replace(/<!DOCTYPE[\s\S]*?\]>/gi, '')
    // Remove simple DOCTYPE: <!DOCTYPE ...>
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    // Safety: remove any remaining DTD declarations
    .replace(/<!ATTLIST[\s\S]*?>/gi, '')
    .replace(/<!ELEMENT[\s\S]*?>/gi, '');

  if (!sanitized || !sanitized.includes('<issues')) {
    throw new Error('Invalid BurpSuite XML format - missing issues element');
  }

  const doc = parse(sanitized) as any;
  const issues = doc?.issues?.issue;

  if (!issues) {
    console.log('No issues found in BurpSuite report');
    return [];
  }

  const issueList = Array.isArray(issues) ? issues : [issues];
  console.log(`Found ${issueList.length} issues in BurpSuite report`);

  const vulnerabilities: BurpSuiteIssue[] = [];

  for (const issue of issueList) {
    try {
      const title = extractCdata(issue.name);
      const severity = mapSeverity(extractCdata(issue.severity));
      const confidence = extractCdata(issue.confidence);
      
      // Extract host with IP
      let host = '';
      if (typeof issue.host === 'object' && '#text' in issue.host) {
        host = extractCdata(issue.host['#text']);
      } else {
        host = extractCdata(issue.host);
      }
      
      const path = extractCdata(issue.path);
      const issueBackground = extractCdata(issue.issueBackground);
      const remediationBackground = extractCdata(issue.remediationBackground);
      const issueDetail = extractCdata(issue.issueDetail);
      const classifications = extractCdata(issue.vulnerabilityClassifications);
      const references = extractCdata(issue.references);
      
      // Extract CWE IDs from classifications
      const cweIds = extractCweIds(classifications);
      
      // Extract reference URLs
      const referenceUrls = extractReferenceUrls(classifications);
      if (references) {
        referenceUrls.push(...extractReferenceUrls(references));
      }
      
      // Extract request/response
      let request = '';
      let response = '';
      if (issue.requestresponse) {
        const rr = Array.isArray(issue.requestresponse) ? issue.requestresponse[0] : issue.requestresponse;
        if (rr.request) {
          request = extractCdata(rr.request);
          // Handle base64 encoded requests
          if (rr.request['@base64'] === 'true' && request) {
            try {
              request = atob(request);
            } catch {
              // Keep original if decoding fails
            }
          }
        }
        if (rr.response) {
          response = extractCdata(rr.response);
          // Handle base64 encoded responses
          if (rr.response['@base64'] === 'true' && response) {
            try {
              response = atob(response);
            } catch {
              // Keep original if decoding fails
            }
          }
        }
      }
      
      const vuln: BurpSuiteIssue = {
        title,
        severity,
        confidence,
        host,
        path,
        description: stripHtml(issueBackground),
        remediation: stripHtml(remediationBackground),
        issueDetail: stripHtml(issueDetail),
        cweIds,
        referenceUrls: [...new Set(referenceUrls)],
        request,
        response,
      };
      
      if (vuln.title) {
        vulnerabilities.push(vuln);
      }
    } catch (err) {
      console.error('Error parsing BurpSuite issue:', err);
    }
  }

  console.log(`Parsed ${vulnerabilities.length} vulnerabilities from BurpSuite report`);
  return vulnerabilities;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xmlContent, projectId, folderId, fileName } = await req.json();

    if (!xmlContent || !projectId) {
      throw new Error('Missing required parameters');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    console.log('Processing BurpSuite report:', fileName);

    // Parse BurpSuite XML
    const issues = parseBurpSuiteXml(xmlContent);

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    const userId = user.id;

    // Verify project ownership
    const { data: ownedProject, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (projectError) {
      throw new Error(`Project lookup failed: ${projectError.message}`);
    }
    if (!ownedProject) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: project access denied' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User ID:', userId);

    const clampText = (value: string | null | undefined, max = 20000) => {
      const v = (value ?? '').trim();
      if (!v) return null;
      if (v.length <= max) return v;
      return `${v.slice(0, max)}\n\n...[truncated]`;
    };

    // Fetch existing vulnerabilities in this project for duplicate detection
    const { data: existingVulns } = await supabase
      .from('vulnerabilities')
      .select('title, affected_assets')
      .eq('project_id', projectId);

    const existingKeys = new Set(
      (existingVulns || []).map(v => `${v.title}|${(v.affected_assets || []).join(',')}`)
    );

    console.log(`Found ${existingKeys.size} existing vulnerabilities for duplicate check`);

    const insertData = issues
      .filter((issue) => {
        const affectedUrl = `${issue.host}${issue.path}`;
        const key = `${issue.title}|${affectedUrl}`;
        if (existingKeys.has(key)) {
          console.log(`Skipping duplicate: ${issue.title}`);
          return false;
        }
        return true;
      })
      .map((issue) => {
        const affectedUrl = `${issue.host}${issue.path}`;
        
        // Build detailed description
        let detailedDesc = '';
        if (issue.issueDetail) {
          detailedDesc += `**Issue Detail:**\n${issue.issueDetail}\n\n`;
        }
        if (issue.confidence) {
          detailedDesc += `**Confidence:** ${issue.confidence}\n\n`;
        }
        if (issue.response) {
          detailedDesc += `**Response (excerpt):**\n\`\`\`\n${issue.response.slice(0, 2000)}\n\`\`\``;
        }
        
        return {
          project_id: projectId,
          folder_id: folderId || null,
          title: issue.title,
          severity: issue.severity,
          status: 'open' as const,
          description: clampText(issue.description, 40000),
          detailed_description: clampText(detailedDesc, 60000),
          remediation: clampText(issue.remediation, 40000),
          affected_assets: [affectedUrl],
          cwe_id: issue.cweIds.length > 0 ? issue.cweIds[0] : null,
          reference_urls: issue.referenceUrls.length > 0 ? issue.referenceUrls : null,
          proof_of_concept: clampText(issue.request, 20000),
          tool: 'BurpSuite',
          user_id: userId,
        };
      });

    const skippedCount = issues.length - insertData.length;
    console.log(`Skipped ${skippedCount} duplicates`);

    let insertedCount = 0;
    const errors: string[] = [];

    // Insert in chunks to avoid large payloads/timeouts
    const CHUNK_SIZE = 10;
    console.log(`Inserting ${insertData.length} vulnerabilities in chunks of ${CHUNK_SIZE}`);

    for (let i = 0; i < insertData.length; i += CHUNK_SIZE) {
      const chunk = insertData.slice(i, i + CHUNK_SIZE);
      console.log(`Inserting chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${i + 1}-${i + chunk.length})`);

      const { error: chunkError } = await supabase
        .from('vulnerabilities')
        .insert(chunk);

      if (chunkError) {
        console.error('Chunk insert error:', chunkError);
        errors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed: ${chunkError.message}`);
      } else {
        insertedCount += chunk.length;
      }
    }

    console.log(`Successfully inserted ${insertedCount} vulnerabilities`);

    const severityCounts = {
      critical: issues.filter((v) => v.severity === 'critical').length,
      high: issues.filter((v) => v.severity === 'high').length,
      medium: issues.filter((v) => v.severity === 'medium').length,
      low: issues.filter((v) => v.severity === 'low').length,
      info: issues.filter((v) => v.severity === 'info').length,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${insertedCount} vulnerabilities from BurpSuite report${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`,
        stats: {
          total: issues.length,
          imported: insertedCount,
          skipped: skippedCount,
          failed: insertData.length - insertedCount,
          severityCounts,
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error processing BurpSuite report:', errorMessage);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error('Error processing BurpSuite report:', String(error));
    }
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
