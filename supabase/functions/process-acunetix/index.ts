import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcunetixVulnerability {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  remediation: string;
  impact: string;
  details: string;
  affectedUrl: string;
  cweId: string | null;
  cveIds: string[];
  cvssScore: number | null;
  cvssVector: string | null;
  referenceUrls: string[];
  request: string;
}

interface ScanInfo {
  startUrl: string;
  startTime: string;
  finishTime: string;
  scanTime: string;
  webServer: string;
  os: string;
}

function extractCdata(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && '#text' in (value as object)) {
    return String((value as { '#text': unknown })['#text']).trim();
  }
  return String(value).trim();
}

function mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const s = severity.toLowerCase().trim();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return 'info';
}

function extractTagText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const match = xml.match(re);
  return match?.[1]?.trim?.() ?? '';
}

function extractInnerSection(xml: string, tag: string): string | null {
  const lower = xml.toLowerCase();
  const openStart = lower.indexOf(`<${tag.toLowerCase()}`);
  if (openStart === -1) return null;

  const openEnd = lower.indexOf('>', openStart);
  if (openEnd === -1) return null;

  const closeStart = lower.indexOf(`</${tag.toLowerCase()}>`, openEnd);
  if (closeStart === -1) return null;

  return xml.slice(openEnd + 1, closeStart);
}

function parseAcunetixXml(xmlContent: string): { scanInfo: ScanInfo; vulnerabilities: AcunetixVulnerability[] } {
  // IMPORTANT: Acunetix exports can be huge (Crawler/SiteFiles etc.).
  // Parsing the entire XML often exceeds Edge Function CPU limits.
  // We only parse the ReportItems section (plus scan metadata via lightweight tag extraction).

  if (!xmlContent || !xmlContent.includes('<ScanGroup')) {
    throw new Error('Invalid Acunetix XML format - missing ScanGroup element');
  }

  const scanInfo: ScanInfo = {
    startUrl: extractTagText(xmlContent, 'StartURL'),
    startTime: extractTagText(xmlContent, 'StartTime'),
    finishTime: extractTagText(xmlContent, 'FinishTime'),
    scanTime: extractTagText(xmlContent, 'ScanTime'),
    webServer: extractTagText(xmlContent, 'WebServer'),
    os: extractTagText(xmlContent, 'Os'),
  };

  console.log('Scan info:', scanInfo);

  const vulnerabilities: AcunetixVulnerability[] = [];

  const reportItemsInner = extractInnerSection(xmlContent, 'ReportItems');
  if (!reportItemsInner) {
    console.log('No ReportItems found in scan');
    return { scanInfo, vulnerabilities };
  }

  const reportDoc = parse(`<Root>${reportItemsInner}</Root>`) as any;
  const reportItems = reportDoc?.Root?.ReportItem;

  if (!reportItems) {
    console.log('ReportItems section was present but contained no ReportItem nodes');
    return { scanInfo, vulnerabilities };
  }

  const items = Array.isArray(reportItems) ? reportItems : [reportItems];
  console.log(`Found ${items.length} report items`);

  for (const item of items) {
    try {
      // Extract CWE
      let cweId: string | null = null;
      if (item.CWEList?.CWE) {
        const cwes = Array.isArray(item.CWEList.CWE) ? item.CWEList.CWE : [item.CWEList.CWE];
        if (cwes.length > 0) {
          const cweItem = cwes[0];
          cweId = cweItem['@id'] ? `CWE-${cweItem['@id']}` : extractCdata(cweItem);
        }
      }

      // Extract CVEs
      const cveIds: string[] = [];
      if (item.CVEList?.CVE) {
        const cves = Array.isArray(item.CVEList.CVE) ? item.CVEList.CVE : [item.CVEList.CVE];
        for (const cve of cves) {
          const cveId = cve['@id'];
          const cveYear = cve['@year'];
          if (cveId && cveYear) {
            cveIds.push(`CVE-${cveYear}-${cveId}`);
          } else {
            const cveText = extractCdata(cve);
            if (cveText && cveText.startsWith('CVE-')) {
              cveIds.push(cveText);
            }
          }
        }
      }

      // Extract CVSS score and vector (prefer CVSS3)
      let cvssScore: number | null = null;
      let cvssVector: string | null = null;

      if (item.CVSS3?.Score) {
        const scoreStr = extractCdata(item.CVSS3.Score);
        if (scoreStr) {
          cvssScore = parseFloat(scoreStr);
          if (isNaN(cvssScore)) cvssScore = null;
        }
        cvssVector = extractCdata(item.CVSS3.Descriptor) || null;
      } else if (item.CVSS?.Score) {
        const scoreStr = extractCdata(item.CVSS.Score);
        if (scoreStr) {
          cvssScore = parseFloat(scoreStr);
          if (isNaN(cvssScore)) cvssScore = null;
        }
        cvssVector = extractCdata(item.CVSS.Descriptor) || null;
      }

      // Extract references
      const referenceUrls: string[] = [];
      if (item.References?.Reference) {
        const refs = Array.isArray(item.References.Reference) ? item.References.Reference : [item.References.Reference];
        for (const ref of refs) {
          const url = extractCdata(ref.URL);
          if (url) referenceUrls.push(url);
        }
      }

      // Extract request from TechnicalDetails
      const request = extractCdata(item.TechnicalDetails?.Request) || '';

      let affectedUrl = extractCdata(item.Affects) || '';

      // Fix for relative paths (populates full target URL properly)
      if (affectedUrl === '/' || affectedUrl.startsWith('/')) {
        if (scanInfo.startUrl) {
          // Remove trailing slash from base if present
          const baseUrl = scanInfo.startUrl.endsWith('/') ? scanInfo.startUrl.slice(0, -1) : scanInfo.startUrl;
          // Ensure path starts with slash
          const path = affectedUrl.startsWith('/') ? affectedUrl : `/${affectedUrl}`;
          affectedUrl = `${baseUrl}${path}`;
        }
      }

      const vuln: AcunetixVulnerability = {
        title: extractCdata(item.Name),
        severity: mapSeverity(extractCdata(item.Severity)),
        description: extractCdata(item.Description),
        remediation: extractCdata(item.Recommendation),
        impact: extractCdata(item.Impact),
        details: extractCdata(item.Details),
        affectedUrl,
        cweId,
        cveIds,
        cvssScore,
        cvssVector,
        referenceUrls,
        request,
      };

      if (vuln.title) vulnerabilities.push(vuln);
    } catch (err) {
      console.error('Error parsing report item:', err);
    }
  }

  console.log(`Parsed ${vulnerabilities.length} vulnerabilities`);
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

    console.log('Processing Acunetix report:', fileName);

    // Parse Acunetix XML
    const { scanInfo, vulnerabilities } = parseAcunetixXml(xmlContent);

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

    console.log('Preparing insert payload...');

    // Fetch existing vulnerabilities in this project for duplicate detection
    const { data: existingVulns } = await supabase
      .from('vulnerabilities')
      .select('title, affected_assets')
      .eq('project_id', projectId);

    const existingKeys = new Set(
      (existingVulns || []).map(v => `${v.title}|${(v.affected_assets || []).join(',')}`)
    );

    console.log(`Found ${existingKeys.size} existing vulnerabilities for duplicate check`);

    const insertData = vulnerabilities
      .filter((vuln) => {
        const key = `${vuln.title}|${vuln.affectedUrl || ''}`;
        if (existingKeys.has(key)) {
          console.log(`Skipping duplicate: ${vuln.title}`);
          return false;
        }
        return true;
      })
      .map((vuln) => ({
        project_id: projectId,
        folder_id: folderId || null,
        title: vuln.title,
        severity: vuln.severity,
        status: 'open' as const,
        description: clampText(vuln.description, 40000),
        detailed_description: clampText(vuln.details, 60000),
        remediation: clampText(vuln.remediation, 40000),
        affected_assets: vuln.affectedUrl ? [vuln.affectedUrl] : null,
        cwe_id: vuln.cweId || null,
        cve_ids: vuln.cveIds.length > 0 ? vuln.cveIds : null,
        cvss_score: vuln.cvssScore,
        cvss_vector: vuln.cvssVector || null,
        reference_urls: vuln.referenceUrls.length > 0 ? vuln.referenceUrls : null,
        proof_of_concept: clampText(vuln.request, 20000),
        tool: 'Acunetix',
        user_id: userId,
      }));

    const skippedCount = vulnerabilities.length - insertData.length;
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
      critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
      high: vulnerabilities.filter((v) => v.severity === 'high').length,
      medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
      low: vulnerabilities.filter((v) => v.severity === 'low').length,
      info: vulnerabilities.filter((v) => v.severity === 'info').length,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${insertedCount} vulnerabilities from Acunetix report${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`,
        stats: {
          total: vulnerabilities.length,
          imported: insertedCount,
          skipped: skippedCount,
          failed: insertData.length - insertedCount,
          severityCounts,
          scanInfo: {
            target: scanInfo.startUrl,
            scanTime: scanInfo.scanTime,
          }
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Acunetix report:', error);
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
