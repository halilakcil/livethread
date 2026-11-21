import { describe, expect, it } from "vitest";
import { parseRewriteOutput } from "../lib/llm/prompts";
import { sanitizeThreadText } from "../lib/llm/verifier";
import { toThreadsError } from "../lib/threads/client";
import { mockAudienceInsights } from "../lib/mock/data";

describe("toThreadsError", () => {
  it("detects expired tokens (code 190)", () => {
    const err = toThreadsError(400, {
      error: { message: "Session has expired", code: 190 },
    });
    expect(err.message).toContain("Invalid or expired access token");
    expect(err.rateLimited).toBe(false);
  });

  it("detects rate limits (code 4, 17, 32, 613)", () => {
    const err = toThreadsError(400, {
      error: { message: "User request limit reached", code: 4 },
    });
    expect(err.rateLimited).toBe(true);
    expect(err.message).toContain("Threads API rate limit reached");
  });

  it("detects publishing / search rate limits via subcode (2207042, 2207051)", () => {
    const err = toThreadsError(400, {
      error: { message: "Action blocked", code: 100, error_subcode: 2207042 },
    });
    expect(err.rateLimited).toBe(true);
  });

  it("detects 429 status code as rate limited", () => {
    const err = toThreadsError(429, { error: { message: "Too many requests" } });
    expect(err.rateLimited).toBe(true);
  });
});

describe("parseRewriteOutput", () => {
  it("parses clean JSON response for rewrite", () => {
    const raw = JSON.stringify({ items: ["This is a fresh punchy post."] });
    const res = parseRewriteOutput("rewrite", raw);
    expect(res.mode).toBe("rewrite");
    expect(res.items).toEqual(["This is a fresh punchy post."]);
  });

  it("parses markdown code-fenced JSON for hooks", () => {
    const raw = "```json\n" + JSON.stringify({ hooks: ["Hook 1", "Hook 2", "Hook 3"] }) + "\n```";
    const res = parseRewriteOutput("hooks", raw);
    expect(res.mode).toBe("hooks");
    expect(res.items).toHaveLength(3);
    expect(res.items[0]).toBe("Hook 1");
  });

  it("parses markdown code-fenced JSON for thread split and ensures 3-6 posts", () => {
    const raw = "Here is the result:\n```json\n" + JSON.stringify({ posts: ["Giriş postu.", "Gelişme ve detay postu.", "Sonuç ve tartışma sorusu postu."] }) + "\n```";
    const res = parseRewriteOutput("thread", raw);
    expect(res.mode).toBe("thread");
    expect(res.items.length).toBeGreaterThanOrEqual(3);
    expect(res.items.length).toBeLessThanOrEqual(6);
  });

  it("handles top-level JSON array and guarantees minimum 3 posts for flood", () => {
    const raw = JSON.stringify(["Post 1 hook cümlesi.", "Post 2 analiz cümlesi."]);
    const res = parseRewriteOutput("thread", raw);
    expect(res.items.length).toBeGreaterThanOrEqual(3);
    expect(res.items.length).toBeLessThanOrEqual(6);
  });

  it("caps thread output at maximum 6 posts", () => {
    const raw = JSON.stringify({
      items: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"],
    });
    const res = parseRewriteOutput("thread", raw);
    expect(res.items).toHaveLength(6);
  });

  it("falls back to plain text if JSON parsing fails", () => {
    const raw = "Why your ORM is slowing you down:\n1. N+1 queries\n2. Over-fetching";
    const res = parseRewriteOutput("rewrite", raw);
    expect(res.items[0]).toContain("Why your ORM is slowing you down");
  });
});

describe("sanitizeThreadText", () => {
  it("removes colons, semicolons, quotes, and parenthetical expressions", () => {
    const input = `Başlık: "Yazılım mimarisi" (önemli bir konu); performansı etkiler.`;
    const clean = sanitizeThreadText(input);
    expect(clean).not.toContain(":");
    expect(clean).not.toContain(";");
    expect(clean).not.toContain('"');
    expect(clean).not.toContain("(");
    expect(clean).not.toContain(")");
    expect(clean).toBe("Başlık Yazılım mimarisi performansı etkiler.");
  });

  it("ensures the first post of a thread has a title and a blank line gap", () => {
    const raw = JSON.stringify({
      items: [
        "Yazılım Dünyasında Verimlilik\n\nKod yazarken en sık karşılaşılan hata her şeyi sıfırdan yapmaya çalışmaktır.",
        "İkinci gönderi burada akıcı bir şekilde devam eder.",
        "Üçüncü gönderi ile özet çıkarılır.",
      ],
    });
    const res = parseRewriteOutput("thread", raw);
    expect(res.items[0]).toContain("\n\n");
    const [title, body] = res.items[0].split("\n\n");
    expect(title.trim()).toBe("Yazılım Dünyasında Verimlilik");
    expect(body).toContain("Kod yazarken en sık karşılaşılan");
  });

  it("adds title and blank line to post 1 if model returns continuous text without newline", () => {
    const raw = JSON.stringify({
      items: [
        "Yazılım mimarisi sürdürülebilirliğin temelidir. Büyük projelerde temiz kod yazmak kritik öneme sahiptir.",
        "İkinci gönderi detayları verir.",
        "Üçüncü gönderi tartışmayı başlatır.",
      ],
    });
    const res = parseRewriteOutput("thread", raw);
    expect(res.items[0]).toContain("\n\n");
    const [title, body] = res.items[0].split("\n\n");
    expect(title.length).toBeGreaterThan(0);
    expect(body.length).toBeGreaterThan(0);
  });

  it("joins sentence-by-sentence line breaks into a single continuous paragraph", () => {
    const input = "Hedefe vardığında değil, yoldaki zorlukta tatmin olmayı öğren.\nBeyin kimyası çok açık.\nÖdülü sadece sonuca bağlarsan dopamin zirve yapar ve hemen çakılır.";
    const clean = sanitizeThreadText(input);
    expect(clean).not.toContain("\n");
    expect(clean).toBe("Hedefe vardığında değil, yoldaki zorlukta tatmin olmayı öğren. Beyin kimyası çok açık. Ödülü sadece sonuca bağlarsan dopamin zirve yapar ve hemen çakılır.");
  });

  it("preserves exactly one blank line between title and body in thread post 1 and flows the body", () => {
    const input = "Etkili Başlık\n\nİlk thread gövdesi burada başlar.\n\nDevam eden cümle.";
    const clean = sanitizeThreadText(input, { preserveBlankLine: true });
    expect(clean).toBe("Etkili Başlık\n\nİlk thread gövdesi burada başlar. Devam eden cümle.");
  });
});

describe("Audience & Follower Insights", () => {
  it("generates realistic audience insights in mock mode", () => {
    const audience = mockAudienceInsights();
    expect(audience.followersCount).toBeGreaterThan(100);
    expect(audience.dailyFollowersGrowth).toHaveLength(14);
    expect(audience.hasDemographics).toBe(true);
    expect(audience.demographics?.countries.length).toBeGreaterThan(0);
    expect(audience.demographics?.ageGender.length).toBeGreaterThan(0);
  });
});
