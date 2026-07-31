import type { IconType } from "react-icons";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: IconType;
};

export default function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  // Backend integration point:
  // - Replace this placeholder with the real feature UI once the
  //   corresponding API/data source is available.
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
          <Icon className="text-2xl" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
        <span className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
          Coming soon
        </span>
      </div>
    </div>
  );
}
