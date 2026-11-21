"use client";

import * as React from "react";
import { Copy, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { Button } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";
import { type Draft, useDrafts, useUi } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

type LibraryTab = "drafts" | "imports";

export default function StudioPage() {
  const { t } = useI18n();
  const { drafts, remove: removeDraft } = useDrafts();
  const { imports, removeImport, studioSource, studioDraft, studioPreferredMode, openStudio } = useUi();
  const [libraryTab, setLibraryTab] = React.useState<LibraryTab>("drafts");

  const emptySource = React.useMemo(() => ({ text: "", origin: "manual" as const }), []);
  const pageSource = studioSource ?? emptySource;

  function editDraft(draft: Draft) {
    openStudio(
      draft.source || {
        text: draft.posts.join("\n\n"),
        origin: "draft",
      },
      draft,
    );
  }

  const libraryEmpty =
    libraryTab === "drafts" ? drafts.length === 0 : imports.length === 0;

  return (
    <>
      <PageHeader title={t("studio")} description={t("studioDesc")} />

      <StudioWorkspace source={pageSource} draft={studioDraft} preferredMode={studioPreferredMode} />

      <section className="mt-8">
        <div className="mb-3 flex gap-2">
          {(
            [
              { id: "drafts" as const, label: t("studioDrafts"), count: drafts.length },
              { id: "imports" as const, label: t("studioImports"), count: imports.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLibraryTab(tab.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer",
                libraryTab === tab.id
                  ? "border-transparent bg-accent text-accent-text"
                  : "border-border text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        {libraryEmpty ? (
          <p className="rounded-[1.25rem] border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">
            {libraryTab === "drafts" ? t("studioDraftsEmpty") : t("studioImportsEmpty")}
          </p>
        ) : (
          <div className="rounded-[1.25rem] border border-border bg-elevated overflow-hidden divide-y divide-border">
            {libraryTab === "drafts"
              ? drafts.map((draft) => (
                  <div key={draft.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-semibold",
                            draft.publishedAt ? "bg-success/15 text-success" : "bg-brand/10 text-brand",
                          )}
                        >
                          {draft.publishedAt
                            ? t("studioPublished")
                            : draft.mode === "hooks"
                              ? t("studioModeHooks")
                              : draft.mode === "thread"
                                ? t("studioModeFlood")
                                : t("studioModeRewrite")}
                        </span>
                        <span className="text-fg-subtle">{timeAgo(draft.updatedAt)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-fg">{draft.posts[0]}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void navigator.clipboard.writeText(draft.posts.join("\n\n---\n\n"));
                          toast.success(t("studioCopied"));
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => {
                          removeDraft(draft.id);
                          toast.success(t("studioDraftRemoved"));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => editDraft(draft)}>
                        <Wand2 className="h-3.5 w-3.5" />
                        {t("studioEditDraft")}
                      </Button>
                    </div>
                  </div>
                ))
              : imports.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
                        {item.author && <span className="font-semibold text-fg">@{item.author}</span>}
                        <span>{timeAgo(item.importedAt)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-fg">{item.text}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => removeImport(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="brand" onClick={() => openStudio(item)}>
                        <Wand2 className="h-3.5 w-3.5" />
                        {t("studioRemix")}
                      </Button>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </section>
    </>
  );
}
