"use client";

import * as React from "react";
import {
  KeyRound,
  Sparkles,
  Cookie,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Copy,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export interface CredentialsGuideProps {
  defaultOpen?: boolean;
  activeTopic?: "threads" | "llm" | "cookies";
  className?: string;
  isEn?: boolean;
}

export function CredentialsGuide({
  defaultOpen = false,
  activeTopic = "threads",
  className,
  isEn = false,
}: CredentialsGuideProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [topic, setTopic] = React.useState<"threads" | "llm" | "cookies">(activeTopic);

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(isEn ? `Copied: ${label}` : `Kopyalandı: ${label}`);
  };

  const PERMISSIONS = [
    {
      scope: "threads_basic",
      label: isEn ? "Basic profile & posts" : "Profil bilgileri ve yayınlanan gönderileri okuma",
      required: true,
    },
    {
      scope: "threads_manage_insights",
      label: isEn ? "Engagement & audience insights" : "Görüntülenme, etkileşim ve takipçi/kitle analitiği",
      required: true,
    },
    {
      scope: "threads_content_publish",
      label: isEn ? "Publish posts and replies" : "Tekli post, flood ve yorum yanıtlama",
      required: true,
    },
    {
      scope: "threads_keyword_search",
      label: isEn ? "Search public topics" : "Genel konu ve etiket aramaları",
      required: true,
    },
  ];

  return (
    <div
      className={cn(
        "rounded-[1.25rem] border border-border bg-surface-2/60 transition-all overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-fg">
              {isEn ? "Setup & Credentials Guide" : "Kurulum ve Anahtar Alma Rehberi"}
            </div>
            <div className="text-[11px] text-fg-subtle">
              {isEn
                ? "Step-by-step instructions for Meta API, AI keys & Cookies"
                : "Meta Threads token'ı, Yapay Zeka ve Çerezlerin adım adım temini"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={open ? "accent" : "default"} className="text-[10px]">
            {open ? (isEn ? "Hide guide" : "Kılavuzu kapat") : isEn ? "Read guide" : "Adım adım rehber"}
          </Badge>
          <ChevronDown className={cn("h-4 w-4 text-fg-subtle transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4 animate-in fade-in duration-200">
          {/* Topic Pills */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-surface-1 border border-border/80">
            <button
              type="button"
              onClick={() => setTopic("threads")}
              className={cn(
                "flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all cursor-pointer",
                topic === "threads"
                  ? "bg-accent text-accent-text shadow-sm"
                  : "text-fg-subtle hover:text-fg hover:bg-surface-2/50"
              )}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Threads Token
            </button>
            <button
              type="button"
              onClick={() => setTopic("llm")}
              className={cn(
                "flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all cursor-pointer",
                topic === "llm"
                  ? "bg-accent text-accent-text shadow-sm"
                  : "text-fg-subtle hover:text-fg hover:bg-surface-2/50"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              {isEn ? "AI Keys (LLM)" : "Yapay Zeka (AI)"}
            </button>
            <button
              type="button"
              onClick={() => setTopic("cookies")}
              className={cn(
                "flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all cursor-pointer",
                topic === "cookies"
                  ? "bg-accent text-accent-text shadow-sm"
                  : "text-fg-subtle hover:text-fg hover:bg-surface-2/50"
              )}
            >
              <Cookie className="h-3.5 w-3.5 text-warning" />
              {isEn ? "Organic Cookies" : "Organik Çerezler"}
            </button>
          </div>

          {/* TOPIC 1: META THREADS TOKEN */}
          {topic === "threads" && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 flex items-start gap-2.5 text-fg leading-relaxed">
                <Zap className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{isEn ? "Quick Meta Setup:" : "Meta Geliştirici Portalı ile 5 Adımda Bağlanın:"}</span>{" "}
                  {isEn
                    ? "Tokens are generated via Meta's official portal. Follow these exact steps:"
                    : "Threads hesabınızı LiveThread'e bağlamak için aşağıdaki resmi adımları takip edin:"}
                </div>
              </div>

              <ol className="space-y-3 pl-1">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono font-bold text-[11px] text-fg">
                    1
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold text-fg">
                      {isEn ? "Open Meta for Developers portal" : "Meta for Developers portalına gidin"}
                    </p>
                    <p className="text-fg-muted">
                      {isEn
                        ? "Log in with your Facebook/Meta account that controls your Threads profile."
                        : "Threads hesabınızın bağlı olduğu Meta/Instagram hesabınızla oturum açın."}
                    </p>
                    <a
                      href="https://developers.facebook.com/apps/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                    >
                      developers.facebook.com/apps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono font-bold text-[11px] text-fg">
                    2
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold text-fg">
                      {isEn ? "Create App & Add Threads" : "Uygulama Oluşturun ve Threads Ürününü Ekleyin"}
                    </p>
                    <p className="text-fg-muted">
                      {isEn
                        ? 'Click "Create App" → select "Other" → Use case: "Business / Consumer" → Name your app (e.g. LiveThread). Then add the "Threads" product.'
                        : '"Uygulama Oluştur" (Create App) → "Diğer" (Other) seçin. Uygulama adı yazıp oluşturduktan sonra panelden "Threads" ürününü ekleyin.'}
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono font-bold text-[11px] text-fg">
                    3
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold text-fg">
                      {isEn ? "Add Threads Tester Account" : "Threads Test Kullanıcısı Olarak Kendinizi Ekleyin"}
                    </p>
                    <p className="text-fg-muted">
                      {isEn
                        ? 'Under Roles → Roles / "Threads Tester", add your Threads username. Then open Threads app or threads.net/settings/privacy to accept the invite.'
                        : 'Sol menüde Roller / "Threads Test Kullanıcıları" sekmesine gidip Threads kullanıcı adınızı ekleyin ve Threads uygulamanızdan gelen onay bildirimini kabul edin.'}
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono font-bold text-[11px] text-fg">
                    4
                  </span>
                  <div className="space-y-2">
                    <p className="font-semibold text-fg">
                      {isEn ? "Grant the 4 Required Scopes & Generate Token" : "Gerekli 4 İzni Seçin ve Token Üretin"}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {PERMISSIONS.map((p) => (
                        <div
                          key={p.scope}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-2.5 py-1.5 text-[11px]"
                        >
                          <div className="truncate mr-2">
                            <span className="font-mono font-semibold text-fg block truncate">{p.scope}</span>
                            <span className="text-[10px] text-fg-subtle block truncate">{p.label}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => copyText(p.scope, p.scope)}
                            title="Kopyala"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 font-mono font-bold text-[11px] text-fg">
                    5
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold text-fg">
                      {isEn ? "Copy Long-Lived Token & Paste Below" : "Üretilen Token'ı Kopyalayıp Buraya Yapıştırın"}
                    </p>
                    <p className="text-fg-muted">
                      {isEn
                        ? 'Click "Generate Token", complete the authorization pop-up, and paste the resulting string (starts with THAA...) into the Access Token field.'
                        : '"Generate Token" butonuna tıklayıp çıkan ekranda onay verin. Üretilen uzun token metnini (genellikle THAA... ile başlar) buraya yapıştırıp "Doğrula ve bağlan" butonuna basın.'}
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* TOPIC 2: LLM API KEYS */}
          {topic === "llm" && (
            <div className="space-y-3.5 text-xs">
              <p className="text-fg-muted leading-relaxed">
                {isEn
                  ? "An AI API key powers the AI Studio rewriter, hook generator, strategy posts, and inbox smart replies. You only need ONE of the providers below:"
                  : "Yapay zeka anahtarı; AI Stüdyo, kanca analizi, haftalık büyüme stratejisi ve yanıtlama motorunu çalıştırır. Aşağıdaki sağlayıcılardan herhangi birini seçebilirsiniz:"}
              </p>

              <div className="grid gap-2.5">
                {/* Gemini */}
                <div className="rounded-xl border border-brand/30 bg-surface-1 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">Google Gemini</span>
                      <Badge tone="accent" className="text-[10px]">
                        {isEn ? "Recommended · Free Tier" : "Önerilen · Ücretsiz Kota"}
                      </Badge>
                    </div>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                    >
                      {isEn ? "Get Key" : "Key Al"} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-fg-muted text-[11px] leading-relaxed">
                    {isEn
                      ? "Google AI Studio provides a free tier with high speed and large context windows. Recommended model: gemini-3.8-flash."
                      : "Google AI Studio, cömert bir ücretsiz kota sunar. gemini-3.8-flash modeli son derece hızlıdır ve kanca/flood üretiminde harika sonuç verir."}
                  </p>
                </div>

                {/* OpenAI */}
                <div className="rounded-xl border border-border bg-surface-1 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">OpenAI (ChatGPT)</span>
                      <Badge className="text-[10px]">gpt-4o-mini</Badge>
                    </div>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted hover:text-fg hover:underline"
                    >
                      {isEn ? "Get Key" : "Key Al"} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-fg-muted text-[11px] leading-relaxed">
                    {isEn
                      ? "Standard OpenAI developer platform key starting with sk-... Uses gpt-4o-mini for cost-effective, high quality outputs."
                      : "OpenAI Platform üzerinden alınan sk-... ile başlayan anahtar. gpt-4o-mini modeli hem uygun maliyetli hem de etkilidir."}
                  </p>
                </div>

                {/* Anthropic */}
                <div className="rounded-xl border border-border bg-surface-1 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">Anthropic (Claude)</span>
                      <Badge className="text-[10px]">claude-3-5-sonnet</Badge>
                    </div>
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted hover:text-fg hover:underline"
                    >
                      {isEn ? "Get Key" : "Key Al"} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-fg-muted text-[11px] leading-relaxed">
                    {isEn
                      ? "Anthropic Console key starting with sk-ant-... Best-in-class nuance and Turkish fluency with Claude 3.5 Sonnet."
                      : "Anthropic Console üzerinden alınan sk-ant-... anahtarı. Claude 3.5 Sonnet özellikle yaratıcı ve felsefi metinlerde çok güçlüdür."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 3: ORGANIC COOKIES */}
          {topic === "cookies" && (
            <div className="space-y-3.5 text-xs">
              <p className="text-fg-muted leading-relaxed">
                {isEn
                  ? "Organic search allows Discover to pull live viral posts directly from Threads & X without paid Enterprise API tiers. This is 100% optional."
                  : "Organik Arama, Keşfet sayfasında canlı ve viral gönderileri doğrudan Threads & X web arayüzünden çekebilmek için opsiyonel olarak çerez kullanır."}
              </p>

              <div className="space-y-3 pl-1">
                <div className="space-y-1">
                  <div className="font-semibold text-fg flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    {isEn ? "How to copy Threads sessionid:" : "Threads sessionid Çerezi Nasıl Alınır?"}
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-fg-muted text-[11px]">
                    <li>
                      Tarayıcınızda <strong>threads.net</strong> adresini açıp giriş yapın.
                    </li>
                    <li>
                      Klavyeden <strong>F12</strong> (Geliştirici Araçları) tuşuna basın.
                    </li>
                    <li>
                      <strong>Application (Uygulama)</strong> veya <strong>Storage</strong> sekmesini seçin → sol taraftan <strong>Cookies (Çerezler)</strong> → <code>https://www.threads.net</code> tıklayın.
                    </li>
                    <li>
                      Listede <strong>sessionid</strong> anahtarını bulun ve Value (Değer) sütunundaki metni kopyalayın.
                    </li>
                  </ol>
                </div>

                <div className="space-y-1 pt-1 border-t border-border/60">
                  <div className="font-semibold text-fg flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    {isEn ? "How to copy X (Twitter) auth_token (Optional):" : "X (Twitter) auth_token Çerezi Nasıl Alınır? (Opsiyonel)"}
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-fg-muted text-[11px]">
                    <li>
                      Tarayıcınızda <strong>x.com</strong> adresini açıp giriş yapın.
                    </li>
                    <li>
                      <strong>F12</strong> → <strong>Application</strong> → <strong>Cookies</strong> → <code>https://x.com</code> tıklayın.
                    </li>
                    <li>
                      Listede <strong>auth_token</strong> değerini kopyalayıp Ayarlar sayfasındaki alana yapıştırın.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-[11px] text-fg-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
            <span>
              {isEn
                ? "All tokens, keys, and cookies remain exclusively in your local browser storage (localStorage)."
                : "Tüm token, anahtar ve çerezler yalnızca tarayıcınızın yerel hafızasında (localStorage) saklanır."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
