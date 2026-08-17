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
    "de3648d49bf03dc1e91797d3819e5614a2c7fac3":
      "de3648d49bf03dc1e91797d3819e5614a2c7fac3",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
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
