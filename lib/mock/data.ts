import type { RewriteMode, RewriteResult } from "@/lib/llm/prompts";
import type { PostMetrics, SearchParams, ThreadPost, ThreadsUser, UserAudienceInsights } from "@/lib/threads/types";

/** Deterministic demo data so the UI can be explored without any API keys. */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const MOCK_USER: ThreadsUser = {
  id: "demo-user",
  username: "demo.builder",
  name: "Demo Builder",
  threads_biography: "Shipping software & reading physics papers for fun.",
};

const OWN_TEXTS = [
  "Most performance problems aren't algorithmic.\n\nThey're an N+1 query hiding behind a nice ORM.\n\nProfile first. Guess never.",
  "I deleted 4,000 lines of code today.\n\nThe feature still works.\nThe tests are faster.\nThe team is happier.\n\nBest PR of the quarter.",
  "Entropy explains why your desk gets messy and your codebase gets worse.\n\nNeither cleans itself. Both need energy input.",
  "Hot take: the best onboarding doc is a working `make dev`.",
  "Startups don't die from competition.\n\nThey die from building the wrong thing for too long.",
  "Rust's borrow checker is just a very strict code reviewer that never gets tired.",
  "Reminder: light from the Sun is ~8 minutes old.\n\nYou are always looking at the past.",
  "The 3 questions I ask before adding a dependency:\n\n1. Can I write it in 50 lines?\n2. Who maintains it?\n3. What happens when it breaks?",
  "Senior engineers aren't faster typists.\n\nThey just say 'no' to more things.",
  "Your users don't care about your microservices.\n\nThey care that the button works.",
  "Quantum computers won't replace your laptop.\n\nThey'll replace a few very specific, very expensive simulations. That's still huge.",
  "Writing is thinking.\n\nIf you can't write the design doc, you don't understand the design yet.",
  "Shipped a side project in a weekend.\n\nSpent the next 3 weekends on auth, billing and emails.\n\nThe 'boring' parts are the product.",
  "Caching is easy.\nCache invalidation is a career.",
  "The James Webb telescope operates at about -233°C.\n\nIt has a sunshield the size of a tennis court to stay that cold.",
  "Feature flags are the closest thing we have to an undo button in production.",
  "Pricing advice for indie devs: double it.\n\nThen ask again in 3 months.",
  "Every 'quick fix' is a loan.\n\nTech debt is just the interest showing up.",
  "Bayesian thinking in one line:\n\nStrong opinions, updated often.",
  "Code review tip: comment on the design before the semicolons.",
  "I tried building in public for 30 days.\n\nGained 2k followers.\nLost zero customers.\nWorth it.",
  "Your brain uses ~20% of your energy while being ~2% of your body weight.\n\nThinking is expensive. Spend it wisely.",
  "Dark mode isn't a feature.\n\nIt's an apology to everyone working at 2am.",
  "TypeScript doesn't slow you down.\n\nDebugging undefined in production does.",
];

function metricsFor(rand: () => number, boost = 1): PostMetrics {
  const views = Math.round((400 + rand() * 18000) * boost);
  const likes = Math.round(views * (0.01 + rand() * 0.06));
  return {
    views,
    likes,
    replies: Math.round(likes * (0.05 + rand() * 0.25)),
    reposts: Math.round(likes * (0.02 + rand() * 0.12)),
    quotes: Math.round(likes * rand() * 0.04),
  };
}

export function mockMyPosts(): ThreadPost[] {
  const rand = seeded(42);
  const now = Date.now();
  return OWN_TEXTS.map((text, i) => {
    const ts = new Date(now - (i * 2.6 + rand() * 1.5) * 86400000).toISOString();
    return {
      id: `demo-${i + 1}`,
      text,
      timestamp: ts,
      permalink: "https://www.threads.net/",
      media_type: "TEXT_POST",
      media_product_type: "THREADS",
      username: MOCK_USER.username,
      has_replies: i === 0 || i === 7,
      replies:
        i === 0
          ? [
              {
                id: `demo-1-reply-1`,
                text: "Here is the rule: measure before optimizing. Use EXPLAIN ANALYZE on Postgres or your ORM's debug logger.",
                timestamp: new Date(now - 86400000).toISOString(),
                username: MOCK_USER.username,
              },
              {
                id: `demo-1-reply-2`,
                text: "If you want my 3-step checklist for database profiling, check the design doc in the comments.",
                timestamp: new Date(now - 86000000).toISOString(),
                username: MOCK_USER.username,
              },
            ]
          : i === 7
            ? [
                {
                  id: `demo-8-reply-1`,
                  text: "Bonus question: What's the maintenance cost of upgrading this dependency over the next 2 years?",
                  timestamp: new Date(now - 170000000).toISOString(),
                  username: MOCK_USER.username,
                },
              ]
            : undefined,
      metrics: metricsFor(rand, i % 5 === 1 ? 2.4 : 1),
    };
  });
}

const AUTHORS = ["quantum.quill", "shipfast.sam", "the.stoic.dev", "nebula.notes", "founder.fieldnotes", "lena.codes", "physics.daily", "bytes.and.books"];

const TOPIC_TEMPLATES: Record<string, string[]> = {
  software: [
    "The best code I ever wrote was the code I convinced the team not to write.",
    "Junior devs ask 'how'. Senior devs ask 'why'. Staff devs ask 'should we?'",
    "Unpopular opinion: monoliths are fine. Your 5-person team doesn't need Kubernetes.",
    "Logs are for humans. Metrics are for machines. Traces are for when both fail you.",
    "If your PR description is longer than the diff, you're doing it right.",
  ],
  physics: [
    "Time runs faster on the top floor of a building than on the ground floor. GPS satellites correct for this every day.",
    "There are more possible chess games than atoms in the observable universe. Physics is the weirder game though.",
    "Neutrinos pass through your body by the trillions every second. You've never felt one.",
    "A teaspoon of neutron star would weigh about 6 billion tons on Earth.",
    "Heat death isn't fire. It's the universe becoming perfectly, boringly uniform.",
  ],
  philosophy: [
    "Seneca: 'We suffer more in imagination than in reality.' Still the best debugging advice for anxiety.",
    "The Ship of Theseus is just a refactor with extra steps.",
    "Stoicism isn't about not feeling. It's about not being ruled by what you feel.",
    "Occam's razor: when two explanations fit, start with the one with fewer moving parts.",
    "You can't step in the same river twice — or deploy the same codebase twice.",
  ],
  startup: [
    "Talk to 10 users before writing 10 lines of code. Every time.",
    "Revenue solves most problems. Distribution solves the rest.",
    "Your first 100 customers won't come from ads. They'll come from you, personally, in DMs.",
    "Fundraising is a side quest. Building something people want is the main quest.",
    "If you're not embarrassed by v1, you shipped too late.",
  ],
};

export function mockSearch({ q, searchType, limit }: SearchParams): ThreadPost[] {
  const key = q.toLowerCase().replace(/^#/, "");
  const templates =
    TOPIC_TEMPLATES[key] ??
    Object.values(TOPIC_TEMPLATES)
      .flat()
      .map((t) => `${t} #${key}`);
  const rand = seeded(key.split("").reduce((a, c) => a + c.charCodeAt(0), 7));
  const out: ThreadPost[] = [];
  for (let i = 0; i < limit; i++) {
    const base = templates[i % templates.length];
    const variant = i >= templates.length ? `${base}\n\n(Part ${Math.floor(i / templates.length) + 1})` : base;
    out.push({
      id: `search-${key}-${i}`,
      text: variant,
      timestamp: new Date(Date.now() - (searchType === "RECENT" ? i * 3600000 : rand() * 20 * 86400000)).toISOString(),
      permalink: "https://www.threads.net/",
      media_type: "TEXT_POST",
      username: AUTHORS[Math.floor(rand() * AUTHORS.length)],
      is_verified: rand() > 0.7,
      metrics: metricsFor(rand, searchType === "TOP" ? 6 : 0.6),
    });
  }
  if (searchType === "TOP") out.sort((a, b) => (b.metrics?.likes ?? 0) - (a.metrics?.likes ?? 0));
  return out;
}

import { sanitizeThreadText } from "@/lib/llm/verifier";

/** Canned rewrite used in demo mode when no LLM key is configured. */
export function mockRewrite(mode: RewriteMode, text: string): RewriteResult {
  const lines = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const core = lines[0] ?? text.slice(0, 80);
  const rest = lines.slice(1);

  let rawItems: string[] = [];
  switch (mode) {
    case "hooks":
      rawItems = [
        `Nobody talks about this but ${core.replace(/[.:;!?'"]+$/g, "").toLowerCase()}`,
        `I was wrong about this for years`,
        `One simple shift changed how I think about my entire work`,
      ];
      break;
    case "thread":
      rawItems = [
        `Hedefe Değil Yoldaki Sürtünmeye Odaklanın\n\n${core}. Konunun derinlerine inip arkasındaki dinamiklere birlikte bakalım.`,
        rest.length ? rest.join(" ") : "Çoğu zaman hedefe ulaşmanın getirdiği haz geçici olurken asıl kalıcı dönüşüm süreç boyunca karşılaştığımız sürtünmeden keyif alabilmekte saklıdır.",
        "Süreci ödüllendiren bir zihniyet geliştirdiğinizde beyin tükenmişlik yaşamak yerine devamlı bir merak ve motivasyon döngüsüne girer.",
        "Özetle başarı bir varış noktası değil her gün sürdürülen bir ritimdir. Siz motivasyonunuzu sonuca mı yoksa yoldaki sürece mi bağlıyorsunuz?",
      ];
      break;
    default:
      rawItems = [
        `${core}. ${rest.length ? rest.join(" ") : "Simple idea hard to practice."} Agree or disagree?`,
      ];
      break;
  }

  const items = rawItems.map((item, idx) =>
    mode === "thread" && idx === 0
      ? sanitizeThreadText(item, { preserveBlankLine: true })
      : sanitizeThreadText(item)
  );
  return {
    mode,
    items,
    verification: {
      score: 95,
      passed: true,
      reasoning: "Ana fikir ve bağlam %95 doğrulukla korundu.",
    },
  };
}

export function mockAudienceInsights(): UserAudienceInsights {
  const dates = [
    "10 May", "11 May", "12 May", "13 May", "14 May", "15 May", "16 May",
    "17 May", "18 May", "19 May", "20 May", "21 May", "22 May", "23 May"
  ];
  const currentFollowers = 4620;
  const dailyGrowth = dates.map((d, i) => {
    const change = 14 + (i % 5) * 6 + (i === 12 ? 38 : 0);
    const followers = currentFollowers - (13 - i) * 22;
    return {
      date: d,
      followers,
      change,
    };
  });

  return {
    followersCount: currentFollowers,
    followersTrend: 8.4,
    engagementPerFollower: 0.042,
    dailyFollowersGrowth: dailyGrowth,
    demographics: {
      countries: [
        { key: "TR", label: "Türkiye 🇹🇷", value: 3120, percentage: 68 },
        { key: "US", label: "Amerika Birleşik Devletleri 🇺🇸", value: 645, percentage: 14 },
        { key: "DE", label: "Almanya 🇩🇪", value: 370, percentage: 8 },
        { key: "GB", label: "Birleşik Krallık 🇬🇧", value: 185, percentage: 4 },
        { key: "NL", label: "Hollanda 🇳🇱", value: 140, percentage: 3 },
        { key: "OTHER", label: "Diğer Ülkeler 🌍", value: 160, percentage: 3 },
      ],
      cities: [
        { key: "istanbul", label: "İstanbul", value: 1680, percentage: 36 },
        { key: "ankara", label: "Ankara", value: 690, percentage: 15 },
        { key: "izmir", label: "İzmir", value: 460, percentage: 10 },
        { key: "london", label: "Londra", value: 140, percentage: 3 },
        { key: "berlin", label: "Berlin", value: 120, percentage: 2 },
      ],
      ageGender: [
        { ageGroup: "18-24", male: 320, female: 280, total: 600 },
        { ageGroup: "25-34", male: 1420, female: 980, total: 2400 },
        { ageGroup: "35-44", male: 680, female: 520, total: 1200 },
        { ageGroup: "45-54", male: 190, female: 150, total: 340 },
        { ageGroup: "55+", male: 50, female: 30, total: 80 },
      ],
    },
    hasDemographics: true,
    minFollowersReached: true,
  };
}
