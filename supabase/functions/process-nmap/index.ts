import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NmapHost {
  address: string;
  hostname?: string;
  ports: Array<{
    portid: string;
    protocol: string;
    state: string;
    service?: string;
    version?: string;
  }>;
  os?: string;
}

interface ScanInfo {
  scanner: string;
  version: string;
  args: string;
  startTime: string;
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

    console.log('Processing Nmap report:', fileName);

    // Parse XML content using deno xml parser
    const xmlDoc = parse(xmlContent) as any;
    
    if (!xmlDoc || !xmlDoc.nmaprun) {
      console.error('Failed to parse XML or missing nmaprun element');
      throw new Error('Invalid Nmap XML format');
    }

    const nmaprun = xmlDoc.nmaprun;
    
    // Extract scan information from attributes
    const scanInfo: ScanInfo = {
      scanner: nmaprun['@scanner'] || 'nmap',
      version: nmaprun['@version'] || 'unknown',
      args: nmaprun['@args'] || '',
      startTime: nmaprun['@startstr'] || '',
    };

    console.log('Scan info:', scanInfo);

    // Extract hosts
    const hosts: NmapHost[] = [];
    
    // Handle both single host and array of hosts
    const hostElements = nmaprun.host ? (Array.isArray(nmaprun.host) ? nmaprun.host : [nmaprun.host]) : [];
    
    console.log('Found hosts:', hostElements.length);

    for (const hostEl of hostElements) {
      // Get address - handle both single and array
      const addresses = hostEl.address ? (Array.isArray(hostEl.address) ? hostEl.address : [hostEl.address]) : [];
      const ipv4Address = addresses.find((addr: any) => addr['@addrtype'] === 'ipv4');
      
      if (!ipv4Address) continue;

      // Get hostname
      let hostname: string | undefined;
      if (hostEl.hostnames?.hostname) {
        const hostnames = Array.isArray(hostEl.hostnames.hostname) 
          ? hostEl.hostnames.hostname 
          : [hostEl.hostnames.hostname];
        const userHostname = hostnames.find((h: any) => h['@type'] === 'user');
        hostname = userHostname?.['@name'] || hostnames[0]?.['@name'];
      }

      // Get OS
      let os: string | undefined;
      if (hostEl.os?.osmatch) {
        const osmatches = Array.isArray(hostEl.os.osmatch) 
          ? hostEl.os.osmatch 
          : [hostEl.os.osmatch];
        os = osmatches[0]?.['@name'];
      }

      // Get ports
      const ports: NmapHost['ports'] = [];
      if (hostEl.ports?.port) {
        const portElements = Array.isArray(hostEl.ports.port) 
          ? hostEl.ports.port 
          : [hostEl.ports.port];
        
        for (const portEl of portElements) {
          const state = portEl.state?.['@state'];
          
          // Include open and filtered ports
          if (state === 'open' || state === 'filtered') {
            const service = portEl.service;
            let version = '';
            if (service?.['@product']) {
              version = service['@product'];
              if (service['@version']) {
                version += ' ' + service['@version'];
              }
            }

            ports.push({
              portid: portEl['@portid'] || '',
              protocol: portEl['@protocol'] || '',
              state: state,
              service: service?.['@name'] || '',
              version: version.trim(),
            });
          }
        }
      }

      hosts.push({
        address: ipv4Address['@addr'],
        hostname,
        ports,
        os,
      });
    }

    console.log('Processed hosts:', hosts.length);

    // Generate professional HTML report
    const htmlReport = generateHtmlReport(scanInfo, hosts, fileName);

    // Create Supabase client with service role for file insertion
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
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

    // Create file in database
    const reportName = fileName.replace('.xml', '_report.html');
    const insertData: any = {
      name: reportName,
      content: htmlReport,
      project_id: projectId,
      folder_id: folderId,
      file_type: 'report',
      mime_type: 'text/html',
      user_id: userId,
    };
    
    const { error: insertError } = await supabase
      .from('files')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting file:', insertError);
      throw insertError;
    }

    console.log('Report generated successfully:', reportName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Report processed successfully',
        fileName: reportName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Nmap report:', error);
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

function generateHtmlReport(scanInfo: ScanInfo, hosts: NmapHost[], fileName: string): string {
  const totalHosts = hosts.length;
  const totalOpenPorts = hosts.reduce((sum, host) => sum + host.ports.filter(p => p.state === 'open').length, 0);
  const totalFilteredPorts = hosts.reduce((sum, host) => sum + host.ports.filter(p => p.state === 'filtered').length, 0);
  const uniqueServices = new Set(hosts.flatMap(h => h.ports.map(p => p.service).filter(Boolean)));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nmap Scan Report - ${escapeHtml(fileName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      padding: 2rem;
      line-height: 1.6;
      color: #e4e4e7;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #1e1e2e;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      overflow: hidden;
      border: 1px solid #2d2d3d;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .header p { opacity: 0.9; font-size: 1.1rem; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
      background: #252535;
    }
    .summary-card {
      background: #1e1e2e;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #10b981;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .summary-card h3 {
      color: #10b981;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }
    .summary-card .value { font-size: 2rem; font-weight: bold; color: #e4e4e7; }
    .content { padding: 2rem; }
    .scan-info {
      background: #252535;
      border-left: 4px solid #06b6d4;
      padding: 1rem;
      margin-bottom: 2rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }
    .scan-info strong { color: #06b6d4; }
    .scan-info code {
      background: #1e1e2e;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
      margin-top: 0.5rem;
      word-break: break-all;
    }
    .host {
      background: #252535;
      border: 1px solid #2d2d3d;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .host-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #2d2d3d;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .host-header h2 { color: #10b981; font-size: 1.5rem; font-family: 'Courier New', monospace; }
    .host-header .badge {
      background: #10b981;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: bold;
    }
    .host-header .badge.filtered { background: #f59e0b; }
    .host-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .host-info-item { display: flex; flex-direction: column; }
    .host-info-item label {
      font-size: 0.85rem;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }
    .host-info-item span { color: #e4e4e7; font-weight: 500; }
    .ports-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      background: #1e1e2e;
      border-radius: 8px;
      overflow: hidden;
    }
    .ports-table thead { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
    .ports-table th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }
    .ports-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #2d2d3d; }
    .ports-table tbody tr:hover { background: #252535; }
    .port-number { font-weight: bold; color: #10b981; font-family: 'Courier New', monospace; }
    .state-open { color: #10b981; font-weight: 600; }
    .state-filtered { color: #f59e0b; font-weight: 600; }
    .service {
      display: inline-block;
      background: #06b6d4;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .no-ports { text-align: center; padding: 2rem; color: #71717a; font-style: italic; }
    .footer {
      background: #252535;
      padding: 1.5rem;
      text-align: center;
      color: #71717a;
      border-top: 1px solid #2d2d3d;
    }
    @media print {
      body { background: white; padding: 0; color: #333; }
      .container { box-shadow: none; border: none; }
      .host { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Nmap Scan Report</h1>
      <p>${escapeHtml(fileName)}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Hosts</h3>
        <div class="value">${totalHosts}</div>
      </div>
      <div class="summary-card">
        <h3>Open Ports</h3>
        <div class="value">${totalOpenPorts}</div>
      </div>
      <div class="summary-card">
        <h3>Filtered Ports</h3>
        <div class="value">${totalFilteredPorts}</div>
      </div>
      <div class="summary-card">
        <h3>Unique Services</h3>
        <div class="value">${uniqueServices.size}</div>
      </div>
    </div>

    <div class="content">
      <div class="scan-info">
        <p><strong>Scanner:</strong> ${escapeHtml(scanInfo.scanner)} ${escapeHtml(scanInfo.version)}</p>
        <p><strong>Command:</strong> <code>${escapeHtml(scanInfo.args)}</code></p>
        <p><strong>Scan Time:</strong> ${escapeHtml(scanInfo.startTime)}</p>
      </div>

      ${hosts.map(host => {
        const openCount = host.ports.filter(p => p.state === 'open').length;
        const filteredCount = host.ports.filter(p => p.state === 'filtered').length;
        return `
        <div class="host">
          <div class="host-header">
            <h2>${escapeHtml(host.address)}</h2>
            <div>
              ${openCount > 0 ? `<span class="badge">${openCount} Open</span>` : ''}
              ${filteredCount > 0 ? `<span class="badge filtered">${filteredCount} Filtered</span>` : ''}
            </div>
          </div>
          
          <div class="host-info">
            ${host.hostname ? `
              <div class="host-info-item">
                <label>Hostname</label>
                <span>${escapeHtml(host.hostname)}</span>
              </div>
            ` : ''}
            ${host.os ? `
              <div class="host-info-item">
                <label>Operating System</label>
                <span>${escapeHtml(host.os)}</span>
              </div>
            ` : ''}
          </div>

          ${host.ports.length > 0 ? `
            <table class="ports-table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Protocol</th>
                  <th>State</th>
                  <th>Service</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                ${host.ports.map(port => `
                  <tr>
                    <td class="port-number">${escapeHtml(port.portid)}</td>
                    <td>${escapeHtml(port.protocol)}</td>
                    <td class="${port.state === 'open' ? 'state-open' : 'state-filtered'}">${escapeHtml(port.state)}</td>
                    <td>${port.service ? `<span class="service">${escapeHtml(port.service)}</span>` : '-'}</td>
                    <td>${port.version ? escapeHtml(port.version) : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-ports">No ports detected</div>'}
        </div>
      `}).join('')}
    </div>

    <div class="footer">
      <p>Report generated by PenDoc • ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
