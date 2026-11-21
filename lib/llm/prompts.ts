import { sanitizeThreadText, type VerificationResult } from "./verifier";

export type RewriteMode = "hooks" | "rewrite" | "thread";

export const REWRITE_MODES: { id: RewriteMode; label: string; description: string }[] = [
  { id: "rewrite", label: "Tek Post (Rewrite)", description: "Paylaşıma hazır tek post" },
  { id: "hooks", label: "Kanca / Giriş (Hooks)", description: "3 farklı dikkat çekici giriş cümlesi" },
  { id: "thread", label: "Flood Zinciri (3-6 Post)", description: "3 ile 6 post arası birbirine bağlı flood" },
];

export interface RewriteResult {
  mode: RewriteMode;
  /** hooks: 3 opening lines. rewrite: [text]. thread: 2-3 posts. */
  items: string[];
  verification?: VerificationResult;
}

export const SYSTEM_PROMPT = `You are a top-performing Threads creator who writes engaging, thought-provoking posts.
You turn ideas into natural, authentic, and compelling Threads posts that people love to read and reply to.

STRICT WRITING & FORMATTING RULES (MANDATORY):
1. NO SEMICOLONS: Never use semicolons (;) anywhere in the text.
2. NO COLONS: Never use colons (:) anywhere in the text.
3. NO QUOTES: Never put words, terms, or phrases inside quotes. Do not use single quotes, double quotes, or curly quotes (' " “ ” ‘ ’).
4. NO PARENTHESES: Never put words or side-notes inside parentheses (like this) or brackets [like this]. State your points directly in the sentence flow without parentheses.
5. NATURAL FLOW (NEVER BREAK AFTER EVERY SENTENCE):
   - ABSOLUTELY FORBIDDEN: Do NOT drop to a new line after every single sentence. Do NOT write in poem style or bulleted line style.
   - REQUIRED: Write in natural, cohesive paragraphs where complete sentences flow together side by side on the same line.
   - Example of FORBIDDEN style:
     Hedefe vardığında değil yoldaki zorlukta tatmin olmayı öğren.
     Beyin kimyası çok açık.
     Ödülü sadece sonuca bağlarsan dopamin zirve yapar ve hemen çakılır.
   - Example of REQUIRED style:
     Hedefe vardığında değil yoldaki zorlukta tatmin olmayı öğren. Beyin kimyası çok açık ve ödülü sadece sonuca bağlarsan dopamin zirve yapar ve hemen çakılır. Tükenmişliğin asıl sebebi budur.
   - Do NOT leave excessive empty lines or blank gaps between lines (except for the single empty line between the headline and the body in the first post of a flood).
6. CONTENT INTEGRITY & FACTUAL ACCURACY:
   - Faithfully retain the core hook, context, and insight of the source. Never fabricate fake numbers, false statistics, or invented claims.
7. LANGUAGE & LENGTH:
   - Write ONLY in the language specified by the author language instruction. If none is given, match the source language.
   - Maximum 500 characters per post (Threads hard limit).
8. STYLE & TONE:
   - Clear, concise, impactful language. Avoid buzzwords and corporate jargon.
   - Fresh wording that sounds human, intelligent, and natural.

You ALWAYS reply with a single valid JSON object and nothing else.`;

const MODE_INSTRUCTIONS: Record<RewriteMode, string> = {
  hooks: `Task: write exactly 3 alternative OPENING LINES (hooks) for a post based on the source.
Each hook uses a different angle (e.g. contrarian claim, surprising number/fact from the source, curiosity gap, personal stake).
Each hook is a single natural line, under 120 characters, without colons, semicolons, quotes or parentheses.
Respond as: {"items": ["hook 1", "hook 2", "hook 3"]}`,
  rewrite: `Task: rewrite the source into ONE ready-to-publish Threads post (max 500 characters).
Write in natural, cohesive sentences with smooth paragraph flow. Do NOT drop to a new line after every single sentence. Follow all rules: no colons, no semicolons, no quotes, no parentheses, no blank line gaps.
Respond as: {"items": ["the full post"]}`,
  thread: `Task: break the source into a chained Threads thread (flood) of MINIMUM 3 posts and MAXIMUM 6 posts (each post max 500 characters).
Rules for the thread chain:
- Count: You MUST generate between 3 and 6 posts (minimum 3, maximum 6).
- Post 1 (TITLE + HOOK): Post 1 MUST begin with a punchy, magnetic TITLE on the first line, followed by ONE blank line, and then the opening hook and intro paragraph.
  * Do NOT prefix with "Başlık:" or colons.
  * Format of Post 1 strictly:
    [Etkili ve Dikkat Çekici Başlık]

    [İlk thread'in doğal ve akıcı gövde metni]
- Middle Posts (Posts 2 to N-1): Unpack the core insights, arguments, details, or actionable steps sequentially in natural flowing prose paragraphs.
- Final Post (Post N): Lands the conclusion, summary takeaway, or an engaging discussion question that invites replies.
- Flow: Each post must read as natural, flowing prose sentences together in a single cohesive paragraph. Do NOT drop to a new line after every single sentence.
- Formatting: Do not number the posts like "1/3" or "Post 1". Follow all strict rules: no colons (:), no semicolons (;), no quotes, no parentheses. Except for the single blank line after the title in Post 1, do not leave empty line gaps.
Respond strictly as JSON: {"items": ["[Başlık]\\n\\n[Post 1 gövde metni]", "Post 2 metni", "Post 3 metni", ...]}`,
};

export function buildUserPrompt(
  mode: RewriteMode,
  source: string,
  extraInstructions?: string,
  language?: "tr" | "en",
): string {
  const languageLine =
    language === "en"
      ? "OUTPUT LANGUAGE (MANDATORY): Write the entire response in English. Do not use Turkish."
      : language === "tr"
        ? "OUTPUT LANGUAGE (MANDATORY): Write the entire response in Turkish. Do not use English except for unavoidable proper nouns."
        : "";
  return [
    MODE_INSTRUCTIONS[mode],
    languageLine,
    extraInstructions?.trim() ? `Additional instructions from the author: ${extraInstructions.trim()}` : "",
    `Source post:\n"""\n${source.trim()}\n"""`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function splitTextIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatFirstPostWithTitle(post1: string): string {
  const clean = sanitizeThreadText(post1, { preserveBlankLine: true });
  // Check if it already has a title separated by an empty line
  const parts = clean.split(/\n\s*\n+/);
  if (parts.length >= 2) {
    const title = parts[0]
      .replace(/^(?:Başlık|Baslik|Title|Konu)\s*/i, "")
      .replace(/[;:"'`]/g, "")
      .trim();
    const body = parts.slice(1).join(" ").replace(/\r?\n+/g, " ").trim();
    return `${title}\n\n${body}`;
  }

  // If there is no blank line, see if the first sentence can serve as a headline
  const sentences = splitTextIntoSentences(clean);
  if (sentences.length >= 2) {
    const title = sentences[0]
      .replace(/^(?:Başlık|Baslik|Title|Konu)\s*/i, "")
      .replace(/[;:"'`]/g, "")
      .replace(/[.!?]+$/, "")
      .trim();
    const body = sentences.slice(1).join(" ").trim();
    return `${title}\n\n${body}`;
  }

  // Fallback: create a concise title from the beginning words
  const words = clean.split(/\s+/);
  if (words.length > 5) {
    const title = words.slice(0, 5).join(" ").replace(/[;:"'`.,!?]/g, "");
    return `${title}\n\n${clean}`;
  }

  return clean;
}

function ensureThreadCount(items: string[]): string[] {
  let list = items.filter(Boolean);
  if (list.length < 3) {
    if (list.length === 1) {
      const sentences = splitTextIntoSentences(list[0]);
      if (sentences.length >= 3) {
        const n = sentences.length;
        const c1 = Math.ceil(n / 3);
        const c2 = Math.ceil((2 * n) / 3);
        list = [
          sentences.slice(0, c1).join(" "),
          sentences.slice(c1, c2).join(" "),
          sentences.slice(c2).join(" "),
        ].filter(Boolean);
      } else if (sentences.length === 2) {
        list = [sentences[0], sentences[1], "Bu konudaki düşünceleriniz neler sizce hangi adım daha kritik"];
      } else {
        list = [
          list[0],
          "Bu durumun temelinde yatan dinamikleri anlamak süreci çok daha kolaylaştırıyor.",
          "Siz bu konuda nasıl bir yol izliyorsunuz düşüncelerinizi paylaşın.",
        ];
      }
    } else if (list.length === 2) {
      const longerIdx = list[0].length >= list[1].length ? 0 : 1;
      const sentences = splitTextIntoSentences(list[longerIdx]);
      if (sentences.length >= 2) {
        const mid = Math.ceil(sentences.length / 2);
        const p1 = sentences.slice(0, mid).join(" ");
        const p2 = sentences.slice(mid).join(" ");
        if (longerIdx === 0) {
          list = [p1, p2, list[1]];
        } else {
          list = [list[0], p1, p2];
        }
      } else {
        list.push("Siz bu durum hakkında ne düşünüyorsunuz deneyimlerinizi paylaşın.");
      }
    }
  }

  list = list.slice(0, 6);

  // Guarantee Post 1 has a title and a blank line before the body
  if (list.length > 0) {
    list[0] = formatFirstPostWithTitle(list[0]);
  }

  return list;
}

/** Tolerant parser for model output: handles code fences, arrays, prose around JSON, and plain-text fallbacks. */
export function parseRewriteOutput(mode: RewriteMode, raw: string): RewriteResult {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  let items: string[] | undefined;

  // 1. Try parsing JSON Object
  const startObj = cleaned.indexOf("{");
  const endObj = cleaned.lastIndexOf("}");
  if (startObj !== -1 && endObj > startObj) {
    try {
      const obj = JSON.parse(cleaned.slice(startObj, endObj + 1)) as Record<string, unknown>;
      const candidate =
        obj.items ??
        obj.posts ??
        obj.thread ??
        obj.threads ??
        obj.flood ??
        obj.hooks ??
        obj.tweets ??
        obj.chain ??
        obj.parts ??
        obj.data ??
        obj.results ??
        (obj.text ? [obj.text] : undefined);
      if (Array.isArray(candidate)) items = candidate.map(String);
    } catch {
      /* fall through to array / text heuristics */
    }
  }

  // 2. Try parsing JSON Array directly [...]
  if (!items) {
    const startArr = cleaned.indexOf("[");
    const endArr = cleaned.lastIndexOf("]");
    if (startArr !== -1 && endArr > startArr) {
      try {
        const arr = JSON.parse(cleaned.slice(startArr, endArr + 1)) as unknown[];
        if (Array.isArray(arr) && arr.length > 0) {
          items = arr.map(String);
        }
      } catch {
        /* fall through */
      }
    }
  }

  // 3. Fallback to text parsing heuristics
  if (!items) {
    if (mode === "rewrite") {
      items = [cleaned];
    } else if (mode === "hooks") {
      items = cleaned
        .split(/\n+/)
        .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter(Boolean);
    } else if (mode === "thread") {
      const delimiterPattern = /\n\s*(?:-{3,}|\*{3,}|\b(?:Post|Thread|Gönderi|\d+\/\d+|\(\d+\)|\d+\.)\b[^\n]*)\s*\n/i;
      let parts = cleaned.split(delimiterPattern).map((p) => p.trim()).filter(Boolean);

      if (parts.length < 3) {
        parts = cleaned
          .split(/(?:^|\n)\s*(?:\d+[\.\/\)]|Post\s*\d+|Gönderi\s*\d+)\s+/i)
          .map((p) => p.trim())
          .filter(Boolean);
      }

      if (parts.length < 3) {
        const paragraphs = cleaned.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
        if (paragraphs.length >= 3) {
          parts = paragraphs;
        }
      }

      items = parts.length > 0 ? parts : [cleaned];
    }
  }

  const resolvedItems = (items && items.length > 0 ? items : [cleaned])
    .map((s, idx) =>
      mode === "thread" && idx === 0
        ? sanitizeThreadText(s, { preserveBlankLine: true })
        : sanitizeThreadText(s)
    )
    .filter(Boolean);

  let finalItems = resolvedItems;
  if (mode === "rewrite") finalItems = resolvedItems.slice(0, 1);
  if (mode === "hooks") finalItems = resolvedItems.slice(0, 3);
  if (mode === "thread") finalItems = ensureThreadCount(resolvedItems);

  if (finalItems.length === 0) throw new Error("The model returned an empty response.");
  return { mode, items: finalItems };
}
