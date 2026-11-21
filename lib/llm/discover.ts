import type { ThreadPost } from "@/lib/threads/types";

export function buildDiscoverPrompt(topic: string, count: number): string {
  return `You are an expert social media researcher specializing in viral Meta Threads content.
Topic / Query: "${topic}"

Task: Generate ${count} realistic, diverse, high-performing Threads posts that top creators (in tech, science, software, startups, philosophy, or personal growth) would post about this topic.

Rules for each post:
- Realistic tone: authentic, insightful, scroll-stopping hooks, punchy short sentences with line breaks.
- In the same language as the query (e.g. Turkish if the query is in Turkish, English if English).
- Max 500 characters per post (Threads limit).
- Include realistic creator username (e.g. "tech.lead", "indie.builder").
- Include realistic viral metrics: views (between 2,000 and 45,000), likes (views * 3-6%), replies, reposts.

Return ONLY a valid JSON object matching this schema:
{
  "posts": [
    {
      "id": "ai-1",
      "username": "creator.handle",
      "text": "The full post text...",
      "timestamp": "2026-11-05T12:00:00Z",
      "metrics": {
        "views": 18400,
        "likes": 840,
        "replies": 92,
        "reposts": 45,
        "quotes": 12
      }
    }
  ]
}`;
}

export function parseDiscoverOutput(raw: string): ThreadPost[] {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as { posts?: ThreadPost[] };
      if (Array.isArray(obj.posts) && obj.posts.length > 0) {
        return obj.posts.map((p, i) => ({
          id: p.id || `ai-${Date.now()}-${i}`,
          username: p.username || "viral.creator",
          text: p.text,
          timestamp: p.timestamp || new Date().toISOString(),
          media_type: "TEXT_POST",
          permalink: "https://www.threads.net/",
          metrics: p.metrics || { views: 5000, likes: 250, replies: 30, reposts: 15, quotes: 5 },
        }));
      }
    } catch {
      /* fallback */
    }
  }
  return [];
}
