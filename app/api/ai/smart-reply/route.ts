import { NextResponse } from "next/server";
import {
  isCommentIntentType,
  isReplyTone,
  tonePromptHint,
  type CommentIntent,
  type CommentIntentType,
  type ReplyTone,
} from "@/lib/inbox/reply-tones";
import { defaultModelFor } from "@/lib/llm/config";
import { complete } from "@/lib/llm/providers";
import { sanitizeThreadText } from "@/lib/llm/verifier";
import { errorResponse, HttpError, llmFromRequest } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const SMART_REPLY_SYSTEM = `You are an expert Threads community manager and reply coach.
You analyze a reader comment in the context of the main thread and the entire back-and-forth dialogue history (trail), AND write 2 reply options.

CRITICAL CONTEXT INSTRUCTION:
Never treat the latest comment in isolation or reply in a vacuum. You will be provided with the main post/thread topic AND the chronological dialogue trail between the post author and the commenter.
Understand what has already been said, what questions were asked, and how the discussion evolved. Your replies must flow naturally as an insightful continuation of this specific conversation without repeating what was already said or losing the thread topic.

First classify the commenter's intent:
- civil: good-faith civilized discussion
- bait: trying to drag into a polemic fight ego trap or narcissistic provocation
- hostile: rude attack insult or aggression
- curious: genuine question seeking clarification
- praise: compliment support appreciation
- neutral: ordinary remark without strong intent

Then pick the best reply tone among: warm calm playful firm witty.

Finally write 2 different replies in the requested tone.

Rules for replies (MANDATORY):
1. Never use semicolons (;).
2. Never use colons (:).
3. Never use quotation marks (" ' “ ”).
4. Never use parentheses ( ) or brackets [ ].
5. Do NOT break sentences onto separate lines. Write in a single continuous flowing paragraph.
6. Under 280 characters.
7. Reply in the same language as the comment.
8. If intent is bait or hostile prefer de-escalation unless tone is firm then set a clear boundary without insults.

Respond strictly as JSON:
{
  "intent": {
    "type": "civil|bait|hostile|curious|praise|neutral",
    "summary": "one short sentence explaining the diagnosis and how to respond",
    "suggestedTone": "warm|calm|playful|firm|witty"
  },
  "replies": ["first reply", "second alternative reply"]
}`;

function fallbackIntent(suggestedTone: ReplyTone): CommentIntent {
  return {
    type: "neutral",
    summary: "Intent could not be classified clearly. Respond carefully.",
    suggestedTone,
  };
}

function parseIntent(raw: unknown, fallbackTone: ReplyTone): CommentIntent {
  if (!raw || typeof raw !== "object") return fallbackIntent(fallbackTone);
  const obj = raw as Record<string, unknown>;
  const type: CommentIntentType = isCommentIntentType(obj.type) ? obj.type : "neutral";
  const suggestedTone: ReplyTone = isReplyTone(obj.suggestedTone) ? obj.suggestedTone : fallbackTone;
  const summary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : fallbackIntent(fallbackTone).summary;
  return { type, summary, suggestedTone };
}

/** POST /api/ai/smart-reply  { parentText, commentText, commenterName, tone? } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parentText = String(body.parentText || "").trim();
    const commentText = String(body.commentText || "").trim();
    const commenterName = String(body.commenterName || "").trim();
    const requestedTone: ReplyTone | null = isReplyTone(body.tone) ? body.tone : null;
    const dialogueTrail: { username?: string; text?: string; isAuthor?: boolean }[] =
      Array.isArray(body.dialogueTrail) ? body.dialogueTrail : [];

    if (!commentText) throw new HttpError("Yorum metni belirtilmelidir.", 400);

    const { provider, apiKey, model } = llmFromRequest(req);
    const resolvedModel = model || defaultModelFor(provider);
    const toneInstruction = requestedTone
      ? `Forced reply tone: ${requestedTone} (${tonePromptHint(requestedTone)}). Still classify intent and keep suggestedTone as your best recommendation even if different.`
      : "Choose the best suggestedTone yourself and write replies in that tone.";

    let dialogueSection = "";
    if (dialogueTrail.length > 0) {
      dialogueSection =
        "\n\nKONUŞMA VE YANIT GEÇMİŞİ (KRONOLOJİK SİLSİLE):\n" +
        dialogueTrail
          .map((m, idx) => {
            const speaker = m.isAuthor ? "SİZ (GÖNDERİ SAHİBİ)" : `@${m.username || commenterName || "okuyucu"}`;
            return `${idx + 1}. [${speaker}]:\n${m.text || ""}`;
          })
          .join("\n\n");
    }

    const prompt = `PAYLAŞTIĞIM ANA THREAD / GÖNDERİ:
${parentText || "Genel gönderi"}
${dialogueSection}

CEVAPLANACAK EN SON YORUM (@${commenterName || "kullanıcı"}):
${commentText}

${toneInstruction}

ÖNEMLİ BAĞLAM KURALI:
Yukarıdaki thread'in ana temasını, gönderi sahibinin önceki yanıtlarını ve @${commenterName} ile aranızda geçen konuşma silsilesini dikkate alarak devam niteliğinde, zeki, samimi ve kurallara uygun 2 alternatif yanıt üret. Konuşmanın bağlamından ASLA kopma.

1) Classify intent.
2) Suggest the best tone.
3) Write 2 reply alternatives in the active tone.`;

    const raw = await complete({
      provider,
      apiKey,
      model: resolvedModel,
      system: SMART_REPLY_SYSTEM,
      user: prompt,
    });

    const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
    let replies: string[] = [];
    let intent = fallbackIntent(requestedTone ?? "warm");

    const startObj = cleaned.indexOf("{");
    const endObj = cleaned.lastIndexOf("}");
    if (startObj !== -1 && endObj > startObj) {
      try {
        const parsed = JSON.parse(cleaned.slice(startObj, endObj + 1)) as {
          replies?: unknown;
          intent?: unknown;
        };
        intent = parseIntent(parsed.intent, requestedTone ?? intent.suggestedTone);
        if (Array.isArray(parsed.replies)) {
          replies = parsed.replies.map((r) => sanitizeThreadText(String(r))).filter(Boolean);
        }
      } catch {
        /* fallback below */
      }
    }

    if (replies.length === 0) {
      replies = [sanitizeThreadText("Harika bir bakış açısı bu detayı vurguladığınız için teşekkür ederim")];
    }

    const activeTone = requestedTone ?? intent.suggestedTone;

    return NextResponse.json({
      success: true,
      replies,
      intent,
      tone: activeTone,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
