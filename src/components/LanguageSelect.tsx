"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MdLanguage } from "react-icons/md";

type LanguageOption = {
  id: "en" | "fr" | "es" | "ar";
  label: string;
  flag: string;
};

const OPTIONS: LanguageOption[] = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "fr", label: "French", flag: "🇫🇷" },
  { id: "es", label: "Spanish", flag: "🇪🇸" },
  { id: "ar", label: "Arabic", flag: "🇸🇦" }
];

export default function LanguageSelect() {
  const [open, setOpen] = useState(false);
  const [languageId, setLanguageId] = useState<LanguageOption["id"]>("en");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => OPTIONS.find((o) => o.id === languageId) ?? OPTIONS[0],
    [languageId]
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (e.target instanceof Node && wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--brand-card-1)] px-3 py-2 text-sm text-white shadow-sm hover:bg-[var(--brand-card-2)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MdLanguage className="text-lg" />
        <span className="hidden items-center gap-2 sm:inline-flex">
          <span aria-hidden>{selected.flag}</span>
          <span>{selected.label}</span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-[var(--brand-card-1)] shadow-lg"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setLanguageId(opt.id);
                setOpen(false);
                // Backend/i18n integration point:
                // - Wire this into Next.js i18n routing or your translation layer.
                // - Persist user preference in DB (authenticated) or cookie/localStorage (guest).
              }}
              className="flex w-full items-center gap-2 bg-[var(--brand-card-1)] px-3 py-2 text-left text-sm text-white hover:bg-[var(--brand-card-2)]"
            >
              <span aria-hidden>{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
