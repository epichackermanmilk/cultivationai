import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider }  from "@/lib/auth-context";
import MobileNav        from "@/components/MobileNav";
import ExtensionBanner  from "@/components/ExtensionBanner";
import CookieConsent    from "@/components/CookieConsent";
import MobileAuthGate   from "@/components/MobileAuthGate";
import NativeAuthBridge from "@/components/NativeAuthBridge";
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
  icons: {
    icon: "/MobileAppIcon.png",
    shortcut: "/MobileAppIcon.png",
    apple: "/MobileAppIcon.png",
  },
  appleWebApp: {
    capable: true,
    title: "NovelCodex",
    statusBarStyle: "black-translucent",
  },
  other: {
    "google-adsense-account": "ca-pub-1350938260860067",
  },
};

export const viewport: Viewport = {
  themeColor: "#07060d",
  colorScheme: "dark",
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
      {/* Domain lock — if this page is being served from a scraper/reverse-proxy
          clone on a foreign domain, bounce the visitor to the real site. Protects
          users from credential/payment theft on a mirror and starves the clone of
          traffic. Allows our canonical domains + local dev only. */}
      <Script id="domain-lock" strategy="beforeInteractive">
        {`
          (function(){
            try {
              var h = location.hostname;
              var ok = h === 'novelcodex.org' || h === 'novelcodex.com'
                || h.indexOf('.novelcodex.org') !== -1 || h.indexOf('.novelcodex.com') !== -1
                || h === 'localhost' || h === '127.0.0.1';
              if (!ok) { location.replace('https://novelcodex.org' + location.pathname + location.search); }
            } catch (e) {}
          })();
        `}
      </Script>
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
        {/* Brand + sitelinks-search-box structured data (helps Google show a
            search box + sitelinks under the NovelCodex result). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "NovelCodex",
                  url: SITE_URL,
                  logo: `${SITE_URL}/logo.png`,
                },
                {
                  "@type": "WebSite",
                  name: "NovelCodex",
                  url: SITE_URL,
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/browse?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <ExtensionBanner variant="site" />
            {children}
            <MobileNav />
            <CookieConsent />
            <MobileAuthGate />
            <NativeAuthBridge />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
