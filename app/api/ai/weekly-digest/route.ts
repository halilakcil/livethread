import { NextResponse } from "next/server";
import { errorResponse, llmFromRequest } from "@/lib/server/http";
import { complete } from "@/lib/llm/providers";
import { defaultModelFor } from "@/lib/llm/config";
import type { ThreadPost } from "@/lib/threads/types";

export const dynamic = "force-dynamic";

const DIGEST_SYSTEM = `You are an elite Threads growth strategist and social media data analyst.
Analyze a creator's real performance over the last 7 days and generate a balanced, high-value executive digest in Turkish.

CRITICAL ANTI-OUTLIER INSTRUCTION (VERY IMPORTANT):
1. A single viral post (e.g. one post getting 300+ likes or high replies) is a statistical OUTLIER. Do NOT anchor the creator's whole identity or weekly roadmap around that single post!
2. Analyze the structural and psychological drivers across ALL posts (e.g. curiosity hooks, accessible metaphors, contrarian angles, engaging closing questions) rather than fixating on the specific subject matter (e.g. do not conclude that the creator should only write about the Matrix or fictional movie characters).
3. The 3 "winningThemes" MUST cover 3 DISTINCT content pillars across the creator's universe:
   - Pillar 1: Kavramsal Bilim / Fizik / Doğa Yasaları (Evren ölçeği, entropi, kuantum, zaman).
   - Pillar 2: Zihinsel Modeller & İnsan Psikolojisi / Nöroloji (Karar alma, bilişsel tuzaklar, dopamin).
   - Pillar 3: Ters Köşe Düşünce Deneyleri & Felsefi Sorgulamalar (Varoluş, kabulleri sarsan sorular).
4. The 3 "actionSteps" MUST provide 3 distinct, actionable directions across different formats. Never repeat the same movie or fictional entity across action steps.
5. Writing rules: No semicolons, no colons, no quotation marks, no parentheses.

Respond strictly as JSON in this exact schema:
{
  "summary": "Stratejist değerlendirmesi (2 akıcı ve dengeli paragraf)",
  "winningThemes": ["Farklı Sütun 1", "Farklı Sütun 2", "Farklı Sütun 3"],
  "actionSteps": ["Aksiyon 1", "Aksiyon 2", "Aksiyon 3"]
}`;

/** POST /api/ai/weekly-digest  { posts: ThreadPost[] } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPosts: ThreadPost[] = Array.isArray(body.posts) ? body.posts : [];

    // Filter strictly to the last 7 days
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recentPosts = rawPosts.filter((p) => {
      if (!p.timestamp) return false;
      const t = new Date(p.timestamp).getTime();
      return !isNaN(t) && t >= sevenDaysAgo;
    });

    if (recentPosts.length === 0) {
      return NextResponse.json({
        hasData: false,
        message: "Son 7 günde yayınlanmış herhangi bir gönderiniz bulunamadı. Gönderi paylaştıkça haftalık performans raporunuz burada otomatik oluşturulacaktır.",
      });
    }

    // Calculate real 7-day stats & detect outlier vs baseline
    let totalViews = 0;
    let totalLikes = 0;
    let totalReplies = 0;
    let totalReposts = 0;

    const scoredPosts = recentPosts.map((p) => {
      const views = p.metrics?.views || 0;
      const likes = p.metrics?.likes || 0;
      const replies = p.metrics?.replies || 0;
      const reposts = p.metrics?.reposts || 0;
      totalViews += views;
      totalLikes += likes;
      totalReplies += replies;
      totalReposts += reposts;
      const score = likes * 2 + replies * 3 + reposts * 4;
      return { post: p, score, views, likes, replies, reposts };
    });

    scoredPosts.sort((a, b) => b.score - a.score);

    const topPost = scoredPosts[0].post;
    const mostDiscussedPost = [...scoredPosts].sort((a, b) => b.replies - a.replies)[0]?.post;

    // Check if top post is a statistical outlier
    const scores = scoredPosts.map((s) => s.score);
    const medianScore = scores[Math.floor(scores.length / 2)] || 1;
    const isTopPostOutlier = scoredPosts[0].score > medianScore * 3;

    // Select representative posts across the portfolio (top, discussion, baseline)
    const representativePosts: string[] = [];
    const seenIds = new Set<string>();

    const addPostSummary = (p: ThreadPost, label: string) => {
      if (!p || seenIds.has(p.id) || !p.text?.trim()) return;
      seenIds.add(p.id);
      representativePosts.push(
        `[${label}] (Beğeni: ${p.metrics?.likes || 0}, Yanıt: ${p.metrics?.replies || 0}):\n"${p.text.slice(0, 220)}..."`,
      );
    };

    addPostSummary(topPost, "En Yüksek Etkileşim Alan Gönderi (Viral)");
    if (mostDiscussedPost) addPostSummary(mostDiscussedPost, "En Çok Yorum / Tartışma Alan Gönderi");
    for (const sp of scoredPosts.slice(1, 8)) {
      addPostSummary(sp.post, "Portföy Gönderisi");
    }

    const { provider, apiKey, model } = llmFromRequest(req);
    const resolvedModel = model || defaultModelFor(provider);

    const prompt = `CREATOR'S LAST 7 DAYS PERFORMANCE METRICS:
Total Posts: ${recentPosts.length}
Total Views: ${totalViews}
Total Likes: ${totalLikes}
Total Replies: ${totalReplies}
Total Reposts: ${totalReposts}

${isTopPostOutlier ? `ÖNEMLİ DİKKAT: En çok beğeni alan gönderi (${topPost.metrics?.likes || 0} beğeni) istatistiksel bir aykırı değerdir (viral sıçrama). Analizin tamamını sadece bu tekil gönderinin konusuna veya popüler kültür karakterine İNDİRGEME! Yaratıcının geniş ilgi alanlarını (fizik, kuantum, nöroloji, psikoloji, felsefe) dengeli bir biçimde ele al.` : ""}

PORTFÖYDEN SEÇİLEN ÖRNEK GÖNDERİLER:
${representativePosts.join("\n\n")}

Provide the executive growth review in JSON.`;

    const raw = await complete({
      provider,
      apiKey,
      model: resolvedModel,
      system: DIGEST_SYSTEM,
      user: prompt,
    });

    const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
    const startObj = cleaned.indexOf("{");
    const endObj = cleaned.lastIndexOf("}");

    let parsedResult = {
      summary: "Bu hafta paylaşımlarınızda istikrarlı bir tempo yakalandı.",
      winningThemes: ["Teknoloji ve Üretkenlik", "Pratik Deneyim Paylaşımları"],
      actionSteps: [
        "Etkileşim alan konularda daha sık flood formatına geçin",
        "Yorum yapan okuyucularla sohbete devam edin",
        "Sabah erken saatlerde test paylaşımları yapın",
      ],
    };

    if (startObj !== -1 && endObj > startObj) {
      try {
        const parsed = JSON.parse(cleaned.slice(startObj, endObj + 1));
        if (parsed.summary) parsedResult.summary = String(parsed.summary);
        if (Array.isArray(parsed.winningThemes)) parsedResult.winningThemes = parsed.winningThemes.map(String);
        if (Array.isArray(parsed.actionSteps)) parsedResult.actionSteps = parsed.actionSteps.map(String);
      } catch {
        /* fallback */
      }
    }

    return NextResponse.json({
      hasData: true,
      stats: {
        postCount: recentPosts.length,
        totalViews,
        totalLikes,
        totalReplies,
        totalReposts,
        topPost: {
          text: topPost.text || "",
          likes: topPost.metrics?.likes || 0,
          replies: topPost.metrics?.replies || 0,
          permalink: topPost.permalink,
        },
      },
      analysis: parsedResult,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
