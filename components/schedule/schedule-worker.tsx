"use client";

import * as React from "react";
import { toast } from "sonner";
import { useSchedule } from "@/lib/schedule/store";

export function ScheduleWorker() {
  const checkDuePosts = useSchedule((s) => s.checkDuePosts);

  React.useEffect(() => {
    // Initial check on mount
    checkDuePosts().then((count) => {
      if (count > 0) {
        toast.success(`${count} adet zamanlanmış gönderi Threads'te otomatik yayınlandı!`);
      }
    });

    // Check periodically every 25 seconds
    const interval = setInterval(async () => {
      const count = await checkDuePosts();
      if (count > 0) {
        toast.success(`${count} adet zamanlanmış gönderi Threads'te otomatik yayınlandı!`);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [checkDuePosts]);

  return null;
}
