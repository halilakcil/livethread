export interface CrawledPost {
  id: string;
  platform: "threads" | "x";
  text: string;
  author: {
    username: string;
    name?: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  metrics: {
    likes: number;
    replies: number;
    reposts: number;
    views?: number;
  };
  permalink: string;
  timestamp: string;
}

function parseThreadPost(post: any): CrawledPost | null {
  if (!post || typeof post !== "object") return null;

  // Extract caption text
  let text = "";
  if (typeof post.caption === "string") {
    text = post.caption;
  } else if (post.caption && typeof post.caption.text === "string") {
    text = post.caption.text;
  } else if (typeof post.text === "string") {
    text = post.text;
  }

  if (!text || text.trim().length === 0) return null;

  // Extract user / author
  const user = post.user || post.owner || post.author || post.user_profile || {};
  const username = user.username || post.username || user.handle || "threads_user";

  const code = post.code || post.shortcode || post.pk || post.id;
  const id = String(post.id || post.pk || code || Math.random().toString(36).slice(2));

  // Extract metrics
  const likeCount = Number(
    post.like_count ??
    post.like_count_raw ??
    post.likes ??
    post.edge_liked_by?.count ??
    post.edge_media_preview_like?.count ??
    post.metrics?.likes ??
    0
  );
  const replyCount = Number(
    post.reply_count ??
    post.text_post_app_info?.direct_reply_count ??
    post.edge_threaded_comments?.count ??
    post.metrics?.replies ??
    0
  );
  const repostCount = Number(
    post.text_post_app_info?.repost_count ??
    post.repost_count ??
    0
  );

  const permalink = code && username && username !== "threads_user"
    ? `https://www.threads.net/@${username}/post/${code}`
    : code
    ? `https://www.threads.net/t/${code}`
    : "https://www.threads.net";

  const timestamp = post.taken_at
    ? new Date(post.taken_at * 1000).toISOString()
    : post.created_at
    ? new Date(post.created_at * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: `th-${id}`,
    platform: "threads",
    text: text.trim(),
    author: {
      username,
      name: user.full_name || user.name || username,
      avatarUrl: user.profile_pic_url || user.avatar_url || user.profile_picture,
      verified: Boolean(user.is_verified || user.is_verified_by_mv),
    },
    metrics: {
      likes: isNaN(likeCount) ? 0 : likeCount,
      replies: isNaN(replyCount) ? 0 : replyCount,
      reposts: isNaN(repostCount) ? 0 : repostCount,
    },
    permalink,
    timestamp,
  };
}

function findPostsRecursively(obj: any, collected: any[], depth = 0): void {
  if (!obj || typeof obj !== "object" || depth > 30) return;

  // If this object has a caption, log it for inspection and check if it's a post
  if (obj.caption) {
    console.log(`[Threads Scraper] Found object with caption! Keys:`, Object.keys(obj).join(", "));
    collected.push(obj);
  } else if (obj.thread_items && Array.isArray(obj.thread_items)) {
    for (const item of obj.thread_items) {
      if (item?.post) collected.push(item.post);
      else if (item) collected.push(item);
    }
  } else if (obj.post && typeof obj.post === "object") {
    collected.push(obj.post);
  }

  // Traverse children
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findPostsRecursively(item, collected, depth + 1);
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (key === "thread_items") continue;
      const val = obj[key];
      if (val && typeof val === "object") {
        findPostsRecursively(val, collected, depth + 1);
      }
    }
  }
}


/**
 * Searches Threads using an authentic user sessionid.
 * Queries the real Threads web search page and extracts embedded SSR JSON data.
 */
export async function searchThreadsWithSession({
  query,
  limit = 20,
  threadsSession,
}: {
  query: string;
  limit?: number;
  threadsSession: string;
}): Promise<CrawledPost[]> {
  if (!threadsSession) {
    throw new Error("Threads oturum bilgisi (sessionid) tanımlı değil.");
  }

  const cleanTag = query.trim().replace(/^#/, "");
  const targetUrls = [
    `https://www.threads.com/search?q=${encodeURIComponent(cleanTag)}&serp_type=default`,
    `https://www.threads.net/search?q=${encodeURIComponent(cleanTag)}&serp_type=default`,
    `https://www.threads.com/search/?q=%23${encodeURIComponent(cleanTag)}&serp_type=tags`,
    `https://www.threads.net/search/?q=%23${encodeURIComponent(cleanTag)}&serp_type=tags`,
  ];

  // Build authentic cookie header:
  let cookieHeader = threadsSession.trim();
  if (!cookieHeader.includes("sessionid=")) {
    cookieHeader = `sessionid=${threadsSession.trim()}`;
  }
  if (!cookieHeader.includes("ds_user_id=")) {
    const rawVal = threadsSession.replace(/^sessionid=/, "").trim();
    const parts = rawVal.split(/%3A|:/);
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
      cookieHeader += `; ds_user_id=${parts[0]}`;
    }
  }

  console.log(`[Threads Scraper] Cookie header info: length=${cookieHeader.length}, has 'sessionid'=${cookieHeader.includes("sessionid")}`);

  const baseHeaders: Record<string, string> = {
    cookie: cookieHeader,
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "max-age=0",
    "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
  };

  const collectedRaw: any[] = [];
  let lastStatus = 200;

  for (const url of targetUrls) {
    const isDotCom = url.includes("threads.com");
    const domainHeaders = {
      ...baseHeaders,
      referer: isDotCom ? "https://www.threads.com/" : "https://www.threads.net/",
    };
    try {
      console.log(`[Threads Scraper] Fetching: ${url}`);
      const res = await fetch(url, { method: "GET", headers: domainHeaders });
      lastStatus = res.status;

      if (!res.ok) {
        console.warn(`[Threads Scraper] ${url} returned HTTP ${res.status}`);
        if (res.status === 401 || res.status === 403) {
          throw new Error("Threads sessionid çerezinin süresi dolmuş veya geçersiz.");
        }
        continue;
      }

      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const isLoginWall = html.includes("Giriş Yap") || html.includes("Log in") || (titleMatch && titleMatch[1].includes("Giriş Yap"));
      console.log(`[Threads Scraper] Page Title: "${titleMatch ? titleMatch[1] : 'No title'}", Length: ${html.length}, isLoginWall: ${isLoginWall}`);

      if (isLoginWall) {
        console.warn(`[Threads Scraper] Meta returned Login Wall for ${url}`);
        throw new Error("Threads oturumu doğrulanamadı (Giriş Yap sayfası döndü). Lütfen Ayarlar sayfasından F12 Network'teki tam Cookie metnini kaydedin.");
      }
      console.log(`[Threads Scraper] HTML checks: contains 'thread_items': ${html.includes("thread_items")}, 'like_count': ${html.includes("like_count")}, 'ScheduledServerJS': ${html.includes("ScheduledServerJS")}, 'caption': ${html.includes("caption")}`);

      // Extract all script tags
      const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
      let match: RegExpExecArray | null;
      let totalScripts = 0;
      let jsonScripts = 0;

      while ((match = scriptRegex.exec(html)) !== null) {
        totalScripts++;
        const scriptText = match[1];
        if (!scriptText) continue;

        // Try direct JSON parse if it looks like JSON or contains relevant keywords
        if (
          scriptText.includes("thread_items") ||
          scriptText.includes("like_count") ||
          scriptText.includes("ScheduledServerJS") ||
          scriptText.includes("caption")
        ) {
          jsonScripts++;
          if (scriptText.includes("caption")) {
            const cIdx = scriptText.indexOf("caption");
            console.log(`[Threads Scraper] Script #${jsonScripts} caption snippet:`, scriptText.slice(Math.max(0, cIdx - 150), cIdx + 300));
          }
          try {
            const cleaned = scriptText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;/, "").trim();
            const parsed = JSON.parse(cleaned);
            const topKeys = typeof parsed === "object" && parsed !== null ? (Array.isArray(parsed) ? `Array(${parsed.length})` : Object.keys(parsed).slice(0, 10).join(",")) : typeof parsed;
            console.log(`[Threads Scraper] Candidate script #${jsonScripts} top keys: ${topKeys}`);
            findPostsRecursively(parsed, collectedRaw);
          } catch (e: any) {
            console.log(`[Threads Scraper] Script parse failed:`, e?.message?.slice(0, 100));
          }
        }
      }
      console.log(`[Threads Scraper] Total scripts: ${totalScripts}, candidate scripts: ${jsonScripts}, collectedRaw: ${collectedRaw.length}`);

      if (collectedRaw.length > 0) {
        break; // Successfully extracted posts from the first URL
      }
    } catch (err: any) {
      console.error("[Threads Scraper] Fetch error:", err?.message || err);
      if (err.message && (err.message.includes("Giriş Yap") || err.message.includes("oturum") || err.message.includes("sessionid") || err.message.includes("Cookie"))) {
        throw err;
      }
    }
  }

  if (collectedRaw.length === 0 && lastStatus !== 200) {
    throw new Error(`Threads sayfası yanıt vermedi (HTTP ${lastStatus}).`);
  }

  const posts: CrawledPost[] = [];
  const seenIds = new Set<string>();

  for (const raw of collectedRaw) {
    const post = parseThreadPost(raw);
    if (!post || !post.text) continue;
    if (seenIds.has(post.id)) continue;
    seenIds.add(post.id);
    posts.push(post);
  }

  console.log(`[Threads Scraper] Found ${posts.length} organic posts for "${cleanTag}"`);

  // Sort strictly by organic likes descending
  return posts.sort((a, b) => b.metrics.likes - a.metrics.likes).slice(0, limit);
}


/**
 * Searches X (Twitter) using an authentic user auth_token.
 * Uses min_faves operator to get organic viral tweets.
 */
export async function searchXWithSession({
  query,
  minLikes = 25,
  limit = 20,
  xAuthToken,
  xCt0,
}: {
  query: string;
  minLikes?: number;
  limit?: number;
  xAuthToken: string;
  xCt0?: string;
}): Promise<CrawledPost[]> {
  if (!xAuthToken) {
    throw new Error("X (Twitter) auth_token tanımlı değil.");
  }

  const cleanTag = query.trim().replace(/^#/, "");
  const fullQuery = `#${cleanTag} min_faves:${minLikes} -is:retweet`;

  // Public client bearer token from X/Twitter's public web bundle (used by public clients, not a private secret)
  const bearer =
    "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

  const variables = {
    rawQuery: fullQuery,
    count: limit,
    querySource: "typed_query",
    product: "Top",
  };
  const features = {
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const candidateHashes = [
    "1BP5aKg8NvTNvRCyyCyq8g",
    "flaR-PUMshxFWZWPNpq4zA",
    "UN1LuMVvlRz1ApBtWWAbDg",
  ];

  let lastStatus = 404;
  let data: any = null;

  for (const hash of candidateHashes) {
    const url = new URL(`https://x.com/i/api/graphql/${hash}/SearchTimeline`);
    url.searchParams.set("variables", JSON.stringify(variables));
    url.searchParams.set("features", JSON.stringify(features));

    const cookieHeader = `auth_token=${xAuthToken.trim()}; ct0=${(xCt0 || "").trim()}`;

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          authorization: bearer,
          cookie: cookieHeader,
          "x-csrf-token": (xCt0 || "").trim(),
          "x-twitter-active-user": "yes",
          "x-twitter-client-language": "tr",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      });

      lastStatus = res.status;
      if (res.ok) {
        data = await res.json().catch(() => null);
        if (data) break;
      }
    } catch {
      // try next hash
    }
  }

  if (!data) {
    if (lastStatus === 401 || lastStatus === 403) {
      throw new Error("X auth_token çerezinin süresi dolmuş veya geçersiz.");
    }
    throw new Error(
      `X (Twitter) arama servisinin iç GraphQL hash'i güncelleniyor (HTTP ${lastStatus}). Keşfet sekmesinde platformu "Threads" seçerek arama yapabilirsiniz.`
    );
  }

  const posts: CrawledPost[] = [];

  const instructions =
    data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];

  for (const inst of instructions) {
    const entries = inst?.entries ?? (inst?.entry ? [inst.entry] : []);
    for (const entry of entries) {
      const itemContent = entry?.content?.itemContent;
      const tweetResult = itemContent?.tweet_results?.result;
      const tweet = tweetResult?.tweet ?? tweetResult;
      if (!tweet || !tweet.legacy) continue;

      const legacy = tweet.legacy;
      const userResult = tweet?.core?.user_results?.result?.legacy ?? {};

      const likes = Number(legacy.favorite_count || 0);
      const replies = Number(legacy.reply_count || 0);
      const reposts = Number(legacy.retweet_count || 0);
      const views = Number(tweet?.views?.count || 0);

      const username = userResult.screen_name || "x_user";
      const id = tweet.rest_id || legacy.id_str;

      posts.push({
        id: `x-${id}`,
        platform: "x",
        text: legacy.full_text || "",
        author: {
          username,
          name: userResult.name,
          avatarUrl: userResult.profile_image_url_https,
          verified: !!userResult.verified,
        },
        metrics: {
          likes,
          replies,
          reposts,
          views: views > 0 ? views : undefined,
        },
        permalink: `https://x.com/${username}/status/${id}`,
        timestamp: legacy.created_at ? new Date(legacy.created_at).toISOString() : new Date().toISOString(),
      });
    }
  }

  return posts.sort((a, b) => b.metrics.likes - a.metrics.likes);
}
