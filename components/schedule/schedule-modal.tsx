"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Label } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import { useSchedule } from "@/lib/schedule/store";
import type { RewriteMode } from "@/lib/llm/prompts";

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  posts: string[];
  mode: RewriteMode;
  initialDate?: string;
  onScheduled?: () => void;
}

export function ScheduleModal({ open, onClose, posts, mode, initialDate, onScheduled }: ScheduleModalProps) {
  const schedule = useSchedule((s) => s.schedule);

  function formatForInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const initialParsed = React.useMemo(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) return formatForInput(d);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 30, 0, 0);
    return formatForInput(tomorrow);
  }, [initialDate]);

  const [dateInput, setDateInput] = React.useState(initialParsed);

  React.useEffect(() => {
    setDateInput(initialParsed);
  }, [initialParsed]);

  function setPreset(hours: number, minutes: number, daysOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hours, minutes, 0, 0);
    setDateInput(formatForInput(d));
  }

  function handleSave() {
    const selectedDate = new Date(dateInput);
    if (isNaN(selectedDate.getTime())) {
      toast.error("Geçersiz tarih ve saat seçimi.");
      return;
    }

    if (selectedDate.getTime() <= Date.now()) {
      toast.error("Zamanlama tarihi gelecekte bir an olmalıdır.");
      return;
    }

    schedule({
      mode,
      posts,
      scheduledFor: selectedDate.toISOString(),
    });

    const formattedStr = selectedDate.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    toast.success(`Gönderi ${formattedStr} için zamanlandı!`, {
      description: "Belirlenen vakit geldiğinde Threads hesabınızda otomatik yayınlanacaktır.",
    });

    onClose();
    if (onScheduled) onScheduled();
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
            <CalendarIcon className="h-4 w-4 text-brand" /> Gönderiyi Zamanla
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            İçeriğinizin Threads&apos;te otomatik paylaşılacağı gün ve saati belirleyin.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Hızlı Önerilen Zamanlar</Label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPreset(18, 0, 0)}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2/60 p-2.5 text-left text-zinc-300 hover:border-zinc-500 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <span>Bugün Akşam</span>
              <span className="font-mono text-zinc-400">18:00</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset(21, 0, 0)}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2/60 p-2.5 text-left text-zinc-300 hover:border-zinc-500 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <span>Bugün Gece</span>
              <span className="font-mono text-zinc-400">21:00</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset(9, 30, 1)}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2/60 p-2.5 text-left text-zinc-300 hover:border-zinc-500 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <span>Yarın Sabah</span>
              <span className="font-mono text-zinc-400">09:30</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset(13, 0, 1)}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2/60 p-2.5 text-left text-zinc-300 hover:border-zinc-500 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <span>Yarın Öğle</span>
              <span className="font-mono text-zinc-400">13:00</span>
            </button>
          </div>
        </div>

        {/* Custom Datetime Input */}
        <div className="space-y-1.5">
          <Label htmlFor="custom-datetime" className="text-xs text-zinc-400">
            Özel Tarih & Saat
          </Label>
          <Input
            id="custom-datetime"
            type="datetime-local"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full font-mono text-xs"
          />
        </div>

        <div className="rounded-lg border border-brand/20 bg-brand/10 p-2.5 text-xs text-brand">
          💡 Uygulama açık olduğu sürece arka plandaki servis saati geldiğinde içeriği Meta API üzerinden Threads hesabınızda yayınlayacaktır.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Clock className="h-3.5 w-3.5" /> Bu Saate Zamanla
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
