import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Syne } from "next/font/google";
import { AuthGate } from "@/components/auth/auth-gate";
import { ThemeToaster } from "@/components/ui/theme-toaster";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LiveThread — Threads Analytics & Studio",
  description: "Analyze your Threads, discover topics, and write with AI.",
};

const themeBootScript = `
(function(){
  try {
    var raw = localStorage.getItem('livethread.settings');
    var theme = 'dark';
    if (raw) {
      var parsed = JSON.parse(raw);
      var state = parsed && (parsed.state || parsed);
      if (state && state.theme === 'light') theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${manrope.variable} ${syne.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans antialiased">
        <AuthGate>{children}</AuthGate>
        <ThemeToaster />
      </body>
    </html>
  );
}
