import { NextResponse } from "next/server";
import { errorResponse, HttpError, llmFromRequest } from "@/lib/server/http";
import { complete } from "@/lib/llm/providers";
import { defaultModelFor } from "@/lib/llm/config";
import { buildUserPrompt, parseRewriteOutput, SYSTEM_PROMPT, type RewriteMode } from "@/lib/llm/prompts";
import { verifyFidelity } from "@/lib/llm/verifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODES: RewriteMode[] = ["hooks", "rewrite", "thread"];

/** POST /api/ai/rewrite  { text, mode, instructions? } */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      text?: string;
      mode?: RewriteMode;
      instructions?: string;
      language?: "tr" | "en";
    };
    const text = (body.text || "").trim();
    if (!text) throw new HttpError("Source text is empty.", 400);
    if (text.length > 8000) throw new HttpError("Source text is too long (max 8000 characters).", 400);
    const mode = MODES.includes(body.mode as RewriteMode) ? (body.mode as RewriteMode) : "rewrite";
    const language = body.language === "en" ? "en" : body.language === "tr" ? "tr" : undefined;

    const { provider, apiKey, model } = llmFromRequest(req);
    const resolvedModel = model || defaultModelFor(provider);

    // 1. Initial Generation Request
    const raw = await complete({
      provider,
      apiKey,
      model: resolvedModel,
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(mode, text, body.instructions, language),
    });

    let result = parseRewriteOutput(mode, raw);

    // Ensure thread mode has between 3 and 6 posts
    if (mode === "thread" && result.items.length < 3) {
      const threadPrompt = `${buildUserPrompt(mode, text, body.instructions, language)}

CRITICAL REQUIREMENT:
The previous attempt produced only ${result.items.length} post(s). A Thread flood MUST contain between 3 and 6 posts.
Generate between 3 and 6 posts in the JSON array: {"items": ["post 1", "post 2", "post 3", ...]}`;

      try {
        const retryRaw = await complete({
          provider,
          apiKey,
          model: resolvedModel,
          system: SYSTEM_PROMPT,
          user: threadPrompt,
        });
        const retryResult = parseRewriteOutput(mode, retryRaw);
        if (retryResult.items.length >= 3) {
          result = retryResult;
        }
      } catch {
        /* best effort */
      }
    }

    // 2. Verification Controller Check (Feature 2: evaluate correctness & semantic fidelity)
    let verification = await verifyFidelity({
      provider,
      apiKey,
      model: resolvedModel,
      source: text,
      candidateText: result.items.join("\n"),
    });

    // 3. If accuracy is below 80%, fire an automatic correction request
    if (verification.score < 80) {
      const correctionPrompt = `${buildUserPrompt(mode, text, body.instructions, language)}

CRITICAL FEEDBACK FROM VERIFIER CONTROLLER:
Your previous draft only achieved an accuracy score of ${verification.score}% with reason: "${verification.reasoning}".
Rewrite the draft strictly ensuring high factual fidelity (>= 80% accuracy) without adding any fabricated facts, numbers, or distorted meaning. Follow all punctuation and no-blank-line rules.`;

      const retryRaw = await complete({
        provider,
        apiKey,
        model: resolvedModel,
        system: SYSTEM_PROMPT,
        user: correctionPrompt,
      });

      const retryResult = parseRewriteOutput(mode, retryRaw);
      const retryVerification = await verifyFidelity({
        provider,
        apiKey,
        model: resolvedModel,
        source: text,
        candidateText: retryResult.items.join("\n"),
      });

      // If retry is better or passes, adopt it
      if (retryVerification.score >= verification.score) {
        result = retryResult;
        verification = retryVerification;
      }
    }

    result.verification = verification;
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
