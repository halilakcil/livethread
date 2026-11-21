"use client";

import * as React from "react";
import { Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge, Button, Input, Label } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";
import { useTuning } from "@/lib/tuning/store";
import { cn } from "@/lib/utils";

function getThresholdLabel(val: number, locale: "tr" | "en") {
  if (val < 50) return locale === "en" ? "Loose" : "Gevşek";
  if (val < 70) return locale === "en" ? "Balanced" : "Dengeli";
  if (val < 85) return locale === "en" ? "Focused" : "Odaklı";
  return locale === "en" ? "Strict" : "Katı";
}

export default function TuningPage() {
  const { t, locale } = useI18n();
  const {
    categories,
    setCategoryThreshold,
    setCategoryMinLikes,
    toggleCategory,
    addCategory,
    removeCategory,
    resetDefaults,
  } = useTuning();

  const [searchFilter, setSearchFilter] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newThreshold, setNewThreshold] = React.useState(70);
  const [newMinLikes, setNewMinLikes] = React.useState(10);

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.description.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error(locale === "en" ? "Name required" : "Kategori adı gerekli");
      return;
    }
    addCategory({
      name: newName.trim(),
      description: newDesc.trim() || `${newName} hakkında ilgili paylaşımlar.`,
      threshold: newThreshold,
      minLikes: newMinLikes,
      enabled: true,
      tags: [newName.toLowerCase().replace(/\s+/g, "")],
    });
    setNewName("");
    setNewDesc("");
    setShowAdd(false);
    toast.success(`“${newName.trim()}”`);
  }

  return (
    <>
      <PageHeader
        title={t("tuning")}
        description={t("tuningDesc")}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/discover">
              <Button size="sm" variant="outline">
                {t("testInDiscover")}
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                resetDefaults();
                toast.success(t("resetThresholds"));
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("resetThresholds")}
            </Button>
            <Button size="sm" variant="brand" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-3.5 w-3.5" /> {t("addCategory")}
            </Button>
          </div>
        }
      />

      <p className="mb-4 text-sm text-fg-muted">{t("howTuningWorks")}</p>

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder={t("searchCategories")}
          className="pl-9 h-9"
        />
      </div>

      {showAdd && (
        <form onSubmit={handleAddCategory} className="mb-4 rounded-2xl border border-border bg-elevated p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{locale === "en" ? "Name" : "Ad"}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{locale === "en" ? "AI hint" : "AI yönergesi"}</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label>{t("threshold")}</Label>
                <span className="text-xs font-mono font-semibold">%{newThreshold}</span>
              </div>
              <input
                type="range"
                min={20}
                max={95}
                step={5}
                value={newThreshold}
                onChange={(e) => setNewThreshold(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label>{t("minLikes")}</Label>
                <span className="text-xs font-mono font-semibold">{newMinLikes}</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={newMinLikes}
                onChange={(e) => setNewMinLikes(Number(e.target.value))}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" variant="brand">
              {t("addCategory")}
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-border overflow-hidden bg-elevated">
        <div className="hidden sm:grid grid-cols-[1.4fr_0.7fr_1fr_1fr_auto] gap-3 border-b border-border bg-surface-2/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
          <span>{locale === "en" ? "Category" : "Kategori"}</span>
          <span>{locale === "en" ? "Status" : "Durum"}</span>
          <span>{t("threshold")}</span>
          <span>{t("minLikes")}</span>
          <span />
        </div>

        {filteredCategories.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-fg-subtle">—</p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredCategories.map((cat) => (
              <li
                key={cat.id}
                className={cn(
                  "grid gap-3 px-4 py-3.5 sm:grid-cols-[1.4fr_0.7fr_1fr_1fr_auto] sm:items-center",
                  !cat.enabled && "opacity-55",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-fg truncate">{cat.name}</span>
                    <Badge tone="default" className="hidden sm:inline-flex">
                      {getThresholdLabel(cat.threshold, locale === "en" ? "en" : "tr")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted line-clamp-1">{cat.description}</p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer border",
                      cat.enabled
                        ? "bg-success/10 text-success border-success/25"
                        : "bg-surface-2 text-fg-subtle border-border",
                    )}
                  >
                    {cat.enabled ? t("active") : t("inactive")}
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-fg-muted sm:hidden">
                    <span>{t("threshold")}</span>
                    <span className="font-mono font-semibold text-fg">%{cat.threshold}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={20}
                      max={95}
                      step={5}
                      value={cat.threshold}
                      onChange={(e) => setCategoryThreshold(cat.id, Number(e.target.value))}
                      className="w-full accent-brand h-1.5 cursor-pointer"
                    />
                    <span className="hidden sm:inline w-10 text-right text-xs font-mono font-semibold">%{cat.threshold}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-fg-muted sm:hidden">
                    <span>{t("minLikes")}</span>
                    <span className="font-mono font-semibold text-fg">{cat.minLikes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={cat.minLikes}
                      onChange={(e) => setCategoryMinLikes(cat.id, Number(e.target.value))}
                      className="w-full accent-brand h-1.5 cursor-pointer"
                    />
                    <span className="hidden sm:inline w-8 text-right text-xs font-mono">{cat.minLikes}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  {!["bilim", "fizik", "kuantum", "simulasyon"].includes(cat.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        removeCategory(cat.id);
                        toast.success(cat.name);
                      }}
                      className="rounded-full p-2 text-fg-subtle hover:text-danger hover:bg-danger/10 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
