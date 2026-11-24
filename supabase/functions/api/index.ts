import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_VERSION = 'api@2026-01-13.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
  'Access-Control-Expose-Headers': 'x-function-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AuthResult {
  userId: string;
  tokenId: string;
}

type AuthFailureReason =
  | 'missing_header'
  | 'empty_token'
  | 'not_found'
  | 'disabled'
  | 'expired'
  | 'db_error'
  | 'schema_mismatch';

type AuthCheckResult =
  | { ok: true; auth: AuthResult }
  | { ok: false; reason: AuthFailureReason };

function normalizeApiToken(raw: string): string {
  let token = raw.trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim();
  }
  return token;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function authenticateToken(token: string): Promise<AuthResult | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const normalizedToken = normalizeApiToken(token);
  if (!normalizedToken) return null;
  const hashedToken = await sha256Hex(normalizedToken);


  type TokenRow = {
    id: string;
    user_id: string;
    is_active?: boolean | null;
    expires_at?: string | null;
  };

  const tokenColumnsToTry = ['token_hash', 'token'] as const;
  let row: TokenRow | null = null;
  let matchedLegacyPlaintext = false;

  // Preferred path: hashed token lookup in token_hash
  {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, user_id, is_active, expires_at')
      .eq('token_hash', hashedToken)
      .maybeSingle();

    if (error) {
      const code = (error as { code?: string }).code;
      const message = (error as { message?: string }).message || '';
      if (code !== '42703' && !/column .* does not exist/i.test(message)) {
        console.error('auth: hashed token lookup error', { code, message });
        return null;
      }
    } else if (data) {
      row = data as TokenRow;
    }
  }

  // Legacy fallback path: plaintext token in legacy schemas/data
  if (!row) {
    for (const col of tokenColumnsToTry) {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('id, user_id, is_active, expires_at')
        .eq(col, normalizedToken)
        .maybeSingle();

      if (error) {
        // If the column doesn't exist (schema mismatch), try the other column.
        const code = (error as { code?: string }).code;
        const message = (error as { message?: string }).message || '';
        console.error('auth: token lookup error', { col, code, message });
        if (code === '42703' || /column .* does not exist/i.test(message)) {
          continue;
        }
        return null;
      }

      if (!data) continue;
      row = data as TokenRow;
      matchedLegacyPlaintext = true;
      break;
    }
  }

  if (!row) return null;
  if (row.is_active === false) return null;
  if (row.expires_at) {
    const expiresAt = Date.parse(row.expires_at);
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      return null;
    }
  }

  // Best-effort migration of legacy plaintext token storage to SHA-256
  if (matchedLegacyPlaintext) {
    await supabase
      .from('api_tokens')
      .update({ token_hash: hashedToken })
      .eq('id', row.id);
  }

  // Update last used timestamp
  await supabase
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);

  return { userId: row.user_id, tokenId: row.id };
}

async function authenticateTokenWithReason(token: string): Promise<AuthCheckResult> {
  const normalizedToken = normalizeApiToken(token);
  if (!normalizedToken) return { ok: false, reason: 'empty_token' };
  const hashedToken = await sha256Hex(normalizedToken);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  type TokenRow = {
    id: string;
    user_id: string;
    is_active?: boolean | null;
    expires_at?: string | null;
  };

  const tokenColumnsToTry = ['token_hash', 'token'] as const;
  let row: TokenRow | null = null;
  let matchedLegacyPlaintext = false;
  let sawSchemaMismatch = false;


  // Preferred path: hashed token lookup in token_hash
  {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, user_id, is_active, expires_at')
      .eq('token_hash', hashedToken)
      .maybeSingle();

    if (error) {
      const code = (error as { code?: string }).code;
      const message = (error as { message?: string }).message || '';
      console.error('auth: hashed token lookup error', { code, message });
      if (code === '42703' || /column .* does not exist/i.test(message)) {
        sawSchemaMismatch = true;
      } else {
        return { ok: false, reason: 'db_error' };
      }
    } else if (data) {
      row = data as TokenRow;
    }
  }

  // Legacy fallback path for old plaintext tokens
  if (!row) {
    for (const col of tokenColumnsToTry) {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('id, user_id, is_active, expires_at')
        .eq(col, normalizedToken)
        .maybeSingle();

      if (error) {
        const code = (error as { code?: string }).code;
        const message = (error as { message?: string }).message || '';
        console.error('auth: token lookup error', { col, code, message });
        if (code === '42703' || /column .* does not exist/i.test(message)) {
          sawSchemaMismatch = true;
          continue;
        }
        return { ok: false, reason: 'db_error' };
      }

      if (!data) continue;
      row = data as TokenRow;
      matchedLegacyPlaintext = true;
      break;
    }
  }

  if (!row) {
    return { ok: false, reason: sawSchemaMismatch ? 'schema_mismatch' : 'not_found' };
  }

  if (row.is_active === false) return { ok: false, reason: 'disabled' };
  if (row.expires_at) {
    const expiresAt = Date.parse(row.expires_at);
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      return { ok: false, reason: 'expired' };
    }
  }

  // Best-effort migration of legacy plaintext token storage to SHA-256
  if (matchedLegacyPlaintext) {
    await supabase
      .from('api_tokens')
      .update({ token_hash: hashedToken })
      .eq('id', row.id);
  }

  // Update last used timestamp (best-effort)
  await supabase
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);

  return { ok: true, auth: { userId: row.user_id, tokenId: row.id } };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-function-version': FUNCTION_VERSION },
  });
}

function errorResponse(message: string, status = 400, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'x-function-version': FUNCTION_VERSION,
      ...(extraHeaders || {}),
    },
  });
}

function errorResponseWithDebug(
  message: string,
  status: number,
  debugEnabled: boolean,
  debugReason?: string,
  extraHeaders?: Record<string, string>,
) {
  const body = debugEnabled && debugReason ? { error: message, debug: debugReason } : { error: message };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'x-function-version': FUNCTION_VERSION,
      ...(extraHeaders || {}),
    },
  });
}

const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024; // 10 MB hard limit

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, 'x-function-version': FUNCTION_VERSION } });
  }

  // Enforce a request body size limit to prevent DoS
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES) {
    return errorResponse('Request body too large', 413);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Remove 'api' from path if present
  if (pathParts[0] === 'api') {
    pathParts.shift();
  }

  const token = req.headers.get('x-api-token');
  if (!token || token.length > 512) return errorResponse('An API token is required', 401);
  const authCheck = await authenticateTokenWithReason(token);
  if (!authCheck.ok) return errorResponse('Invalid API token', 401);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { userId } = authCheck.auth;

  // Validate UUID format for resource IDs to prevent injection
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isValidUuid(id: string | undefined): boolean {
    return !id || UUID_RE.test(id);
  }

  async function ownsProject(projectId: unknown) {
    if (typeof projectId !== 'string' || !UUID_RE.test(projectId)) return false;
    const { data, error } = await supabase.from('projects').select('id')
      .eq('id', projectId).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function folderBelongsToProject(folderId: unknown, projectId: string) {
    if (folderId == null || folderId === '') return true;
    if (typeof folderId !== 'string' || !UUID_RE.test(folderId)) return false;
    const { data, error } = await supabase.from('folders').select('id')
      .eq('id', folderId).eq('project_id', projectId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  try {
    const resource = pathParts[0];
    const resourceId = pathParts[1];
    const subResource = pathParts[2];
    const subResourceId = pathParts[3];

    // Reject requests with malformed UUIDs early
    if (!isValidUuid(resourceId) || !isValidUuid(subResourceId)) {
      return errorResponse('Invalid resource ID format', 400);
    }

    // PROJECTS
    if (resource === 'projects') {
      if (req.method === 'GET' && !resourceId) {
        // List all projects
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return jsonResponse({ projects: data });
      }

      if (req.method === 'GET' && resourceId && !subResource) {
        // Get single project
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        return jsonResponse({ project: data });
      }

      if (req.method === 'POST' && !resourceId) {
        // Create project
        const body = await req.json();
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: body.name,
            description: body.description || null,
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ project: data }, 201);
      }

      if (req.method === 'PUT' && resourceId) {
        // Update project
        const body = await req.json();
        const { data, error } = await supabase
          .from('projects')
          .update({
            name: body.name,
            description: body.description,
          })
          .eq('id', resourceId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ project: data });
      }

      if (req.method === 'DELETE' && resourceId) {
        // Delete project
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', resourceId)
          .eq('user_id', userId);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // Project sub-resources: folders
      if (resourceId && subResource === 'folders') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('folders')
            .select('*')
            .eq('project_id', resourceId)
            .eq('user_id', userId)
            .order('name');

          if (error) throw error;
          return jsonResponse({ folders: data });
        }
      }

      // Project sub-resources: files
      if (resourceId && subResource === 'files') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('project_id', resourceId)
            .eq('user_id', userId)
            .order('name');

          if (error) throw error;
          return jsonResponse({ files: data });
        }
      }

      // Project sub-resources: vulnerabilities
      if (resourceId && subResource === 'vulnerabilities') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('vulnerabilities')
            .select('*')
            .eq('project_id', resourceId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ vulnerabilities: data });
        }
      }

      // Project sub-resources: findings (alias for vulnerabilities)
      // tools.pendoc.org expects: POST /projects/:id/findings
      if (resourceId && subResource === 'findings') {
        // Ensure the project belongs to the token owner
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .maybeSingle();

        if (projectError) throw projectError;
        if (!project) {
          return errorResponse('Not found', 404);
        }

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('vulnerabilities')
            .select('*')
            .eq('project_id', resourceId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ findings: data });
        }

        if (req.method === 'POST') {
          const body = await req.json();

          const allowedSeverities = new Set(['critical', 'high', 'medium', 'low', 'info']);
          const requestedSeverity = typeof body.severity === 'string' ? body.severity.toLowerCase() : undefined;
          const severity = requestedSeverity && allowedSeverities.has(requestedSeverity) ? requestedSeverity : 'info';

          const allowedLikelihoods = new Set(['high', 'medium', 'low']);
          const requestedLikelihood = typeof body.likelihood === 'string' ? body.likelihood.toLowerCase() : undefined;
          const likelihood =
            requestedLikelihood && allowedLikelihoods.has(requestedLikelihood) ? requestedLikelihood : 'medium';

          const allowedOwaspCategories = new Set(['web', 'api', 'mobile', 'ai']);
          const requestedOwaspCategory = typeof body.owasp_category === 'string' ? body.owasp_category.toLowerCase() : undefined;
          const owasp_category =
            requestedOwaspCategory && allowedOwaspCategories.has(requestedOwaspCategory)
              ? requestedOwaspCategory
              : null;

          const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Imported finding';
          const description = typeof body.description === 'string' ? body.description : '';

          const remediation =
            typeof body.remediation === 'string'
              ? body.remediation
              : typeof body.recommendation === 'string'
                ? body.recommendation
                : null;

          const detailed_description = typeof body.detailed_description === 'string' ? body.detailed_description : null;
          const execution_command = typeof body.execution_command === 'string' ? body.execution_command : null;
          const owasp_item = typeof body.owasp_item === 'string' ? body.owasp_item : null;

          const cvss_score = typeof body.cvss_score === 'number' ? body.cvss_score : null;
          const tool =
            typeof body.tool === 'string'
              ? body.tool
              : typeof body.finding_type === 'string'
                ? body.finding_type
                : 'external API';

          const { data, error } = await supabase
            .from('vulnerabilities')
            .insert({
              user_id: userId,
              project_id: resourceId,
              title,
              description,
              severity,
              likelihood,
              owasp_category,
              owasp_item,
              cvss_score,
              tool,
              execution_command,
              detailed_description,
              remediation,
            })
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ finding: data }, 201);
        }
      }

      // Project shares
      if (resourceId && subResource === 'shares') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('shares')
            .select('*')
            .eq('resource_type', 'project')
            .eq('resource_id', resourceId)
            .eq('owner_id', userId);

          if (error) throw error;
          return jsonResponse({ shares: data });
        }

        if (req.method === 'POST') {
          const body = await req.json();
          const { data, error } = await supabase
            .from('shares')
            .insert({
              owner_id: userId,
              resource_type: 'project',
              resource_id: resourceId,
              shared_with_email: body.email,
              permission: body.permission || 'read',
            })
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ share: data }, 201);
        }

        if (req.method === 'DELETE' && subResourceId) {
          const { error } = await supabase
            .from('shares')
            .delete()
            .eq('id', subResourceId)
            .eq('owner_id', userId);

          if (error) throw error;
          return jsonResponse({ success: true });
        }
      }
    }

    // FOLDERS
    if (resource === 'folders') {
      if (req.method === 'GET' && resourceId) {
        const { data, error } = await supabase
          .from('folders')
          .select('*')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        return jsonResponse({ folder: data });
      }

      if (req.method === 'POST') {
        const body = await req.json();
        if (!await ownsProject(body.project_id) || !await folderBelongsToProject(body.parent_id, body.project_id)) {
          return errorResponse('Project or parent folder not found', 404);
        }
        const { data, error } = await supabase
          .from('folders')
          .insert({
            user_id: userId,
            project_id: body.project_id,
            parent_id: body.parent_id || null,
            name: body.name,
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ folder: data }, 201);
      }

      if (req.method === 'PUT' && resourceId) {
        const body = await req.json();
        if (body.parent_id !== undefined) {
          const { data: current, error } = await supabase.from('folders').select('project_id')
            .eq('id', resourceId).eq('user_id', userId).maybeSingle();
          if (error) throw error;
          if (!current || !await ownsProject(current.project_id) || !await folderBelongsToProject(body.parent_id, current.project_id)) {
            return errorResponse('Resource or destination folder not found', 404);
          }
        }
        const updateData: Record<string, unknown> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;

        const { data, error } = await supabase
          .from('folders')
          .update(updateData)
          .eq('id', resourceId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ folder: data });
      }

      if (req.method === 'DELETE' && resourceId) {
        const { error } = await supabase
          .from('folders')
          .delete()
          .eq('id', resourceId)
          .eq('user_id', userId);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // Folder files
      if (resourceId && subResource === 'files') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('folder_id', resourceId)
            .eq('user_id', userId)
            .order('name');

          if (error) throw error;
          return jsonResponse({ files: data });
        }
      }
    }

    // FILES
    if (resource === 'files') {
      if (req.method === 'GET' && resourceId) {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        return jsonResponse({ file: data });
      }

      if (req.method === 'POST') {
        const body = await req.json();
        if (!await ownsProject(body.project_id) || !await folderBelongsToProject(body.folder_id, body.project_id)) {
          return errorResponse('Project or folder not found', 404);
        }
        const { data, error } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            project_id: body.project_id,
            folder_id: body.folder_id || null,
            name: body.name,
            file_type: body.file_type || 'note',
            content: body.content || '',
            mime_type: body.mime_type || 'text/plain',
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ file: data }, 201);
      }

      if (req.method === 'PUT' && resourceId) {
        const body = await req.json();
        if (body.folder_id !== undefined) {
          const { data: current, error } = await supabase.from('files').select('project_id')
            .eq('id', resourceId).eq('user_id', userId).maybeSingle();
          if (error) throw error;
          if (!current || !await ownsProject(current.project_id) || !await folderBelongsToProject(body.folder_id, current.project_id)) {
            return errorResponse('Resource or destination folder not found', 404);
          }
        }
        const updateData: Record<string, unknown> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.content !== undefined) updateData.content = body.content;
        if (body.folder_id !== undefined) updateData.folder_id = body.folder_id;

        const { data, error } = await supabase
          .from('files')
          .update(updateData)
          .eq('id', resourceId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ file: data });
      }

      if (req.method === 'DELETE' && resourceId) {
        const { error } = await supabase
          .from('files')
          .delete()
          .eq('id', resourceId)
          .eq('user_id', userId);

        if (error) throw error;
        return jsonResponse({ success: true });
      }
    }

    // REPORTS - Upload Nmap XML
    if (resource === 'reports') {
      if (req.method === 'POST') {
        const body = await req.json();
        
        // Forward to process-nmap function
        const response = await fetch(`${supabaseUrl}/functions/v1/process-nmap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            xmlContent: body.xml_content,
            projectId: body.project_id,
            folderId: body.folder_id || null,
            fileName: body.file_name || 'nmap-report.xml',
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          return errorResponse(result.error || 'Failed to process report', response.status);
        }
        return jsonResponse(result, 201);
      }
    }

    // VULNERABILITIES
    if (resource === 'vulnerabilities') {
      if (req.method === 'GET' && !resourceId) {
        // List all vulnerabilities (with optional project_id filter)
        const projectId = url.searchParams.get('project_id');
        let query = supabase
          .from('vulnerabilities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return jsonResponse({ vulnerabilities: data });
      }

      if (req.method === 'GET' && resourceId && !subResource) {
        // Get single vulnerability with full details
        const { data, error } = await supabase
          .from('vulnerabilities')
          .select('*')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        return jsonResponse({ vulnerability: data });
      }

      if (req.method === 'POST' && !resourceId) {
        // Create vulnerability
        const body = await req.json();
        if (!await ownsProject(body.project_id)) return errorResponse('Project not found', 404);
        const { data, error } = await supabase
          .from('vulnerabilities')
          .insert({
            user_id: userId,
            project_id: body.project_id,
            title: body.title,
            description: body.description || '',
            severity: body.severity || 'medium',
            status: body.status || 'open',
            cvss_score: body.cvss_score || null,
            cvss_vector: body.cvss_vector || null,
            affected_component: body.affected_component || null,
            steps_to_reproduce: body.steps_to_reproduce || null,
            proof_of_concept: body.proof_of_concept || null,
            recommendation: body.recommendation || null,
            references: body.references || null,
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ vulnerability: data }, 201);
      }

      if (req.method === 'PUT' && resourceId) {
        // Update vulnerability
        const body = await req.json();
        const updateData: Record<string, unknown> = {};
        const fields = ['title', 'description', 'severity', 'status', 'cvss_score', 'cvss_vector', 
                       'affected_component', 'steps_to_reproduce', 'proof_of_concept', 
                       'recommendation', 'references'];
        fields.forEach(field => {
          if (body[field] !== undefined) updateData[field] = body[field];
        });

        const { data, error } = await supabase
          .from('vulnerabilities')
          .update(updateData)
          .eq('id', resourceId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ vulnerability: data });
      }

      if (req.method === 'DELETE' && resourceId) {
        // Delete vulnerability
        const { error } = await supabase
          .from('vulnerabilities')
          .delete()
          .eq('id', resourceId)
          .eq('user_id', userId);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // Vulnerability comments
      if (resourceId && subResource === 'comments') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('vulnerability_comments')
            .select('*')
            .eq('vulnerability_id', resourceId)
            .order('created_at');

          if (error) throw error;
          return jsonResponse({ comments: data });
        }

        if (req.method === 'POST') {
          const body = await req.json();
          const { data, error } = await supabase
            .from('vulnerability_comments')
            .insert({
              user_id: userId,
              vulnerability_id: resourceId,
              content: body.content,
              comment_type: body.comment_type || 'general',
              parent_id: body.parent_id || null,
            })
            .select()
            .single();

          if (error) throw error;
          return jsonResponse({ comment: data }, 201);
        }
      }
    }

    // CLIENTS
    if (resource === 'clients') {
      if (req.method === 'GET' && !resourceId) {
        // List all clients
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', userId)
          .order('company_name');

        if (error) throw error;
        return jsonResponse({ clients: data });
      }

      if (req.method === 'GET' && resourceId && !subResource) {
        // Get single client
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', resourceId)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        return jsonResponse({ client: data });
      }

      if (req.method === 'POST' && !resourceId) {
        // Create client
        const body = await req.json();
        const { data, error } = await supabase
          .from('clients')
          .insert({
            user_id: userId,
            company_name: body.company_name,
            company_logo_url: body.company_logo_url || null,
            company_website: body.company_website || null,
            notes: body.notes || null,
            is_active: body.is_active !== false,
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ client: data }, 201);
      }

      if (req.method === 'PUT' && resourceId) {
        // Update client
        const body = await req.json();
        const updateData: Record<string, unknown> = {};
        const fields = ['company_name', 'company_logo_url', 'company_website', 'notes', 'is_active'];
        fields.forEach(field => {
          if (body[field] !== undefined) updateData[field] = body[field];
        });

        const { data, error } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', resourceId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ client: data });
      }

      if (req.method === 'DELETE' && resourceId) {
        // Delete client
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', resourceId)
          .eq('user_id', userId);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // Client projects
      if (resourceId && subResource === 'projects') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('client_id', resourceId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return jsonResponse({ projects: data });
        }
      }

      // Client stats
      if (resourceId && subResource === 'stats') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('client_stats')
            .select('*')
            .eq('client_id', resourceId)
            .single();

          if (error) throw error;
          return jsonResponse({ stats: data });
        }
      }
    }

    // PROFILE
    if (resource === 'profile') {
      if (req.method === 'GET') {
        // Get current user's profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return jsonResponse({ profile: data });
      }

      if (req.method === 'PUT') {
        // Update current user's profile
        const body = await req.json();
        const updateData: Record<string, unknown> = {};
        const fields = ['display_name', 'first_name', 'last_name', 'username', 'language', 'theme'];
        fields.forEach(field => {
          if (body[field] !== undefined) updateData[field] = body[field];
        });

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ profile: data });
      }
    }

    return errorResponse('Not found', 404);
  } catch (error: unknown) {
    console.error('API request failed', { code: (error as { code?: string })?.code });
    return errorResponse('Internal server error', 500);
  }
});
