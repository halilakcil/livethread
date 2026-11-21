import { NextResponse } from "next/server";
import { errorResponse, llmFromRequest } from "@/lib/server/http";
import { complete } from "@/lib/llm/providers";
import { defaultModelFor } from "@/lib/llm/config";

export const dynamic = "force-dynamic";

export interface PostMultiCategoryScore {
  id: string;
  scores: Record<string, number>; // categoryId -> percentage (0 - 100)
  primaryCategory: string;
  summary: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const posts = Array.isArray(body.posts) ? body.posts : [];
    const categories = Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories
      : [
          { id: "bilim", name: "Bilim", threshold: 70 },
          { id: "fizik", name: "Fizik", threshold: 75 },
          { id: "kuantum", name: "Kuantum", threshold: 80 },
          { id: "simulasyon", name: "Simülasyon Teorisi", threshold: 75 },
          { id: "politika", name: "Politika", threshold: 65 },
          { id: "futbol", name: "Futbol", threshold: 65 },
        ];

    if (posts.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const targetPosts = posts.slice(0, 20);

    let llmCreds: { provider: any; apiKey: string; model?: string } | null = null;
    try {
      llmCreds = llmFromRequest(req);
    } catch {
      llmCreds = null;
    }

    const categoryListText = categories
      .map((c: any) => `"${c.id}" (${c.name}): ${c.description || c.name}`)
      .join("\n");

    let scoredItems: PostMultiCategoryScore[] = [];

    if (llmCreds && llmCreds.apiKey) {
      try {
        const resolvedModel = llmCreds.model || defaultModelFor(llmCreds.provider);

        const prompt = `Sen sosyal medya paylaşımlarını analiz edip konularına göre oranlayan semantik bir yapay zekasın.
GÖREV: Aşağıdaki gönderilerin her birini verilen kategoriler listesine göre analiz et.
Her gönderi için belirtilen kategorilerin her birine 0 ile 100 arasında bir alaka/ağırlık yüzdesi ver.

KATEGORİLER:
${categoryListText}

ÖNEMLİ KURALLAR:
1. Bir gönderide kelime sadece öylesine geçiyorsa (örneğin "ne bileyim", "bilmem" gibi) o kategoriye 0-10 puan ver.
2. Gönderi gerçekten o konuyu anlatıyor, öğretiyor veya tartışıyorsa yüksek puan ver (60-100).
3. Bir gönderi birden fazla kategoriyle ilgili olabilir (Örn: Hem Kuantum %80, hem Fizik %75, hem Bilim %70; Politika %1, Futbol %0).

GÖNDERİLER:
${targetPosts
  .map(
    (p: any, idx: number) =>
      `[#${idx + 1}] ID: "${p.id}"
Metin: ${p.text}
---`
  )
  .join("\n")}

Yanıtını SADECE geçerli bir JSON dizisi olarak ver:
[
  {
    "id": "...",
    "scores": { "bilim": 70, "kuantum": 30, "politika": 2, "futbol": 0 },
    "primaryCategory": "bilim",
    "summary": "Kuantum parçacıkları hakkında bilgilendirici bir açıklama."
  }
]`;

        const responseText = await complete({
          provider: llmCreds.provider,
          apiKey: llmCreds.apiKey,
          model: resolvedModel,
          system: "Yalnızca JSON formatında yanıt veren bir semantik içerik analiz sistemisin.",
          user: prompt,
        });

        const cleaned = responseText
          .replace(/```(?:json)?/gi, "")
          .trim();

        const startArr = cleaned.indexOf("[");
        const endArr = cleaned.lastIndexOf("]");
        if (startArr !== -1 && endArr > startArr) {
          const parsed = JSON.parse(cleaned.slice(startArr, endArr + 1));
          if (Array.isArray(parsed)) {
            scoredItems = parsed;
          }
        }
      } catch (err) {
        console.warn("[Tune Filter] Multi-category LLM error, using heuristic fallback:", err);
      }
    }

    // Heuristic fallback for any unrated items or when LLM is unavailable
    const ratedIds = new Set(scoredItems.map((s) => s.id));

    for (const post of targetPosts) {
      if (!ratedIds.has(post.id)) {
        const text = String(post.text || "").toLowerCase();
        const scores: Record<string, number> = {};

        const hasCasualPhrase =
          text.includes("ne bileyim") ||
          text.includes("bilmiyorum") ||
          text.length < 25;

        for (const cat of categories) {
          const cId = cat.id;
          const cName = cat.name.toLowerCase();
          const tags: string[] = Array.isArray(cat.tags) ? cat.tags : [cName];

          let score = 0;

          // Check if any tag appears in text
          const hasKeyword = tags.some((t) => text.includes(t.toLowerCase())) || text.includes(cName);

          if (hasKeyword) {
            if (hasCasualPhrase) {
              score = 15;
            } else {
              // Substantive context booster
              const isDeep =
                text.includes("araştırma") ||
                text.includes("teori") ||
                text.includes("neden") ||
                text.includes("analiz") ||
                text.includes("sistem") ||
                text.includes("paradoks") ||
                text.length > 80;
              score = isDeep ? 75 : 55;
            }
          } else {
            score = 0;
          }

          scores[cId] = score;
        }

        // Determine primary category
        let maxScore = -1;
        let primary = categories[0]?.id || "genel";
        for (const [cId, sc] of Object.entries(scores)) {
          if (sc > maxScore) {
            maxScore = sc;
            primary = cId;
          }
        }

        scoredItems.push({
          id: post.id,
          scores,
          primaryCategory: primary,
          summary: maxScore > 30 ? `${primary} ile ilgili içerik.` : "Genel paylaşım.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: posts.length,
      results: scoredItems,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
