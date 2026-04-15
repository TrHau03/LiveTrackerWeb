import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import "@/lib/i18n/i18n";
import { absoluteUrl, siteConfig } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | LiveTracker Web",
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  applicationName: siteConfig.name,
  category: "business",
  creator: siteConfig.name,
  icons: {
    icon: "/favicon.png",
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <ThemeProvider>
          <ReactQueryProvider>
            <SessionProvider>
              <AppShell>{children}</AppShell>
            </SessionProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
