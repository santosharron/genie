// Server-side client for the dropstone-server /api/chat endpoint.
// Mirrors chat.dropstone.io's lib/dropstone-client.ts but trimmed to a single
// non-streaming call: we send messages, read the SSE stream, and concatenate the
// content deltas into one string. The JWT is read from the environment by the
// caller (a Next.js route handler) so it never reaches the browser.

export interface Msg {
  role: "system" | "user" | "assistant";
  content: string;
}

const BASE = process.env.DROPSTONE_SERVER_URL || "http://localhost:3000";

/** Credential for dropstone-server: API key (production, api.dropstone.io) or a
 *  local JWT for dev. Sent as a Bearer token either way. A placeholder API key
 *  falls back to the JWT so local dev keeps working. */
export function dropstoneKey(): string {
  const apiKey = process.env.DROPSTONE_API_KEY;
  if (apiKey && !apiKey.startsWith("paste-")) return apiKey;
  return process.env.DROPSTONE_JWT || "";
}

/** Send messages to dropstone-server and return the full assistant text.
 *  A `dsk_` API key uses the public OpenAI-compatible endpoint
 *  (/api/v1/chat/completions); a JWT uses the in-app /api/chat. Both stream SSE
 *  with `choices[0].delta.content`. */
export async function completeChat(jwt: string, model: string, messages: Msg[]): Promise<string> {
  const endpoint = jwt.startsWith("dsk_") ? "/api/v1/chat/completions" : "/api/chat";
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, stream: true, messages }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`dropstone-server ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const delta =
          j?.choices?.[0]?.delta?.content ??
          j?.delta?.text ??
          j?.content ??
          "";
        if (typeof delta === "string") out += delta;
      } catch {
        // ignore non-JSON keepalives
      }
    }
  }
  return out;
}
