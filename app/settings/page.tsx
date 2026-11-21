"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  LogOut,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { SecretInput } from "@/components/auth/setup-screen";
import { CredentialsGuide } from "@/components/auth/credentials-guide";
import { Badge, Button, Input, Label, Select } from "@/components/ui/primitives";
import { currentAccountId, validateToken } from "@/lib/api-client";
import { clearCachedPosts } from "@/lib/cache";
import { exportAllHistoricalThreads } from "@/lib/export";
import { useI18n } from "@/lib/i18n";
import { LLM_PROVIDERS, type LlmProvider } from "@/lib/llm/config";
import { LIMITS, usageLast24h, useDrafts, useSettings, useUi } from "@/lib/store";
import { cn } from "@/lib/utils";

type SettingsSection = "appearance" | "account" | "search" | "ai" | "usage" | "data";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted leading-relaxed">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[1.25rem] border border-border bg-elevated overflow-hidden", className)}>{children}</div>;
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
      <div>
        <div className="text-sm font-semibold text-fg">{label}</div>
        {hint && <p className="mt-0.5 text-xs text-fg-muted leading-relaxed">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Segment({
  value,
  options,
  onChange,
  tone = "neutral",
}: {
  value: string;
  options: { value: string; label: React.ReactNode }[];
  onChange: (v: string) => void;
  tone?: "neutral" | "brand";
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-xs font-semibold cursor-pointer transition-colors",
            value === o.value
              ? tone === "brand"
                ? "bg-brand text-brand-fg"
                : "bg-accent text-accent-text"
              : "text-fg-subtle hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function QuotaBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="space-y-2 px-4 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono font-semibold tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    threadsToken,
    threadsUserId,
    threadsSessionCookie,
    xAuthToken,
    xCt0,
    user,
    llmProvider,
    llmKey,
    llmModel,
    mockMode,
    searchCalls,
    publishCalls,
    connect,
    setSessionCredentials,
    setLlm,
    setMockMode,
    disconnect,
  } = useSettings();

  const { clear: clearDrafts } = useDrafts();
  const { setRateLimit } = useUi();
  const { t, locale, contentLanguage, setLocale, setContentLanguage } = useI18n();
  const isEn = locale === "en";

  const [section, setSection] = React.useState<SettingsSection>("appearance");
  const [tokenInput, setTokenInput] = React.useState(threadsToken);
  const [userIdInput, setUserIdInput] = React.useState(threadsUserId);
  const [sessionInput, setSessionInput] = React.useState(threadsSessionCookie);
  const [datrInput, setDatrInput] = React.useState("");
  const [xAuthInput, setXAuthInput] = React.useState(xAuthToken);
  const [provider, setProvider] = React.useState<LlmProvider>(llmProvider);
  const [keyInput, setKeyInput] = React.useState(llmKey);
  const [modelInput, setModelInput] = React.useState(llmModel);
  const [savingAuth, setSavingAuth] = React.useState(false);
  const [savingOrganic, setSavingOrganic] = React.useState(false);
  const [savingLlm, setSavingLlm] = React.useState(false);
  const [showStored, setShowStored] = React.useState(false);
  const [showCookieHelp, setShowCookieHelp] = React.useState(false);
  const [downloadingArchive, setDownloadingArchive] = React.useState(false);

  const rawTheme = useSettings((s) => s.theme);
  const theme = rawTheme === "light" ? "light" : "dark";
  const setTheme = useSettings((s) => s.setTheme);
  const searchUsed = usageLast24h(searchCalls);
  const publishUsed = usageLast24h(publishCalls);

  const nav: { id: SettingsSection; label: string }[] = [
    { id: "appearance", label: isEn ? "Appearance" : "Görünüm" },
    { id: "account", label: isEn ? "Threads account" : "Threads hesabı" },
    { id: "search", label: isEn ? "Organic search" : "Organik arama" },
    { id: "ai", label: isEn ? "AI engine" : "Yapay zeka" },
    { id: "usage", label: isEn ? "Usage" : "Kotalar" },
    { id: "data", label: isEn ? "Data & archive" : "Veri & arşiv" },
  ];

  React.useEffect(() => {
    setTokenInput(threadsToken);
    setUserIdInput(threadsUserId);
    setSessionInput(threadsSessionCookie);
    setXAuthInput(xAuthToken);
    setProvider(llmProvider);
    setKeyInput(llmKey);
    setModelInput(llmModel);
  }, [threadsToken, threadsUserId, threadsSessionCookie, xAuthToken, xCt0, llmProvider, llmKey, llmModel]);

  React.useEffect(() => {
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  function copyStoredCookie() {
    if (!threadsSessionCookie) return;
    navigator.clipboard.writeText(threadsSessionCookie);
    toast.success(isEn ? "Cookie copied." : "Çerez panoya kopyalandı.");
  }

  function handleClearOrganic() {
    setSessionCredentials({ threadsSession: "", xAuthToken: "", xCt0: "" });
    setSessionInput("");
    setXAuthInput("");
    toast.success(isEn ? "Session cookies cleared." : "Oturum çerezleri temizlendi.");
  }

  function handleSaveOrganic(e: React.FormEvent) {
    e.preventDefault();
    setSavingOrganic(true);
    let finalSession = sessionInput.trim();
    if (datrInput.trim()) {
      const cleanDatr = datrInput.trim().replace(/^datr=/, "").replace(/;$/, "");
      if (!finalSession.includes("datr=")) {
        finalSession += (finalSession ? "; " : "") + `datr=${cleanDatr}`;
      }
    }
    setSessionCredentials({
      threadsSession: finalSession,
      xAuthToken: xAuthInput.trim(),
      xCt0: xCt0,
    });
    setDatrInput("");
    setSavingOrganic(false);
    toast.success(isEn ? "Search credentials saved." : "Arama bilgileri kaydedildi.");
  }

  async function handleUpdateThreads(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) {
      toast.error(isEn ? "Token is required." : "Token gerekli.");
      return;
    }
    if (tokenInput.includes("sessionid=") || tokenInput.includes(";") || tokenInput.includes("datr=")) {
      toast.error(isEn ? "This looks like a browser cookie." : "Bu bir tarayıcı çerezi gibi görünüyor.", {
        description: isEn
          ? "Paste cookies into the Organic search section instead."
          : "Çerezleri Organik arama bölümüne yapıştırın.",
      });
      return;
    }
    setSavingAuth(true);
    try {
      const validUser = await validateToken(tokenInput.trim(), userIdInput.trim() || undefined);
      const resolvedId = userIdInput.trim() && /^\d+$/.test(userIdInput.trim()) ? userIdInput.trim() : validUser.id;
      connect({ token: tokenInput.trim(), userId: resolvedId, user: validUser });
      toast.success(`@${validUser.username}`);
    } catch (err) {
      toast.error(isEn ? "Validation failed" : "Doğrulama başarısız", {
        description: err instanceof Error ? err.message : "Invalid token",
      });
    } finally {
      setSavingAuth(false);
    }
  }

  function handleSaveLlm(e: React.FormEvent) {
    e.preventDefault();
    setSavingLlm(true);
    setLlm({ provider, key: keyInput.trim(), model: modelInput.trim() || undefined });
    setSavingLlm(false);
    toast.success(isEn ? "AI settings saved." : "AI ayarları kaydedildi.");
  }

  async function handleClearCache() {
    await clearCachedPosts(currentAccountId());
    toast.success(isEn ? "Cache cleared." : "Önbellek temizlendi.");
  }

  function handleClearDrafts() {
    if (confirm(isEn ? "Delete all drafts?" : "Tüm taslaklar silinsin mi?")) {
      clearDrafts();
      toast.success(isEn ? "Drafts removed." : "Taslaklar silindi.");
    }
  }

  function handleDisconnect() {
    if (confirm(isEn ? "Clear all credentials from this browser?" : "Bu tarayıcıdaki tüm bilgiler silinsin mi?")) {
      disconnect();
      setRateLimit(null);
      toast(isEn ? "Disconnected" : "Çıkış yapıldı");
    }
  }

  async function handleDownloadArchive() {
    setDownloadingArchive(true);
    const toastId = toast.loading(t("archiveDownloading"));
    try {
      const count = await exportAllHistoricalThreads(user?.username || "threads-user");
      toast.success(`${t("archiveDone")} (${count})`, { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), { id: toastId });
    } finally {
      setDownloadingArchive(false);
    }
  }

  const cookieBits = [
    { key: "sessionid", ok: threadsSessionCookie.includes("sessionid") },
    { key: "datr", ok: threadsSessionCookie.includes("datr") },
    { key: "ds_user_id", ok: threadsSessionCookie.includes("ds_user_id") },
  ];

  return (
    <>
      <PageHeader title={t("settings")} description={t("settingsDesc")} />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Side nav */}
        <nav className="lg:sticky lg:top-24 lg:w-44 shrink-0">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-left text-sm font-semibold transition-colors cursor-pointer lg:w-full",
                  section === item.id ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2/70 hover:text-fg",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-10">
          {/* Appearance */}
          <Section
            id="appearance"
            title={isEn ? "Appearance" : "Görünüm"}
            description={isEn ? "Theme and languages — only controlled here." : "Tema ve diller yalnızca burada."}
          >
            <Panel>
              <Row label={t("uiTheme")}>
                <Segment
                  value={theme}
                  onChange={(v) => {
                    setTheme(v === "light" ? "light" : "dark");
                    toast.success(t("themeApplied"));
                  }}
                  options={[
                    { value: "dark", label: (<><Moon className="h-3.5 w-3.5" />{t("dark")}</>) },
                    { value: "light", label: (<><Sun className="h-3.5 w-3.5" />{t("light")}</>) },
                  ]}
                />
              </Row>
              <Row label={t("uiLanguage")} hint={isEn ? "Labels and navigation." : "Menü ve arayüz metinleri."}>
                <Segment
                  value={locale}
                  onChange={(v) => {
                    setLocale(v === "en" ? "en" : "tr");
                    toast.success(t("localeSaved"));
                  }}
                  options={[
                    { value: "tr", label: t("turkish") },
                    { value: "en", label: t("english") },
                  ]}
                />
              </Row>
              <Row label={t("aiContentLanguage")} hint={t("aiContentLanguageDesc")}>
                <Segment
                  tone="brand"
                  value={contentLanguage}
                  onChange={(v) => {
                    setContentLanguage(v === "en" ? "en" : "tr");
                    toast.success(t("localeSaved"));
                  }}
                  options={[
                    { value: "tr", label: t("turkish") },
                    { value: "en", label: t("english") },
                  ]}
                />
              </Row>
              <Row
                label={isEn ? "Demo mode" : "Demo modu"}
                hint={isEn ? "Explore with sample data, no API spend." : "Örnek veriyle gez, API harcama."}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={mockMode ? "warning" : "default"}>{mockMode ? t("active") : t("inactive")}</Badge>
                  <Button
                    size="sm"
                    variant={mockMode ? "primary" : "outline"}
                    onClick={() => {
                      setMockMode(!mockMode);
                      toast.success(mockMode ? (isEn ? "Live API" : "Canlı API") : (isEn ? "Demo on" : "Demo açık"));
                    }}
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    {mockMode ? (isEn ? "Switch to live" : "Canlıya geç") : isEn ? "Enable demo" : "Demo aç"}
                  </Button>
                </div>
              </Row>
            </Panel>
          </Section>

          {/* Threads account */}
          <Section
            id="account"
            title={isEn ? "Threads account" : "Threads hesabı"}
            description={isEn ? "Official Meta access token for analytics and publish." : "Analitik ve yayın için resmi Meta access token."}
          >
            <CredentialsGuide isEn={isEn} activeTopic="threads" className="mb-3" />
            <Panel>
              <form onSubmit={handleUpdateThreads}>
                <Row
                  label={isEn ? "Status" : "Durum"}
                  hint={user && !mockMode ? `@${user.username}` : isEn ? "Not connected" : "Bağlı değil"}
                >
                  {user && !mockMode ? (
                    <Badge tone="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> @{user.username}
                    </Badge>
                  ) : (
                    <Badge>{mockMode ? t("demo") : isEn ? "Disconnected" : "Bağlı değil"}</Badge>
                  )}
                </Row>
                <Row label="Access token">
                  <SecretInput id="token" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="THAA..." />
                </Row>
                <Row label="User ID" hint={isEn ? "Optional — auto via GET /me" : "İsteğe bağlı — GET /me ile otomatik"}>
                  <Input id="userId" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} placeholder="…" />
                </Row>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                  <Button type="submit" size="sm" variant="brand" loading={savingAuth}>
                    <KeyRound className="h-3.5 w-3.5" />
                    {isEn ? "Validate & save" : "Doğrula ve kaydet"}
                  </Button>
                  {threadsToken && (
                    <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={handleDisconnect}>
                      <LogOut className="h-3.5 w-3.5" />
                      {isEn ? "Disconnect" : "Bağlantıyı kes"}
                    </Button>
                  )}
                </div>
              </form>
            </Panel>
          </Section>

          {/* Organic search */}
          <Section
            id="search"
            title={isEn ? "Organic search" : "Organik arama"}
            description={
              isEn
                ? "Browser session cookies for live Discover results."
                : "Keşfet için canlı sonuç çeken oturum çerezleri."
            }
          >
            <CredentialsGuide isEn={isEn} activeTopic="cookies" className="mb-3" />
            <Panel>
              <Row label={isEn ? "Status" : "Durum"}>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={threadsSessionCookie ? "success" : "default"}>
                    Threads · {threadsSessionCookie ? (isEn ? "Set" : "Tanımlı") : isEn ? "Missing" : "Yok"}
                  </Badge>
                  <Badge tone={xAuthToken ? "success" : "default"}>
                    X · {xAuthToken ? (isEn ? "Set" : "Tanımlı") : isEn ? "Optional" : "Opsiyonel"}
                  </Badge>
                </div>
              </Row>

              {threadsSessionCookie && (
                <div className="border-b border-border px-4 py-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{isEn ? "Stored cookie" : "Kayıtlı çerez"}</span>
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowStored((v) => !v)}>
                        {showStored ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {showStored ? (isEn ? "Hide" : "Gizle") : isEn ? "Show" : "Göster"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={copyStoredCookie}>
                        <Copy className="h-3.5 w-3.5" /> {isEn ? "Copy" : "Kopyala"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={handleClearOrganic}>
                        <Trash2 className="h-3.5 w-3.5" /> {isEn ? "Clear" : "Temizle"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cookieBits.map((b) => (
                      <Badge key={b.key} tone={b.ok ? "success" : "danger"}>
                        {b.key}
                      </Badge>
                    ))}
                    <span className="ml-auto text-[11px] font-mono text-fg-subtle">{threadsSessionCookie.length} chars</span>
                  </div>
                  {showStored ? (
                    <pre className="max-h-28 overflow-y-auto rounded-xl bg-surface-2 p-3 font-mono text-[11px] text-fg-muted break-all whitespace-pre-wrap">
                      {threadsSessionCookie}
                    </pre>
                  ) : (
                    <div className="rounded-xl bg-surface-2 px-3 py-2 font-mono text-[11px] text-fg-subtle">
                      {threadsSessionCookie.slice(0, 28)}…{threadsSessionCookie.slice(-12)}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSaveOrganic}>
                <Row label={isEn ? "Threads cookie" : "Threads çerezi"}>
                  <div className="space-y-2">
                    <SecretInput
                      id="threadsSession"
                      name="threads_session_override"
                      autoComplete="new-password"
                      value={sessionInput}
                      onChange={(e) => setSessionInput(e.target.value)}
                      placeholder="Cookie header…"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCookieHelp((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg cursor-pointer"
                    >
                      {isEn ? "How to copy" : "Nasıl kopyalanır"}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showCookieHelp && "rotate-180")} />
                    </button>
                    {showCookieHelp && (
                      <ol className="list-decimal space-y-1 pl-4 text-xs text-fg-muted leading-relaxed">
                        <li>
                          {isEn ? "Open" : "Aç"} <strong>threads.net</strong> → F12 → Network
                        </li>
                        <li>{isEn ? "Refresh (F5), click the top threads.net request." : "Yenile (F5), üstteki threads.net isteğine tıkla."}</li>
                        <li>
                          {isEn ? "Request Headers → Cookie → Copy value." : "Request Headers → Cookie → Değeri kopyala."}
                        </li>
                      </ol>
                    )}
                  </div>
                </Row>
                <Row label="datr" hint={isEn ? "Optional device cookie" : "İsteğe bağlı cihaz çerezi"}>
                  <SecretInput
                    id="threadsDatr"
                    name="threads_datr_override"
                    autoComplete="new-password"
                    value={datrInput}
                    onChange={(e) => setDatrInput(e.target.value)}
                    placeholder="datr=…"
                  />
                </Row>
                <Row label="X auth_token" hint={isEn ? "Optional" : "İsteğe bağlı"}>
                  <SecretInput
                    id="xAuth"
                    name="x_auth_override"
                    autoComplete="new-password"
                    value={xAuthInput}
                    onChange={(e) => setXAuthInput(e.target.value)}
                    placeholder="auth_token…"
                  />
                </Row>
                <div className="flex flex-wrap justify-end gap-2 px-4 py-4">
                  {threadsSessionCookie && (
                    <Button type="button" variant="outline" size="sm" onClick={handleClearOrganic}>
                      {isEn ? "Clear all" : "Tümünü temizle"}
                    </Button>
                  )}
                  <Button type="submit" size="sm" variant="brand" loading={savingOrganic}>
                    {isEn ? "Save credentials" : "Bilgileri kaydet"}
                  </Button>
                </div>
              </form>
            </Panel>
          </Section>

          {/* AI */}
          <Section
            id="ai"
            title={isEn ? "AI engine" : "Yapay zeka"}
            description={isEn ? "Provider key for Studio, strategy, and replies." : "Stüdyo, strateji ve yanıtlar için sağlayıcı anahtarı."}
          >
            <CredentialsGuide isEn={isEn} activeTopic="llm" className="mb-3" />
            <Panel>
              <form onSubmit={handleSaveLlm}>
                <Row label={isEn ? "Provider" : "Sağlayıcı"}>
                  <Select
                    id="provider"
                    value={provider}
                    onChange={(e) => {
                      const nextP = e.target.value as LlmProvider;
                      setProvider(nextP);
                      setModelInput(LLM_PROVIDERS.find((p) => p.id === nextP)?.defaultModel || "");
                    }}
                  >
                    {LLM_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="API key">
                  <SecretInput
                    id="apiKey"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={LLM_PROVIDERS.find((p) => p.id === provider)?.keyHint}
                  />
                </Row>
                <Row label={isEn ? "Model" : "Model"} hint={isEn ? "Leave blank for default" : "Varsayılan için boş bırak"}>
                  <Input id="model" value={modelInput} onChange={(e) => setModelInput(e.target.value)} placeholder="…" />
                </Row>
                <div className="flex justify-end px-4 py-4">
                  <Button type="submit" size="sm" variant="brand" loading={savingLlm}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {isEn ? "Save AI settings" : "AI ayarlarını kaydet"}
                  </Button>
                </div>
              </form>
            </Panel>
          </Section>

          {/* Usage */}
          <Section
            id="usage"
            title={isEn ? "Usage" : "Kotalar"}
            description={isEn ? "Local 24h Threads rate tracking." : "Yerel 24 saatlik Threads kota takibi."}
          >
            <Panel>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-fg-subtle">
                <ShieldAlert className="h-3.5 w-3.5 text-warning" />
                {isEn ? "Tracked in this browser only" : "Yalnızca bu tarayıcıda tutulur"}
              </div>
              <QuotaBar
                label={isEn ? "Searches" : "Aramalar"}
                used={searchUsed}
                limit={LIMITS.search}
                color="bg-sky-500"
              />
              <div className="border-t border-border">
                <QuotaBar
                  label={isEn ? "Publishes" : "Paylaşımlar"}
                  used={publishUsed}
                  limit={LIMITS.publish}
                  color="bg-brand"
                />
              </div>
            </Panel>
          </Section>

          {/* Data */}
          <Section
            id="data"
            title={isEn ? "Data & archive" : "Veri & arşiv"}
            description={isEn ? "Export and clear local storage." : "Dışa aktar ve yerel veriyi temizle."}
          >
            <Panel>
              <Row label={t("downloadArchive")} hint={t("downloadArchiveDesc")}>
                <Button size="sm" variant="brand" loading={downloadingArchive} onClick={handleDownloadArchive}>
                  <Download className="h-3.5 w-3.5" />
                  {t("downloadArchive")}
                </Button>
              </Row>
              <Row
                label={isEn ? "Local cache" : "Yerel önbellek"}
                hint={isEn ? "Metrics stay in IndexedDB on this device." : "Metrikler bu cihazın IndexedDB’sinde."}
              >
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={handleClearCache}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isEn ? "Clear posts cache" : "Gönderi önbelleğini temizle"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleClearDrafts}>
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    {isEn ? "Delete drafts" : "Taslakları sil"}
                  </Button>
                </div>
              </Row>
              <Row label={isEn ? "Reset session" : "Oturumu sıfırla"}>
                <Button size="sm" variant="danger" onClick={handleDisconnect}>
                  <LogOut className="h-3.5 w-3.5" />
                  {isEn ? "Clear credentials & sign out" : "Bilgileri sil ve çık"}
                </Button>
              </Row>
            </Panel>
            <p className="flex items-start gap-2 px-1 text-xs text-fg-subtle">
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {isEn
                ? "Nothing is stored on a server. Keys and drafts stay in your browser."
                : "Sunucuya kayıt yok. Anahtarlar ve taslaklar tarayıcınızda kalır."}
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
