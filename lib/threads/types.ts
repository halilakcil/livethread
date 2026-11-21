export interface ThreadsUser {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
}

export interface PostMetrics {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

export type MediaType = "TEXT_POST" | "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "AUDIO" | "REPOST_FACADE" | string;

export interface ThreadPost {
  id: string;
  text?: string;
  timestamp: string;
  permalink?: string;
  media_type?: MediaType;
  media_product_type?: string;
  username?: string;
  is_verified?: boolean;
  /** Available on direct replies from Threads reply/conversation endpoints. */
  profile_picture_url?: string;
  has_replies?: boolean;
  /** Chained replies by the author in a flood/thread */
  replies?: ThreadPost[];
  /** Present for own posts after insights sync; for search results only in mock mode. */
  metrics?: PostMetrics;
  /** Present on conversation replies */
  replied_to?: { id: string };
  root_post?: { id: string };
}

export type SearchMode = "TAG" | "KEYWORD";
export type SearchType = "TOP" | "RECENT";

export interface SearchParams {
  q: string;
  searchMode: SearchMode;
  searchType: SearchType;
  limit: number;
  engine?: "meta" | "ai";
}

export interface PublishResult {
  ids: string[];
  permalink?: string;
}

export interface DemographicItem {
  key: string;
  label: string;
  value: number;
  percentage: number;
}

export interface AgeGenderGroup {
  ageGroup: string;
  male: number;
  female: number;
  total: number;
}

export interface FollowerHistoryPoint {
  date: string;
  followers: number;
  change: number;
}

export interface UserAudienceInsights {
  followersCount: number;
  followersTrend?: number;
  engagementPerFollower?: number;
  dailyFollowersGrowth: FollowerHistoryPoint[];
  demographics?: {
    countries: DemographicItem[];
    cities: DemographicItem[];
    ageGender: AgeGenderGroup[];
  };
  hasDemographics: boolean;
  minFollowersReached: boolean;
}

/** Shape of every error returned by our own /api routes. */
export interface ApiErrorBody {
  error: {
    message: string;
    code?: number;
    rateLimited?: boolean;
  };
}
