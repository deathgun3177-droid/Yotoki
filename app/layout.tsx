import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoto-ki.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lumi+ | Монгол хадмалтай аниме, кино",
  description: "Монгол хэрэглэгчдэд зориулсан хөнгөн, орчин үеийн аниме болон кино үзэх платформ.",
  applicationName: "Lumi+",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/images/lumi-icon-192.png",
    apple: "/images/lumi-icon-192.png"
  },
  openGraph: {
    title: "Lumi+",
    description: "Монгол хадмалтай аниме, кино үзэх хөнгөн платформ.",
    url: siteUrl,
    siteName: "Lumi+",
    images: [
      {
        url: "/images/lumi-logo.png",
        width: 1200,
        height: 630,
        alt: "Lumi+ logo"
      }
    ],
    locale: "mn_MN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumi+",
    description: "Монгол хадмалтай аниме, кино үзэх хөнгөн платформ.",
    images: ["/images/lumi-logo.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
