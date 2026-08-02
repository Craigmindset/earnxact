"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MdClose } from "react-icons/md";

type LegalPageOverlayProps = {
  title: string;
  children: ReactNode;
};

export default function LegalPageOverlay({ title, children }: LegalPageOverlayProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--brand-black)]">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--brand-smoky-white)] transition hover:bg-white/10"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-white/70">
          {children}
        </div>
      </div>
    </div>
  );
}
