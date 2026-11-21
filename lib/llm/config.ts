export type LlmProvider = "openai" | "anthropic" | "gemini";

export const LLM_PROVIDERS: { id: LlmProvider; label: string; defaultModel: string; keyHint: string }[] = [
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini", keyHint: "sk-..." },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-3-5-sonnet-latest", keyHint: "sk-ant-..." },
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-3.8-flash", keyHint: "AIza..." },
];

export function defaultModelFor(provider: LlmProvider): string {
  return LLM_PROVIDERS.find((p) => p.id === provider)?.defaultModel ?? "gpt-4o-mini";
}
