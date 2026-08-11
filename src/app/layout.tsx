import type { Metadata } from "next";
import type { ReactNode } from "react";
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
  other: {
    "6a97888e-site-verification": "93488f4f25f0e389b689d733c2cf41e1",
  },
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
      </body>
    </html>
  );
}
