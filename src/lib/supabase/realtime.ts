import "server-only";
import { getAdminClient } from "./admin";

/**
 * Publish a broadcast event to a Realtime channel from the server.
 * supabase-js sends it over the Realtime HTTP broadcast endpoint when the
 * channel is not subscribed, so this is safe to call from API routes.
 */
export async function broadcast(
  topic: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = getAdminClient();
  const channel = supabase.channel(topic);
  try {
    await channel.send({ type: "broadcast", event, payload });
  } finally {
    await supabase.removeChannel(channel);
  }
}
