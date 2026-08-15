import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import "./globals.css";
import { Inter, Poppins } from "next/font/google";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EarnXact",
  description: "Earn real cash completing tasks online",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/images/earnxact-logo.png", type: "image/png" }],
    shortcut: [{ url: "/images/earnxact-logo.png", type: "image/png" }],
    apple: [{ url: "/images/earnxact-logo.png", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "EarnXact",
    statusBarStyle: "black-translucent"
  },
  other: {
    "6a97888e-site-verification": "93488f4f25f0e389b689d733c2cf41e1",
    // this meta is for video ads integration
    "00b7a60029f36f8e26e6340a860e7474dddd884b":
      "00b7a60029f36f8e26e6340a860e7474dddd884b",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen ${poppins.variable} ${inter.variable}`}
        suppressHydrationWarning
      >
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
