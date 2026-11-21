"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound, PlayCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Label, Select } from "@/components/ui/primitives";
import { CredentialsGuide } from "@/components/auth/credentials-guide";
import { validateToken } from "@/lib/api-client";
import { LLM_PROVIDERS, type LlmProvider } from "@/lib/llm/config";
import { useSettings } from "@/lib/store";

export function SecretInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} autoComplete="off" spellCheck={false} className="pr-10 font-mono text-xs" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-fg-subtle hover:text-fg cursor-pointer"
        aria-label={show ? "Hide value" : "Show value"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ThreadsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 192 192" className={className} fill="currentColor" aria-hidden>
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2109 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C77.3795 44.745 61.9845 55.455 54.498 72.825C47.234 89.675 48.496 108.57 58.077 122.95C67.355 136.87 83.255 145.26 101.442 145.26C117.842 145.26 132.842 138.44 142.172 126.68L129.582 116.63C122.562 125.48 111.962 130.26 99.882 130.26C86.722 130.26 74.882 124.08 67.922 113.62C61.422 103.87 60.562 90.75 65.622 79C71.372 65.67 82.882 58.74 97.222 58.74C114.732 58.74 123.632 69.87 124.782 89.75C120.352 87.77 115.532 86.63 110.422 86.63C92.202 86.63 79.462 98.71 79.462 115.24C79.462 129.35 89.702 139.06 103.882 139.06C117.382 139.06 127.342 130.34 131.762 117.96C135.532 119.98 138.862 122.53 141.632 125.59C147.782 115.24 150.992 102.77 150.992 89.24C150.992 89.15 150.992 89.07 150.992 88.98C147.882 89.1 144.732 89.1 141.537 88.9883ZM103.882 125.06C96.962 125.06 91.962 120.24 91.962 113.24C91.962 104.99 98.632 98.63 108.922 98.63C112.562 98.63 116.032 99.37 119.192 100.8C117.152 117.18 111.452 125.06 103.882 125.06Z" />
    </svg>
  );
}

export function SetupScreen() {
  const { connect, enterDemo, setLlm, llmProvider } = useSettings();
  const [token, setToken] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [provider, setProvider] = React.useState<LlmProvider>(llmProvider);
  const [llmKey, setLlmKey] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError("Threads access token gerekli.");
      return;
    }
    setLoading(true);
    try {
      const user = await validateToken(token.trim(), userId.trim() || undefined);
      setLlm({ provider, key: llmKey.trim() });
      const resolvedId = userId.trim() && /^\d+$/.test(userId.trim()) ? userId.trim() : user.id;
      connect({ token: token.trim(), userId: resolvedId, user });
      toast.success(`@${user.username} bağlandı`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token doğrulanamadı.";
      setError(msg);
      toast.error("Bağlantı başarısız", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  function onDemo() {
    if (llmKey.trim()) setLlm({ provider, key: llmKey.trim() });
    enterDemo();
    toast("Demo mod", { description: "Örnek verilerle geziniyorsunuz. İstediğiniz zaman Ayarlar'dan bağlanın." });
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10 animate-rise-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fg text-bg">
            <ThreadsMark className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">LiveThread</h1>
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">
            Threads analitikleri, kitle analizi, viral keşif ve AI stüdyosu — hesabınıza bağlanın veya demo ile gezin.
          </p>
        </div>

        {/* Interactive Step-by-Step Credentials Guide */}
        <CredentialsGuide className="mb-6" />

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-elevated p-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="token">
                Threads Access Token <span className="text-danger">*</span>
              </Label>
              <span className="text-[11px] text-fg-subtle">Meta for Developers</span>
            </div>
            <SecretInput id="token" placeholder="THAA..." value={token} onChange={(e) => setToken(e.target.value)} autoFocus />
            <p className="text-[11px] text-fg-subtle leading-relaxed">
              Gerekli izinler: <code className="font-mono text-fg-muted">threads_basic</code>, <code className="font-mono text-fg-muted">threads_manage_insights</code>, <code className="font-mono text-fg-muted">threads_content_publish</code>, <code className="font-mono text-fg-muted">threads_keyword_search</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="uid">Threads User ID (opsiyonel)</Label>
              <span className="text-[10px] text-fg-subtle">Otomatik</span>
            </div>
            <Input id="uid" placeholder="GET /me ile otomatik çözülür" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <p className="text-[11px] text-fg-subtle">
              Boş bırakabilirsiniz; token doğrulandığında hesabınızın sayısal ID&apos;si otomatik bulunur.
            </p>
          </div>

          <div className="grid grid-cols-[130px_1fr] gap-2 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label htmlFor="provider">LLM Sağlayıcı</Label>
              <Select id="provider" value={provider} onChange={(e) => setProvider(e.target.value as LlmProvider)}>
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="llm">API Key (opsiyonel)</Label>
                <span className="text-[10px] text-brand">AI Stüdyo için</span>
              </div>
              <SecretInput
                id="llm"
                placeholder={LLM_PROVIDERS.find((p) => p.id === provider)?.keyHint}
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="rounded-2xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

          <Button type="submit" size="lg" variant="brand" className="w-full mt-2" loading={loading}>
            <KeyRound className="h-4 w-4" /> Doğrula ve bağlan
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-fg-subtle font-semibold">
          <div className="h-px flex-1 bg-border" /> veya <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" size="lg" className="w-full" onClick={onDemo}>
          <PlayCircle className="h-4 w-4" /> Demo ile devam et (Anahtarsız Gezin)
        </Button>

        <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-fg-subtle">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          Anahtarlar yalnızca bu tarayıcının yerel hafızasında (localStorage) saklanır ve hiçbir sunucuya kaydedilmez.
        </p>
      </div>
    </div>
  );
}
