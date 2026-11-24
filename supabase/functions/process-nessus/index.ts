import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NessusVulnerability {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  synopsis: string;
  solution: string;
  pluginId: string;
  port: string;
  protocol: string;
  serviceName: string;
  hostIp: string;
  hostName: string;
  cvssScore: number | null;
  cvssVector: string | null;
  cveIds: string[];
  cweId: string | null;
  riskFactor: string;
  pluginOutput: string;
  seeAlso: string[];
}

interface ScanInfo {
  policyName: string;
  scannerIp: string;
  startTime: string;
  endTime: string;
}

function extractTagText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(re);
  return match?.[1]?.trim() ?? '';
}

function extractAttribute(xml: string, attr: string): string {
  const re = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = xml.match(re);
  return match?.[1]?.trim() ?? '';
}

function mapNessusSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const s = parseInt(severity, 10);
  if (s === 4) return 'critical';
  if (s === 3) return 'high';
  if (s === 2) return 'medium';
  if (s === 1) return 'low';
  return 'info';
}

function parseNessusXml(xmlContent: string): { scanInfo: ScanInfo; vulnerabilities: NessusVulnerability[] } {
  if (!xmlContent.includes('<NessusClientData_v2')) {
    throw new Error('Invalid Nessus XML format - missing NessusClientData_v2 element');
  }

  // Extract scan info
  const policyName = extractTagText(xmlContent, 'policyName');
  
  const scanInfo: ScanInfo = {
    policyName: policyName || 'Nessus Scan',
    scannerIp: '',
    startTime: '',
    endTime: '',
  };

  console.log('Scan info:', scanInfo);

  const vulnerabilities: NessusVulnerability[] = [];

  // Find all ReportHost blocks
  const hostRegex = /<ReportHost[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/ReportHost>/gi;
  let hostMatch;

  while ((hostMatch = hostRegex.exec(xmlContent)) !== null) {
    const hostName = hostMatch[1];
    const hostContent = hostMatch[2];

    // Extract host IP from HostProperties
    let hostIp = hostName;
    const hostIpMatch = hostContent.match(/<tag name="host-ip">([^<]*)<\/tag>/i);
    if (hostIpMatch) {
      hostIp = hostIpMatch[1].trim();
    }

    // Find all ReportItem blocks within this host
    const itemRegex = /<ReportItem([^>]*)>([\s\S]*?)<\/ReportItem>/gi;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(hostContent)) !== null) {
      const itemAttrs = itemMatch[1];
      const itemContent = itemMatch[2];

      const severity = extractAttribute(itemAttrs, 'severity');
      const pluginId = extractAttribute(itemAttrs, 'pluginID');
      const pluginName = extractAttribute(itemAttrs, 'pluginName');
      const port = extractAttribute(itemAttrs, 'port');
      const protocol = extractAttribute(itemAttrs, 'protocol');
      const svcName = extractAttribute(itemAttrs, 'svc_name');

      // Skip informational items unless they have useful content
      const mappedSeverity = mapNessusSeverity(severity);

      // Extract vulnerability details
      const description = extractTagText(itemContent, 'description');
      const synopsis = extractTagText(itemContent, 'synopsis');
      const solution = extractTagText(itemContent, 'solution');
      const riskFactor = extractTagText(itemContent, 'risk_factor');
      const pluginOutput = extractTagText(itemContent, 'plugin_output');

      // Extract CVSS
      let cvssScore: number | null = null;
      let cvssVector: string | null = null;

      // Try CVSS3 first
      const cvss3Score = extractTagText(itemContent, 'cvss3_base_score');
      const cvss3Vector = extractTagText(itemContent, 'cvss3_vector');
      if (cvss3Score) {
        cvssScore = parseFloat(cvss3Score);
        if (isNaN(cvssScore)) cvssScore = null;
        cvssVector = cvss3Vector || null;
      } else {
        // Fall back to CVSS2
        const cvss2Score = extractTagText(itemContent, 'cvss_base_score');
        const cvss2Vector = extractTagText(itemContent, 'cvss_vector');
        if (cvss2Score) {
          cvssScore = parseFloat(cvss2Score);
          if (isNaN(cvssScore)) cvssScore = null;
          cvssVector = cvss2Vector || null;
        }
      }

      // Extract CVEs
      const cveIds: string[] = [];
      const cveRegex = /<cve>([^<]*)<\/cve>/gi;
      let cveMatch;
      while ((cveMatch = cveRegex.exec(itemContent)) !== null) {
        const cve = cveMatch[1].trim();
        if (cve) cveIds.push(cve);
      }

      // Extract CWE
      let cweId: string | null = null;
      const cweMatch = itemContent.match(/<cwe>([^<]*)<\/cwe>/i);
      if (cweMatch) {
        cweId = `CWE-${cweMatch[1].trim()}`;
      }

      // Extract see_also references
      const seeAlso: string[] = [];
      const seeAlsoRegex = /<see_also>([^<]*)<\/see_also>/gi;
      let seeAlsoMatch;
      while ((seeAlsoMatch = seeAlsoRegex.exec(itemContent)) !== null) {
        const refs = seeAlsoMatch[1].split('\n').map(r => r.trim()).filter(r => r);
        seeAlso.push(...refs);
      }

      const vuln: NessusVulnerability = {
        title: pluginName,
        severity: mappedSeverity,
        description,
        synopsis,
        solution,
        pluginId,
        port,
        protocol,
        serviceName: svcName,
        hostIp,
        hostName,
        cvssScore,
        cvssVector,
        cveIds,
        cweId,
        riskFactor,
        pluginOutput,
        seeAlso,
      };

      if (vuln.title) {
        vulnerabilities.push(vuln);
      }
    }
  }

  console.log(`Parsed ${vulnerabilities.length} vulnerabilities from Nessus report`);
  return { scanInfo, vulnerabilities };
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

    console.log('Processing Nessus report:', fileName);

    // Parse Nessus XML
    const { scanInfo, vulnerabilities } = parseNessusXml(xmlContent);

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

    // Build affected asset string (IP:port or just IP)
    const buildAffectedAsset = (vuln: NessusVulnerability): string => {
      if (vuln.port && vuln.port !== '0') {
        // If protocol is available, include it
        const proto = vuln.protocol ? `/${vuln.protocol}` : '';
        return `${vuln.hostIp}:${vuln.port}${proto}`;
      }
      return vuln.hostIp;
    };

    // Aggregate vulnerabilities by PluginID to avoid duplicates
    const aggregatedVulns = new Map<string, NessusVulnerability & { assets: Set<string>, outputs: Set<string> }>();

    for (const vuln of vulnerabilities) {
      // Create a unique key for the vulnerability type (using PluginID or Title)
      const key = vuln.pluginId || vuln.title;
      
      const asset = buildAffectedAsset(vuln);

      if (aggregatedVulns.has(key)) {
        const existing = aggregatedVulns.get(key)!;
        existing.assets.add(asset);
        if (vuln.pluginOutput) {
          existing.outputs.add(vuln.pluginOutput);
        }
        // Keep the most severe rating if they differ (though usually same for same plugin)
        // ... logic could be added here
      } else {
        aggregatedVulns.set(key, {
          ...vuln,
          assets: new Set([asset]),
          outputs: new Set(vuln.pluginOutput ? [vuln.pluginOutput] : [])
        });
      }
    }

    const uniqueVulnerabilities = Array.from(aggregatedVulns.values());
    console.log(`Aggregated ${vulnerabilities.length} findings into ${uniqueVulnerabilities.length} unique vulnerabilities`);

    const insertData = uniqueVulnerabilities
      .filter((vuln) => {
        // Check if this aggregated vuln already exists in DB
        // Since we aggregated assets, let's create a composite check
        // Ideally we should check if title exists and update it, but for now we follow the insert pattern
        // If exact title exists in DB, we skip to avoid creating duplicate titles.
        // User can manually merge if needed, or we implement complex update logic.
        
        // Simple check: does title exist?
        const titleExists = (existingVulns || []).some(ev => ev.title === vuln.title);
        if (titleExists) {
             console.log(`Skipping existing vulnerability title: ${vuln.title}`);
             return false;
        }
        return true;
      })
      .map((vuln) => {
        // Combine outputs
        let pluginOutputs = '';
        if (vuln.outputs.size > 0) {
           pluginOutputs = Array.from(vuln.outputs).join('\n---\n').slice(0, 5000); // Limit length
        }

        // Build detailed description from Nessus fields
        let detailedDescription = '';
        if (vuln.synopsis) {
          detailedDescription += `**Synopsis:**\n${vuln.synopsis}\n\n`;
        }
        if (pluginOutputs) {
          detailedDescription += `**Plugin Output(s):**\n\`\`\`\n${pluginOutputs}\n\`\`\`\n\n`;
        }
        if (vuln.riskFactor && vuln.riskFactor !== 'None') {
          detailedDescription += `**Risk Factor:** ${vuln.riskFactor}\n\n`;
        }
        detailedDescription += `**Plugin ID:** ${vuln.pluginId}\n`;
        
        return {
          project_id: projectId,
          folder_id: folderId || null,
          title: vuln.title,
          severity: vuln.severity,
          status: 'open' as const,
          description: clampText(vuln.description, 40000),
          detailed_description: clampText(detailedDescription, 60000),
          remediation: clampText(vuln.solution, 40000),
          affected_assets: Array.from(vuln.assets),
          cwe_id: vuln.cweId || null,
          cve_ids: vuln.cveIds.length > 0 ? vuln.cveIds : null,
          cvss_score: vuln.cvssScore,
          cvss_vector: vuln.cvssVector || null,
          reference_urls: vuln.seeAlso.length > 0 ? vuln.seeAlso : null,
          tool: 'Nessus',
          user_id: userId,
        };
      });

    const skippedCount = uniqueVulnerabilities.length - insertData.length;
    console.log(`Skipped ${skippedCount} items (already existed)`);

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
      critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
      high: vulnerabilities.filter((v) => v.severity === 'high').length,
      medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
      low: vulnerabilities.filter((v) => v.severity === 'low').length,
      info: vulnerabilities.filter((v) => v.severity === 'info').length,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${insertedCount} vulnerabilities from Nessus report${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`,
        stats: {
          total: uniqueVulnerabilities.length,
          imported: insertedCount,
          skipped: skippedCount,
          failed: insertData.length - insertedCount,
          severityCounts: {
             critical: uniqueVulnerabilities.filter((v) => v.severity === 'critical').length,
             high: uniqueVulnerabilities.filter((v) => v.severity === 'high').length,
             medium: uniqueVulnerabilities.filter((v) => v.severity === 'medium').length,
             low: uniqueVulnerabilities.filter((v) => v.severity === 'low').length,
             info: uniqueVulnerabilities.filter((v) => v.severity === 'info').length,
          },
          scanInfo: {
            policyName: scanInfo.policyName,
          }
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Nessus report:', error);
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
