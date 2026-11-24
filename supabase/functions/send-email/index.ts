import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.2';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (body: object, status = 200) => Response.json(body, { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return reply({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);

  const key = Deno.env.get('RESEND_API_KEY');
  const sender = Deno.env.get('PENDOC_EMAIL_FROM');
  const publicOrigin = Deno.env.get('PENDOC_PUBLIC_ORIGIN');
  if (!key || !sender || !publicOrigin) return reply({ success: false, reason: 'mail_not_configured' });

  try {
    const { invitationId, retestFindingId } = await request.json();
    const database = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let to: string;
    let subject: string;
    let text: string;
    let deliveryId: string;
    if (typeof invitationId === 'string' && uuid.test(invitationId)) {
      const { data: invite } = await database.from('client_access')
        .select('client_email, access_token, expires_at')
        .eq('id', invitationId).eq('owner_id', user.id).eq('is_active', true).maybeSingle();
      if (!invite?.access_token || (invite.expires_at && Date.parse(invite.expires_at) <= Date.now())) {
        return reply({ error: 'Invitation unavailable' }, 404);
      }
      to = invite.client_email;
      subject = 'PenDoc client invitation';
      text = `Open ${new URL('/auth?type=client', publicOrigin)} and use your invited email address with this invitation token: ${invite.access_token}`;
      deliveryId = `invitation/${invitationId}`;
    } else if (typeof retestFindingId === 'string' && uuid.test(retestFindingId)) {
      const { data: finding } = await database.from('vulnerabilities')
        .select('project_id, retest_requested_at')
        .eq('id', retestFindingId).eq('retest_requested_by', user.id)
        .eq('retest_status', 'waiting').maybeSingle();
      if (!finding?.retest_requested_at) return reply({ error: 'Retest unavailable' }, 404);
      const { data: canAccess } = await auth.rpc('is_client_for_project', { p_project_id: finding.project_id });
      if (!canAccess) return reply({ error: 'Retest unavailable' }, 404);
      const { data: project } = await database.from('projects').select('user_id').eq('id', finding.project_id).single();
      if (!project) return reply({ error: 'Retest unavailable' }, 404);
      const { data: { user: owner } } = await database.auth.admin.getUserById(project.user_id);
      if (!owner?.email) return reply({ success: false, reason: 'recipient_unavailable' });
      to = owner.email;
      subject = 'PenDoc retest requested';
      text = `A client requested a retest. Open ${new URL('/dashboard', publicOrigin)} to review the finding.`;
      deliveryId = `retest/${retestFindingId}/${finding.retest_requested_at}`;
    } else {
      return reply({ error: 'An invitation or retest ID is required' }, 400);
    }

    const { data: reserved, error: reservationError } = await database.rpc('reserve_notification_delivery', {
      p_actor: user.id, p_event: deliveryId,
    });
    if (reservationError) return reply({ error: 'Notification could not be queued' }, 502);
    if (!reserved) return reply({ success: false, reason: 'limited_or_duplicate' });

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': deliveryId,
        },
        body: JSON.stringify({ from: sender, to: [to], subject, text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return reply({ success: true });
    } catch {
      // The provider idempotency key makes a timed-out request safe to retry.
    }
    await database.rpc('release_notification_delivery', { p_actor: user.id, p_event: deliveryId });
    return reply({ error: 'Email provider unavailable' }, 502);
  } catch {
    return reply({ error: 'Notification request failed' }, 400);
  }
});
