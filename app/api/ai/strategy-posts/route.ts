import { NextResponse } from "next/server";
import { errorResponse, llmFromRequest } from "@/lib/server/http";
import { complete } from "@/lib/llm/providers";
import { defaultModelFor } from "@/lib/llm/config";
import { sanitizeThreadText } from "@/lib/llm/verifier";

export const dynamic = "force-dynamic";

export interface StrategyPostSuggestion {
  id: string;
  title: string;
  angle: string;
  hook: string;
  content: string;
  whyItWorks: string;
  suggestedCategory: string;
  suggestedIsoTime: string;
  suggestedTime: string;
  suggestedTimeReason: string;
}

const TURKISH_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function computeOptimalPostingTimes(historicalPosts: any[] = []) {
  // If we have historical posts with timestamps, inspect hours with highest interactions
  const hourlyScores: Record<number, number> = {};
  for (const p of historicalPosts) {
    if (!p.timestamp) continue;
    const hour = new Date(p.timestamp).getHours();
    const interactions = (p.metrics?.likes || 0) + (p.metrics?.replies || 0) * 2;
    hourlyScores[hour] = (hourlyScores[hour] || 0) + interactions;
  }

  const topHours = Object.entries(hourlyScores)
    .sort((a, b) => b[1] - a[1])
    .map(([h]) => Number(h));

  const morningHour = topHours.find((h) => h >= 7 && h <= 11) ?? 9;
  const eveningHour = topHours.find((h) => h >= 19 && h <= 23) ?? 20;
  const lunchHour = topHours.find((h) => h >= 12 && h <= 15) ?? 13;

  const now = new Date();

  // Slot 1: Tomorrow morning (e.g. 09:30)
  const d1 = new Date(now);
  d1.setDate(d1.getDate() + 1);
  d1.setHours(morningHour, 30, 0, 0);

  // Slot 2: 2 days later evening (e.g. 20:15)
  const d2 = new Date(now);
  d2.setDate(d2.getDate() + 2);
  d2.setHours(eveningHour, 15, 0, 0);

  // Slot 3: 3 days later lunch (e.g. 12:45)
  const d3 = new Date(now);
  d3.setDate(d3.getDate() + 3);
  d3.setHours(lunchHour, 45, 0, 0);

  const pad = (n: number) => String(n).padStart(2, "0");

  return [
    {
      iso: d1.toISOString(),
      label: `${TURKISH_DAYS[d1.getDay()]} ${pad(d1.getHours())}:${pad(d1.getMinutes())}`,
      reason: "Sabah odaklanma kuşağında zihin açıcı ters köşe tartışmalar için en yüksek etkileşim saati",
    },
    {
      iso: d2.toISOString(),
      label: `${TURKISH_DAYS[d2.getDay()]} ${pad(d2.getHours())}:${pad(d2.getMinutes())}`,
      reason: "Akşam serbest vakit kuşağında kitleyi yorum ve tartışmaya çeken en yüksek yanıt saati",
    },
    {
      iso: d3.toISOString(),
      label: `${TURKISH_DAYS[d3.getDay()]} ${pad(d3.getHours())}:${pad(d3.getMinutes())}`,
      reason: "Öğle molasında hızlı tüketilen ve paylaşılan bilim içerikleri için ideal zaman aralığı",
    },
  ];
}

function buildStrategySystem(language: "tr" | "en"): string {
  const langRule =
    language === "en"
      ? "1. English language. Write the entire JSON content fields in English."
      : "1. Turkish language. Write the entire JSON content fields in Turkish.";
  return `You are an elite Threads ghostwriter and viral content strategist.
Your task is to take a creator's performance insights and generate 3 ready-to-publish, high-engagement Threads posts representing 3 BALANCED and DIVERSE content pillars.

CRITICAL CONTENT DIVERSIFICATION RULES (MANDATORY):
1. THREE DISTINCT PILLARS:
   - Post 1 MUST be [Kavramsal Bilim / Fizik / Doğa Yasası]: An intriguing breakdown of a deep physical, astronomical, or quantum concept (entropy, relativity, spacetime, cosmic scale, paradoxes).
   - Post 2 MUST be [Zihinsel Modeller / Nöroloji / İnsan Psikolojisi]: An actionable insight into human behavior, decision making, cognitive bias, or dopamine dynamics connected to everyday life.
   - Post 3 MUST be [Ters Köşe Paradoks / Felsefi Düşünce Deneyi]: A counter-intuitive thought experiment or provocative question that challenges a widely held assumption and invites followers to debate.
2. ZERO MONOTONY / ANTI-OUTLIER RULE:
   - Do NOT generate 3 variations of the same topic!
   - If the creator had a viral top post about a specific movie, book, or pop-culture entity (e.g. Matrix, Agent Smith, cinema metaphors), DO NOT write posts about that same movie, fiction character, or simulation theory!
   - Treat the top post as a signal of high curiosity, NOT as a license to spam the same topic.
   - Each of the 3 posts MUST explore a completely different topic, with ZERO semantic overlap among them.
3. FORMAT RULES:
   ${langRule}
   - NO semicolons (;) under any condition.
   - NO colons (:) under any condition.
   - NO single or double quotes (" ' “ ” ‘ ’ \`) under any condition.
   - NO parentheses or brackets (do not use () or []).
   - Hook mastery: The first 1-2 lines must be an irresistible, curiosity-driven punchline.
   - Engagement driver: The post MUST end with a provocative, open-ended question that compels followers to reply.
   - Length: Between 160 and 420 characters. Single cohesive flowing paragraph.

Respond strictly as JSON in this exact schema:
{
  "posts": [
    {
      "title": "Kısa Konsept Başlığı",
      "angle": "Hangi temadan veya aksiyondan türetildiği",
      "hook": "İlk kanca cümlesi",
      "content": "Gönderinin tamamı doğrudan paylaşılabilecek temiz Threads metni",
      "whyItWorks": "Neden etkileşim alacağına dair tek cümlelik stratejik gerekçe",
      "suggestedCategory": "Fizik | Psikoloji | Felsefe"
    }
  ]
}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const analysis = body.analysis || {};
    const topPost = body.topPost || {};
    const focusItem = body.focusItem ? String(body.focusItem).trim() : "";
    const historicalPosts = Array.isArray(body.posts) ? body.posts : [];
    const language: "tr" | "en" = body.language === "en" ? "en" : "tr";

    const timeSlots = computeOptimalPostingTimes(historicalPosts);

    const winningThemes: string[] = Array.isArray(analysis.winningThemes) ? analysis.winningThemes : [];
    const actionSteps: string[] = Array.isArray(analysis.actionSteps) ? analysis.actionSteps : [];
    const summary = String(analysis.summary || "");

    const { provider, apiKey, model } = llmFromRequest(req);
    const resolvedModel = model || defaultModelFor(provider);

    // Prepare prompt with explicit anti-outlier & multi-pillar instructions
    const prompt = `CREATOR'S STRATEGIC PERFORMANCE CONTEXT:
Summary: ${summary}
Key Themes from Portfolio: ${winningThemes.join(" | ") || "Kavramsal bilim ve evren mekaniği, Nörolojik mekanizmalar ve karar modelleri, Varoluşsal düşünce deneyleri"}
Next Week Action Goals: ${actionSteps.join(" | ") || "Farklı sütunlarda dengeli içerik kurgusu, Okuyucuyu düşünmeye zorlayan açık uçlu sorular"}
${topPost.text ? `Past Top Performing Post (Reference only - DO NOT duplicate its specific entity, movie or metaphor): "${topPost.text}" (${topPost.likes || 0} beğeni)` : ""}
${focusItem ? `User Selected Focus Trigger: ${focusItem}` : ""}

MANDATORY ASSIGNMENT:
Generate exactly 3 posts across 3 DIFFERENT, complementary content pillars:
- Post 1: Kavramsal Bilim & Doğa Yasaları (Fizik, kuantum, entropi, kozmoloji)
- Post 2: Zihinsel Modeller & İnsan Psikolojisi (Karar mekanizmaları, nöroloji, bilişsel yanılgılar)
- Post 3: Ters Köşe Düşünce Deneyi & Felsefi Soru (Algıları sarsan açık uçlu tartışma)

Make sure there is ZERO semantic overlap among the 3 posts. Output strictly JSON.`;

    let posts: StrategyPostSuggestion[] = [];

    if (apiKey) {
      try {
        const raw = await complete({
          provider,
          apiKey,
          model: resolvedModel,
          system: buildStrategySystem(language),
          user: prompt,
        });

        const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
        const startObj = cleaned.indexOf("{");
        const endObj = cleaned.lastIndexOf("}");

        if (startObj !== -1 && endObj > startObj) {
          const parsed = JSON.parse(cleaned.slice(startObj, endObj + 1));
          if (Array.isArray(parsed.posts)) {
            posts = parsed.posts.slice(0, 3).map((p: any, idx: number) => {
              const slot = timeSlots[idx] || timeSlots[0];
              return {
                id: `strat-${Date.now()}-${idx}`,
                title: sanitizeThreadText(String(p.title || `Stratejik Fikir ${idx + 1}`)),
                angle: sanitizeThreadText(String(p.angle || "Haftalık Analiz Esintisi")),
                hook: sanitizeThreadText(String(p.hook || "")),
                content: sanitizeThreadText(String(p.content || p.text || ""), { preserveBlankLine: true }),
                whyItWorks: sanitizeThreadText(String(p.whyItWorks || "Bu hafta kitlenizin en çok reaksiyon verdiği kalıplara uygundur.")),
                suggestedCategory: sanitizeThreadText(String(p.suggestedCategory || "Felsefe")),
                suggestedIsoTime: slot.iso,
                suggestedTime: slot.label,
                suggestedTimeReason: slot.reason,
              };
            });
          }
        }
      } catch (llmErr) {
        console.warn("[Strategy Posts] LLM completion error, using smart template fallback:", llmErr);
      }
    }

    // Balanced 3-Pillar Fallback if LLM didn't return posts (e.g. mock mode or network outage)
    if (posts.length === 0) {
      posts = [
        {
          id: `strat-fb-1`,
          title: "Termodinamiğin İkinci Yasası ve Hayatın Kaos Eğilimi",
          angle: focusItem || "Kavramsal Bilim & Doğa Yasaları",
          hook: "Evrendeki her şey dağılmaya ve yıkılmaya meyillidir buna insan ilişkileri de dahil",
          content: sanitizeThreadText(
            "Termodinamik yasası ile kopmayan insan ilişkileri ilk bakışta alakasız görünebilir. Oysa entropi kuralı nettir. Kendi haline bırakılan her bağ solar ve kopar. Bir düzeni korumak için sürekli enerji harcamak zorundasınız. İletişimsizlik bir ilişkinin dinlenmesi değil yavaşça çürümesidir. Hayatınızda kendi haline bıraktığınız için sessizce dağılan en son şey neydi",
            { preserveBlankLine: true },
          ),
          whyItWorks: "Temel bir fizik kanununu günlük insan ilişkilerine bağlayarak yüksek merak ve yorum uyandırır.",
          suggestedCategory: "Fizik",
          suggestedIsoTime: timeSlots[0].iso,
          suggestedTime: timeSlots[0].label,
          suggestedTimeReason: timeSlots[0].reason,
        },
        {
          id: `strat-fb-2`,
          title: "Dopamin Açlığı ve Hedefe Ulaşma Hayal Kırıklığı",
          angle: winningThemes[1] || "Zihinsel Modeller & Nöroloji",
          hook: "Beyniniz bir hedefe ulaştığınız anda dopamin salgılamayı durdurur",
          content: sanitizeThreadText(
            "Aylarca peşinden koştuğunuz bir başarıya ulaştığınız gün hissettiğiniz o garip boşluk hissi tesadüf değil. Evrimsel olarak dopamin ödülün kendisi için değil sadece o ödüle giden arayış için tasarlanmıştır. Hedefe vardığınız an arama biter ve kimyasal düşüş başlar. Bu yüzden tatmin varılan durakta değil yolda gizlidir. En son ne zaman büyük bir hedefinize ulaşıp hemen ardından anlamsız bir boşluğa düştünüz",
            { preserveBlankLine: true },
          ),
          whyItWorks: "Nörolojik mekanizmayı doğrudan takipçinin kendi deneyimine ayna tutarak tartışmaya çeker.",
          suggestedCategory: "Psikoloji",
          suggestedIsoTime: timeSlots[1].iso,
          suggestedTime: timeSlots[1].label,
          suggestedTimeReason: timeSlots[1].reason,
        },
        {
          id: `strat-fb-3`,
          title: "Zamanın Göreliliği ve Geleceğin Çoktan Var Olması",
          angle: winningThemes[2] || "Ters Köşe Düşünce Deneyi",
          hook: "Gelecek dediğimiz şey aslında evrende çoktan yaşanmış bir an olabilir",
          content: sanitizeThreadText(
            "Özel görelilik teorisine göre uzay ve zaman birbirinden ayrılamaz bir dokudur. Sizin şu anınız Andromeda galaksisindeki bir gözlemci için çoktan geçmiş veya henüz yaşanmamış bir an olabilir. Evren zamanı bizim gibi ardışık hissetmiyor. Biz sadece bir filmi kare kare izleyen kısıtlı bilinçleriz. Eğer geleceğiniz çoktan bir koordinat olarak uzayda duruyorsa aldığınız kararlar ne kadar size ait",
            { preserveBlankLine: true },
          ),
          whyItWorks: "Açık uçlu felsefi paradoks kurgusuyla okuyucuyu yorum yapmaya ve fikrini savunmaya kışkırtır.",
          suggestedCategory: "Felsefe",
          suggestedIsoTime: timeSlots[2].iso,
          suggestedTime: timeSlots[2].label,
          suggestedTimeReason: timeSlots[2].reason,
        },
      ];
    }

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
