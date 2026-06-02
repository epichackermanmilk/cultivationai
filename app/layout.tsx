import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider }  from "@/lib/auth-context";
import MobileNav        from "@/components/MobileNav";
import CookieConsent    from "@/components/CookieConsent";
import Script           from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://novelcodex.org";
const SITE_DESC = "Your AI reading companion for xianxia, cultivation, and wuxia web novels. Ask anything about any story — characters, plot, lore, cultivation systems — and get instant, accurate answers.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NovelCodex — AI companion for web novels",
    template: "%s — NovelCodex",
  },
  description: SITE_DESC,
  applicationName: "NovelCodex",
  openGraph: {
    type: "website",
    siteName: "NovelCodex",
    title: "NovelCodex — AI companion for web novels",
    description: SITE_DESC,
    url: SITE_URL,
    // og image is supplied automatically by app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "NovelCodex — AI companion for web novels",
    description: SITE_DESC,
  },
  other: {
    "google-adsense-account": "ca-pub-1350938260860067",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Consent Mode v2 — default everything DENIED until the user accepts the
          cookie banner. Must run before GA / AdSense so they respect the choice. */}
      <Script id="consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>
      {/* Google AdSense */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1350938260860067"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-RN9SR0DZ6R"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', 'G-RN9SR0DZ6R');
        `}
      </Script>
      <body className="min-h-full">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <MobileNav />
            <CookieConsent />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
