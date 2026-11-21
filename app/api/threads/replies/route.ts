import { NextResponse } from "next/server";
import { errorResponse, threadsFromRequest } from "@/lib/server/http";
import { mapWithConcurrency } from "@/lib/utils";
import type { ThreadPost } from "@/lib/threads/types";

export const dynamic = "force-dynamic";

export interface TrailMessage {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  isAuthor: boolean;
}

export interface CommentItem {
  id: string;
  postId: string;
  postText: string;
  commentId: string;
  commentText: string;
  username: string;
  timestamp: string;
  permalink?: string;
  likeCount?: number;
  profilePictureUrl?: string;
  isVerified?: boolean;
  // Nested conversation context
  isNestedReply?: boolean;
  repliedToId?: string;
  repliedToText?: string;
  repliedToUsername?: string;
  isReplyToAuthor?: boolean;
  // Full dialogue trail (conversation history from root post down to this reply)
  dialogueTrail?: TrailMessage[];
  // Persistent author reply status directly from Threads
  hasAuthorReplied?: boolean;
  authorReplyText?: string;
  authorReplyTimestamp?: string;
}

function buildDialogueTrail(
  item: ThreadPost,
  post: ThreadPost,
  itemMap: Map<string, ThreadPost>,
  postAuthor: string,
): TrailMessage[] {
  const trail: TrailMessage[] = [];
  const visited = new Set<string>();

  let currId: string | undefined = item.replied_to?.id;
  while (currId && !visited.has(currId) && itemMap.has(currId)) {
    visited.add(currId);
    const parent = itemMap.get(currId)!;
    if (parent.id === post.id) {
      break;
    }
    if (parent.text?.trim() && parent.username) {
      trail.unshift({
        id: parent.id,
        username: parent.username,
        text: parent.text.trim(),
        timestamp: parent.timestamp,
        isAuthor: parent.username.toLowerCase() === postAuthor,
      });
    }
    currId = parent.replied_to?.id;
  }

  // Include the target comment itself at the end of the chronological trail
  trail.push({
    id: item.id,
    username: item.username || "kullanıcı",
    text: (item.text || "").trim(),
    timestamp: item.timestamp,
    isAuthor: (item.username || "").toLowerCase() === postAuthor,
  });

  return trail;
}

/** GET /api/threads/replies — newest incoming comments across recent posts */
export async function GET(req: Request) {
  try {
    const client = threadsFromRequest(req);
    // Identify logged-in creator username
    const me = await client.getMe().catch(() => null);
    const myUsername = (me?.username || "").toLowerCase();

    // Pull a wider recent window so comments on slightly older viral posts still appear.
    const posts = await client.getMyThreads(50);
    const withReplies = posts.filter((p) => p.has_replies);
    // Prefer posts that declare replies, but also probe the newest posts in case has_replies lags.
    const recentProbe = posts.slice(0, 20);
    const candidates = Array.from(
      new Map([...withReplies, ...recentProbe].map((p) => [p.id, p])).values(),
    ).slice(0, 35);

    const comments: CommentItem[] = [];
    await mapWithConcurrency(candidates, 5, async (post: ThreadPost) => {
      try {
        const conversation = await client.getThreadConversation(post.id, undefined, {
          newestFirst: true,
          maxItems: 60,
        });
        if (!conversation || conversation.length === 0) return;

        const postAuthor = (post.username || myUsername || "").toLowerCase();
        const itemMap = new Map<string, ThreadPost>();
        itemMap.set(post.id, post);
        for (const item of conversation) {
          itemMap.set(item.id, item);
        }

        // Identify all replies by the author in this thread
        const authorReplies = conversation.filter(
          (item) => item.username && item.username.toLowerCase() === postAuthor,
        );

        for (const item of conversation) {
          if (!item.username || !item.text?.trim()) continue;
          const itemUser = item.username.toLowerCase();
          // Skip comments made by the creator themselves
          if (itemUser === postAuthor) continue;

          // Find if this comment is replying to another comment or to creator's reply
          const parentId = item.replied_to?.id;
          const parentItem = parentId ? itemMap.get(parentId) : null;

          const isNestedReply = Boolean(parentId && parentId !== post.id);
          const isReplyToAuthor = Boolean(
            parentItem && parentItem.username?.toLowerCase() === postAuthor,
          );

          let repliedToText = "";
          let repliedToUsername = "";

          if (parentItem) {
            repliedToText = parentItem.text || "";
            repliedToUsername = parentItem.username || "";
          } else if (isNestedReply) {
            repliedToText = post.text || "";
            repliedToUsername = post.username || "";
          }

          // Check if author has already replied to this specific comment
          const myReply = authorReplies.find((r) => r.replied_to?.id === item.id);
          const dialogueTrail = buildDialogueTrail(item, post, itemMap, postAuthor);

          comments.push({
            id: item.id,
            postId: post.id,
            postText: post.text || "",
            commentId: item.id,
            commentText: item.text || "",
            username: item.username,
            timestamp: item.timestamp || new Date().toISOString(),
            permalink: item.permalink,
            likeCount: item.metrics?.likes || 0,
            profilePictureUrl: item.profile_picture_url,
            isVerified: item.is_verified,
            isNestedReply,
            repliedToId: parentId,
            repliedToText,
            repliedToUsername,
            isReplyToAuthor,
            dialogueTrail,
            hasAuthorReplied: Boolean(myReply),
            authorReplyText: myReply?.text,
            authorReplyTimestamp: myReply?.timestamp,
          });
        }
      } catch (err) {
        console.warn(`Could not fetch conversation for post ${post.id}:`, err);
      }
    });

    const unique = Array.from(new Map(comments.map((c) => [c.id, c])).values());
    unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      count: unique.length,
      comments: unique,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
