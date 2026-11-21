"use client";

import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Button } from "@/components/ui/primitives";
import { exportAllHistoricalThreads, exportPostsToTxt } from "@/lib/export";
import type { ThreadPost } from "@/lib/threads/types";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  currentPosts: ThreadPost[];
}

export function ExportModal({
  open,
  onClose,
  username,
  currentPosts,
}: ExportModalProps) {
  const [downloadingAll, setDownloadingAll] = React.useState(false);

  async function handleDownloadAll() {
    setDownloadingAll(true);
    const toastId = toast.loading("Meta sunucularından tüm Threads sayfaları taranıyor...");
    try {
      const count = await exportAllHistoricalThreads(username || "threads-user");
      toast.success(`Toplam ${count} adet gönderi eksiksiz olarak TXT'ye aktarıldı.`, {
        id: toastId,
      });
      onClose();
    } catch (err: any) {
      toast.error("Tüm gönderiler çekilirken hata oluştu", {
        id: toastId,
        description: err?.message || String(err),
      });
    } finally {
      setDownloadingAll(false);
    }
  }

  function handleDownloadCurrent() {
    exportPostsToTxt(
      currentPosts,
      username || "threads-user",
      `Görüntülenen ${currentPosts.length} Gönderi`,
      "mevcut-liste"
    );
    toast.success(`${currentPosts.length} adet gönderi TXT olarak indirildi.`);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4 bg-surface-2/20">
        <h3 className="font-semibold text-fg text-sm">
          Threads Paylaşımlarını TXT Olarak İndir
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:text-fg cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-3.5">
        {/* Option 1: Full History Archive */}
        <div className="rounded-lg border border-border bg-surface-2/30 p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-zinc-200">
                Tüm Geçmişi İndir (Tam Arşiv)
              </h4>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono">
                Önerilen
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Meta sunucularındaki sayfaları sırayla tarar. Hesabınızın başlangıcından bu yana paylaştığınız tüm gönderileri ve flood zincirlerini tek dosyaya aktarır.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full text-xs h-8.5 justify-center"
            onClick={handleDownloadAll}
            loading={downloadingAll}
          >
            {downloadingAll ? "Arşiv taranıyor..." : "Tüm Gönderileri Çek ve İndir"}
          </Button>
        </div>

        {/* Option 2: Current Loaded Posts */}
        <div className="rounded-lg border border-border/80 bg-surface/50 p-4 space-y-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-xs text-zinc-300">
              Mevcut Listeyi İndir
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Şu an ekranda listelenen <strong>{currentPosts.length}</strong> gönderiyi anında kaydeder.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full text-xs h-8.5 justify-center font-normal"
            onClick={handleDownloadCurrent}
            disabled={downloadingAll || currentPosts.length === 0}
          >
            Mevcut Listeyi İndir ({currentPosts.length})
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
