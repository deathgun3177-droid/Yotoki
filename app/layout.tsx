import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "YotoKi | Монгол хадмалтай аниме, кино",
  description: "Монгол хэрэглэгчдэд зориулсан хөнгөн, орчин үеийн аниме болон кино үзэх платформ.",
  icons: {
    icon: "/images/yotoki-logo.png",
    apple: "/images/yotoki-logo.png"
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
