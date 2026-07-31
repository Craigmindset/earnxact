import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function SiteLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-[61px]">{children}</main>
      <Footer />
    </div>
  );
}
