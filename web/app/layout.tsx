import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Alerte Marché - Vérificateur de SMS Mobile Money (T-Money & Moov)",
  description: "Vérifiez en quelques secondes si un SMS Mobile Money, bancaire ou de gain est vrai ou si c'est une arnaque.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <a
          href="#contenu-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-background focus:shadow-lg"
        >
          Aller au contenu principal
        </a>
        <SiteHeader />
        <div id="contenu-principal" className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
