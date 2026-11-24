import { supabase } from '@/integrations/supabase/client';

export async function sendEventNotification(
  event: { invitationId: string } | { retestFindingId: string },
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body: event });
    return !error && data?.success === true;
  } catch {
    return false;
  }
}
