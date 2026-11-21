import { fetchMyPosts } from "./api-client";
import type { ThreadPost } from "./threads/types";
import { formatDate, formatNumber } from "./utils";

export function exportPostsToTxt(
  posts: ThreadPost[],
  username = "user",
  scopeLabel = "Mevcut Gönderi Listesi",
  fileSuffix = ""
): void {
  if (!posts || posts.length === 0) return;

  const lines: string[] = [];
  lines.push("================================================================================");
  lines.push(`LIVETHREAD GÖNDERİ DIŞA AKTARIMI (@${username})`);
  lines.push(`Dışa Aktarma Tarihi: ${new Date().toLocaleString("tr-TR")}`);
  lines.push(`Kapsam: ${scopeLabel}`);
  lines.push(`Toplam Gönderi Sayısı: ${posts.length}`);
  lines.push("================================================================================\n");

  posts.forEach((p, idx) => {
    const hasChain = !!(p.replies && p.replies.length > 0);
    const totalChain = 1 + (p.replies ? p.replies.length : 0);
    const chainLabel = hasChain ? ` | (Flood / Zincir: ${totalChain} Gönderi)` : "";

    lines.push("--------------------------------------------------------------------------------");
    lines.push(`[#${idx + 1}] Tarih: ${p.timestamp ? formatDate(p.timestamp) : "—"} | ID: ${p.id}${chainLabel}`);
    if (p.permalink) lines.push(`Bağlantı: ${p.permalink}`);
    if (p.metrics) {
      lines.push(
        `Metrikler: Görüntülenme: ${formatNumber(p.metrics.views)} | Beğeni: ${formatNumber(p.metrics.likes)} | Yorum: ${formatNumber(p.metrics.replies)} | Yeniden Paylaşım: ${formatNumber(p.metrics.reposts)}`
      );
    }
    lines.push("--------------------------------------------------------------------------------");

    if (hasChain) {
      lines.push(`[1/${totalChain}] (Ana Gönderi)`);
      lines.push(p.text ? p.text.trim() : "(Görsel/Medya)");
      lines.push("");

      p.replies!.forEach((reply, rIdx) => {
        lines.push(`[${rIdx + 2}/${totalChain}] (Devam Gönderisi)`);
        lines.push(reply.text ? reply.text.trim() : "(Görsel/Medya)");
        lines.push("");
      });
    } else {
      lines.push(p.text ? p.text.trim() : "(Görsel/Medya gönderisi)");
    }

    lines.push("\n");
  });

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = fileSuffix ? `-${fileSuffix}` : "";
  a.href = url;
  a.download = `threads-${username}${suffix}-${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Fetches the COMPLETE archive of all threads from Meta via pagination and downloads as TXT.
 */
export async function exportAllHistoricalThreads(username = "user"): Promise<number> {
  const res = await fetchMyPosts("all");
  const posts = res.posts || [];
  if (posts.length === 0) {
    throw new Error("Hesaba ait herhangi bir gönderi bulunamadı.");
  }
  exportPostsToTxt(
    posts,
    username,
    `Tüm Tarihsel Paylaşımlar (${posts.length} Gönderi)`,
    "tum-arsiv"
  );
  return posts.length;
}
