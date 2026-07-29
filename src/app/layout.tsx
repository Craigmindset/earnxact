import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`min-h-screen ${poppins.variable} ${inter.variable}`}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 pt-[61px]">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
