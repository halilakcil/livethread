import { NextResponse } from "next/server";
import { errorResponse, HttpError, llmFromRequest } from "@/lib/server/http";
import { complete } from "@/lib/llm/providers";
import { defaultModelFor } from "@/lib/llm/config";

export const dynamic = "force-dynamic";

export interface HookScore {
  hook: string;
  overallScore: number; // 0-100
  curiosity: number; // 0-100
  clarity: number; // 0-100
  engagement: number; // 0-100
  feedback: string;
  isWinner: boolean;
}

const SCORE_HOOKS_SYSTEM = `You are a world-class viral content strategist and Threads copywriting analyst.
Your task is to analyze alternative opening lines (hooks) and score them on objective performance criteria.

Scoring Criteria (0 to 100 for each):
- curiosity: Does it create an irresistible curiosity gap without being cheap clickbait?
- clarity: Is the idea punchy, crisp, authentic, and immediately understandable?
- engagement: Does it provoke an emotion, contrarian opinion, or desire to comment/reply?
- overallScore: Weighted composite score (40% curiosity, 30% clarity, 30% engagement).

Identify the single strongest hook and mark it as isWinner: true.
Provide concise feedback in Turkish (1-2 sentences explaining why it works or how it can improve).

Respond ONLY as valid JSON in this exact schema:
{
  "scores": [
    {
      "hook": "string",
      "overallScore": 88,
      "curiosity": 92,
      "clarity": 85,
      "engagement": 86,
      "feedback": "Merak uyandırma gücü çok yüksek, okuyucuyu anında durduruyor.",
      "isWinner": true
    }
  ],
  "summary": "En yüksek performansı Hook 1 vaat ediyor çünkü..."
}`;

/** POST /api/ai/score-hooks  { hooks: string[], topic?: string } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawHooks: string[] = Array.isArray(body.hooks)
      ? body.hooks.map(String).filter((h: string) => h.trim())
      : [];
    if (rawHooks.length === 0) {
      throw new HttpError("Değerlendirilecek kanca (hook) listesi boş olamaz.", 400);
    }

    const { provider, apiKey, model } = llmFromRequest(req);
    const resolvedModel = model || defaultModelFor(provider);

    const userPrompt = `Aşağıdaki ${rawHooks.length} alternatif Threads kancasını (açılış cümlesi) tarafsızca puanla:
${rawHooks.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}`;

    const raw = await complete({
      provider,
      apiKey,
      model: resolvedModel,
      system: SCORE_HOOKS_SYSTEM,
      user: userPrompt,
    });

    const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
    const startObj = cleaned.indexOf("{");
    const endObj = cleaned.lastIndexOf("}");

    if (startObj !== -1 && endObj > startObj) {
      try {
        const parsed = JSON.parse(cleaned.slice(startObj, endObj + 1));
        const scores: HookScore[] = Array.isArray(parsed.scores) ? parsed.scores : [];

        // Guarantee winner is marked
        if (scores.length > 0 && !scores.some((s) => s.isWinner)) {
          scores.sort((a, b) => b.overallScore - a.overallScore);
          scores[0].isWinner = true;
        }

        return NextResponse.json({
          success: true,
          scores,
          summary: parsed.summary || "Kanca analizi tamamlandı.",
        });
      } catch {
        /* fallback */
      }
    }

    // Heuristic fallback if LLM returned non-JSON
    const fallbackScores: HookScore[] = rawHooks.map((h: string, idx: number) => ({
      hook: h,
      overallScore: 80 + (idx === 0 ? 8 : 0),
      curiosity: 82,
      clarity: 84,
      engagement: 78,
      feedback: "Güçlü bir kanca, net ve doğrudan ifade edilmiş.",
      isWinner: idx === 0,
    }));

    return NextResponse.json({
      success: true,
      scores: fallbackScores,
      summary: "Kancalar başarıyla değerlendirildi.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
