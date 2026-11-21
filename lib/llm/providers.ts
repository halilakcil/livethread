import type { LlmProvider } from "./config";

/** Thin fetch-based adapters for each LLM provider (server-side only). */

export class LlmError extends Error {
  status: number;
  rateLimited: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.name = "LlmError";
    this.status = status;
    this.rateLimited = status === 429;
  }
}

interface CompleteArgs {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  system: string;
  user: string;
}

async function readError(res: Response, provider: string): Promise<LlmError> {
  let msg = `${provider} request failed (HTTP ${res.status})`;
  try {
    const j = await res.json();
    msg = j?.error?.message || j?.message || msg;
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) msg = `${provider}: invalid API key or no access to this model. ${msg}`;
  return new LlmError(msg, res.status);
}

export async function complete({ provider, apiKey, model, system, user }: CompleteArgs): Promise<string> {
  switch (provider) {
    case "openai": {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw await readError(res, "OpenAI");
      const j = await res.json();
      return j.choices?.[0]?.message?.content ?? "";
    }
    case "anthropic": {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 3500,
          temperature: 0.8,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw await readError(res, "Anthropic");
      const j = await res.json();
      return (j.content ?? [])
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("");
    }
    case "gemini": {
      let activeModel = (model || "gemini-3.8-flash").replace(/^models\//, "");
      if (activeModel.includes("gemini-2.0") || activeModel.includes("gemini-1.5")) {
        activeModel = "gemini-3.8-flash";
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw await readError(res, "Gemini");
      const j = await res.json();
      return (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    }
    default:
      throw new LlmError(`Unknown LLM provider: ${provider}`, 400);
  }
}
