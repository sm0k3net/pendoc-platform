import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as zip from 'https://deno.land/x/zipjs@v2.7.32/index.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  children: FolderNode[];
}

interface Vulnerability {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  likelihood: string;
  owasp_category: string | null;
  owasp_item: string | null;
  cvss_score: number | null;
  tool: string | null;
  execution_command: string | null;
  detailed_description: string | null;
  remediation: string | null;
  created_at: string;
  updated_at: string;
}

function buildFolderTree(folders: { id: string; name: string; parent_id: string | null }[]): Map<string, string> {
  const folderPaths = new Map<string, string>();
  const folderMap = new Map<string, FolderNode>();
  
  folders.forEach(f => {
    folderMap.set(f.id, { ...f, children: [] });
  });

  folders.forEach(f => {
    if (f.parent_id && folderMap.has(f.parent_id)) {
      folderMap.get(f.parent_id)!.children.push(folderMap.get(f.id)!);
    }
  });

  function calculatePath(folderId: string): string {
    const folder = folderMap.get(folderId);
    if (!folder) return '';
    
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      return `${calculatePath(folder.parent_id)}/${folder.name}`;
    }
    return folder.name;
  }

  folders.forEach(f => {
    folderPaths.set(f.id, calculatePath(f.id));
  });

  return folderPaths;
}

function generateVulnerabilityXml(vulnerabilities: Vulnerability[], projectName: string): string {
  const escapeXml = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<vulnerability_database project="${escapeXml(projectName)}" exported_at="${new Date().toISOString()}">\n`;
  xml += `  <vulnerabilities count="${vulnerabilities.length}">\n`;

  for (const vuln of vulnerabilities) {
    xml += `    <vulnerability id="${escapeXml(vuln.id)}">\n`;
    xml += `      <title>${escapeXml(vuln.title)}</title>\n`;
    xml += `      <description>${escapeXml(vuln.description)}</description>\n`;
    xml += `      <severity>${escapeXml(vuln.severity)}</severity>\n`;
    xml += `      <likelihood>${escapeXml(vuln.likelihood)}</likelihood>\n`;
    xml += `      <owasp_category>${escapeXml(vuln.owasp_category)}</owasp_category>\n`;
    xml += `      <owasp_item>${escapeXml(vuln.owasp_item)}</owasp_item>\n`;
    xml += `      <cvss_score>${vuln.cvss_score ?? ''}</cvss_score>\n`;
    xml += `      <tool>${escapeXml(vuln.tool)}</tool>\n`;
    xml += `      <execution_command><![CDATA[${vuln.execution_command || ''}]]></execution_command>\n`;
    xml += `      <detailed_description><![CDATA[${vuln.detailed_description || ''}]]></detailed_description>\n`;
    xml += `      <remediation><![CDATA[${vuln.remediation || ''}]]></remediation>\n`;
    xml += `      <created_at>${vuln.created_at}</created_at>\n`;
    xml += `      <updated_at>${vuln.updated_at}</updated_at>\n`;
    xml += `    </vulnerability>\n`;
  }

  xml += `  </vulnerabilities>\n`;
  xml += `</vulnerability_database>`;

  return xml;
}

function generateVulnerabilityHtml(vulnerabilities: Vulnerability[], projectName: string): string {
  const escapeHtml = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      critical: '#dc2626',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6',
      info: '#6b7280',
    };
    return colors[severity] || colors.info;
  };

  const getSeverityBg = (severity: string): string => {
    const colors: Record<string, string> = {
      critical: '#fef2f2',
      high: '#fff7ed',
      medium: '#fefce8',
      low: '#eff6ff',
      info: '#f9fafb',
    };
    return colors[severity] || colors.info;
  };

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vulnerability Report - ${escapeHtml(projectName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0f172a; color: #e2e8f0; line-height: 1.6; padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #10b981; margin-bottom: 0.5rem; font-size: 2rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .stat { background: #1e293b; padding: 1rem 1.5rem; border-radius: 8px; border: 1px solid #334155; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { color: #64748b; font-size: 0.875rem; }
    .vuln-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; margin-bottom: 1.5rem; overflow: hidden; }
    .vuln-header { padding: 1rem 1.5rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .vuln-title { font-size: 1.125rem; font-weight: 600; }
    .severity-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .vuln-meta { display: flex; gap: 1rem; flex-wrap: wrap; padding: 0.75rem 1.5rem; background: #0f172a; font-size: 0.875rem; }
    .meta-item { color: #94a3b8; }
    .meta-item strong { color: #cbd5e1; }
    .vuln-body { padding: 1.5rem; }
    .section { margin-bottom: 1.5rem; }
    .section:last-child { margin-bottom: 0; }
    .section-title { font-size: 0.875rem; color: #10b981; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .section-content { color: #cbd5e1; white-space: pre-wrap; }
    .code-block { background: #0f172a; padding: 1rem; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.875rem; overflow-x: auto; }
    .toc { background: #1e293b; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid #334155; }
    .toc-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: #10b981; }
    .toc-list { list-style: none; }
    .toc-item { padding: 0.5rem 0; border-bottom: 1px solid #334155; }
    .toc-item:last-child { border-bottom: none; }
    .toc-link { color: #94a3b8; text-decoration: none; display: flex; justify-content: space-between; align-items: center; }
    .toc-link:hover { color: #e2e8f0; }
    @media print { body { background: white; color: black; } .vuln-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 Vulnerability Report</h1>
    <p class="subtitle">Project: ${escapeHtml(projectName)} | Exported: ${new Date().toLocaleString()}</p>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${vulnerabilities.length}</div>
        <div class="stat-label">Total Vulnerabilities</div>
      </div>
      <div class="stat" style="border-left: 3px solid #dc2626;">
        <div class="stat-value">${vulnerabilities.filter(v => v.severity === 'critical').length}</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat" style="border-left: 3px solid #f97316;">
        <div class="stat-value">${vulnerabilities.filter(v => v.severity === 'high').length}</div>
        <div class="stat-label">High</div>
      </div>
      <div class="stat" style="border-left: 3px solid #eab308;">
        <div class="stat-value">${vulnerabilities.filter(v => v.severity === 'medium').length}</div>
        <div class="stat-label">Medium</div>
      </div>
      <div class="stat" style="border-left: 3px solid #3b82f6;">
        <div class="stat-value">${vulnerabilities.filter(v => v.severity === 'low').length}</div>
        <div class="stat-label">Low</div>
      </div>
    </div>

    <div class="toc">
      <div class="toc-title">Table of Contents</div>
      <ul class="toc-list">
        ${vulnerabilities.map((v, i) => `
          <li class="toc-item">
            <a href="#vuln-${i}" class="toc-link">
              <span>${i + 1}. ${escapeHtml(v.title)}</span>
              <span class="severity-badge" style="background: ${getSeverityBg(v.severity)}; color: ${getSeverityColor(v.severity)};">${v.severity}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
`;

  vulnerabilities.forEach((vuln, index) => {
    html += `
    <div class="vuln-card" id="vuln-${index}">
      <div class="vuln-header">
        <span class="vuln-title">${index + 1}. ${escapeHtml(vuln.title)}</span>
        <span class="severity-badge" style="background: ${getSeverityBg(vuln.severity)}; color: ${getSeverityColor(vuln.severity)};">${vuln.severity}</span>
      </div>
      <div class="vuln-meta">
        <span class="meta-item"><strong>Likelihood:</strong> ${vuln.likelihood}</span>
        ${vuln.cvss_score ? `<span class="meta-item"><strong>CVSS:</strong> ${vuln.cvss_score}</span>` : ''}
        ${vuln.owasp_category ? `<span class="meta-item"><strong>OWASP:</strong> ${vuln.owasp_category}${vuln.owasp_item ? ` - ${vuln.owasp_item}` : ''}</span>` : ''}
        ${vuln.tool ? `<span class="meta-item"><strong>Tool:</strong> ${escapeHtml(vuln.tool)}</span>` : ''}
      </div>
      <div class="vuln-body">
        ${vuln.description ? `
        <div class="section">
          <div class="section-title">Description</div>
          <div class="section-content">${escapeHtml(vuln.description)}</div>
        </div>
        ` : ''}
        
        ${vuln.detailed_description ? `
        <div class="section">
          <div class="section-title">Detailed Description</div>
          <div class="section-content">${vuln.detailed_description}</div>
        </div>
        ` : ''}
        
        ${vuln.execution_command ? `
        <div class="section">
          <div class="section-title">Execution Command</div>
          <div class="code-block">${escapeHtml(vuln.execution_command)}</div>
        </div>
        ` : ''}
        
        ${vuln.remediation ? `
        <div class="section">
          <div class="section-title">Remediation</div>
          <div class="section-content">${escapeHtml(vuln.remediation)}</div>
        </div>
        ` : ''}
      </div>
    </div>
`;
  });

  html += `
  </div>
</body>
</html>`;

  return html;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Use anon key client with user's token to validate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for database operations
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { projectId, password, includeVulnXml = true, includeVulnHtml = true } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Exporting project ${projectId} for user ${user.id}`);

    // Fetch project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pageSize = 500;
    async function projectRows(table: string, fields: string) {
      const rows: Record<string, any>[] = [];
      for (let start = 0; ; start += pageSize) {
        const { data, error } = await supabaseClient.from(table).select(fields)
          .eq('project_id', projectId).eq('user_id', user.id).order('id')
          .range(start, start + pageSize - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as Record<string, any>[]));
        if (!data || data.length < pageSize) return rows;
      }
    }

    const [folders, files, projectVulnerabilities] = await Promise.all([
      projectRows('folders', 'id, name, parent_id'),
      projectRows('files', '*'),
      projectRows('vulnerabilities', '*'),
    ]);
    const vulnerabilities = projectVulnerabilities as Vulnerability[];

    console.log(`Found ${folders?.length || 0} folders, ${files?.length || 0} files, ${vulnerabilities?.length || 0} vulnerabilities`);

    // Build folder path map
    const folderPaths = buildFolderTree(folders as Array<{ id: string; name: string; parent_id: string | null }>);

    // Create zip
    const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'), {
      password: password || undefined,
    });

    // Add project metadata
    const projectMeta = {
      name: project.name,
      description: project.description,
      environment: project.environment,
      model_external: project.model_external,
      model_internal: project.model_internal,
      rules_of_engagement: project.rules_of_engagement,
      scope: project.scope,
      start_date: project.start_date,
      end_date: project.end_date,
      created_at: project.created_at,
      updated_at: project.updated_at,
      exported_at: new Date().toISOString(),
      statistics: {
        folders: folders?.length || 0,
        files: files?.length || 0,
        vulnerabilities: vulnerabilities?.length || 0,
      },
    };
    
    await zipWriter.add(
      'project.json',
      new zip.TextReader(JSON.stringify(projectMeta, null, 2))
    );

    // Add files
    const leafName = (value: string) => value.replace(/[\\/\u0000-\u001f]/g, '_').replace(/^\.+$/, '_') || 'untitled';
    const archiveNames = new Set<string>();
    let binaryBytes = 0;
    for (const file of files) {
      const directory = file.folder_id ? folderPaths.get(file.folder_id) : undefined;
      const folder = directory?.split('/').filter(Boolean).map(leafName).join('/');
      const base = folder ? `files/${folder}/` : 'files/';
      let filePath = base + leafName(file.name);
      if (archiveNames.has(filePath)) filePath = base + file.id + '_' + leafName(file.name);
      archiveNames.add(filePath);

      if (file.storage_path) {
        if (!file.storage_path.startsWith(`${user.id}/${projectId}/`)) {
          return Response.json({ error: 'A storage attachment is outside the project path' }, { status: 409, headers: corsHeaders });
        }
        const { data: attachment, error } = await userClient.storage.from('files').download(file.storage_path);
        if (error || !attachment) {
          return Response.json({ error: 'A project attachment could not be exported' }, { status: 409, headers: corsHeaders });
        }
        binaryBytes += attachment.size;
        if (binaryBytes > 64 * 1024 * 1024) {
          return Response.json({ error: 'Project attachments exceed the synchronous export limit' }, { status: 413, headers: corsHeaders });
        }
        await zipWriter.add(filePath, new zip.BlobReader(attachment));
      } else {
        await zipWriter.add(filePath, new zip.TextReader(file.content ?? ''));
      }
    }

    // Add vulnerability database
    if (vulnerabilities && vulnerabilities.length > 0) {
      // Add JSON format (always included)
      await zipWriter.add(
        'vulnerabilities/vulnerabilities.json',
        new zip.TextReader(JSON.stringify(vulnerabilities, null, 2))
      );

      // Add XML format
      if (includeVulnXml) {
        const xmlContent = generateVulnerabilityXml(vulnerabilities, project.name);
        await zipWriter.add(
          'vulnerabilities/vulnerabilities.xml',
          new zip.TextReader(xmlContent)
        );
      }

      // Add HTML format
      if (includeVulnHtml) {
        const htmlContent = generateVulnerabilityHtml(vulnerabilities, project.name);
        await zipWriter.add(
          'vulnerabilities/vulnerabilities.html',
          new zip.TextReader(htmlContent)
        );
      }
    }

    // Close and get blob
    const zipBlob = await zipWriter.close();
    const arrayBuffer = await zipBlob.arrayBuffer();

    console.log(`Export complete. ZIP size: ${arrayBuffer.byteLength} bytes`);

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_export.zip"`,
      },
    });
  } catch (error: unknown) {
    console.error('Export error:', error);
    const message = error instanceof Error ? error.message : 'Export failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
