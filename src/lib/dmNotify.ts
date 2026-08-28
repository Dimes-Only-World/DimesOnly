import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

/**
 * Fire-and-forget "New Message" notification for the recipient of a DM.
 * Never throws — a failed notification must not break message sending.
 */
export const notifyNewDirectMessage = async (
  senderId: string,
  recipientId: string,
  preview?: string,
): Promise<void> => {
  if (!senderId || !recipientId || senderId === recipientId) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    await fetch(`${SUPABASE_URL}/functions/v1/notify-direct-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        sender_id: senderId,
        recipient_id: recipientId,
        preview: preview ?? "",
      }),
    });
  } catch (error) {
    console.warn("Failed to send new-message notification", error);
  }
};
