import Image from "next/image";
import { MdBolt, MdTrendingUp } from "react-icons/md";
import { TASK_CLASSES } from "@/components/dashboard/task-class-data";
import { CURRENCY_SYMBOL } from "@/lib/currency";

export default function EarnPassPage() {
  // Backend integration point:
  // - Wire each "Get" action into your task-class registration/payment flow.
  // - Reflect the user's active task class here once registration succeeds.
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <Image
          src="/images/earnpass-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
            <MdBolt className="text-sm" />
            Unlock higher payouts
          </div>

          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white md:text-4xl">
            Level up your EarnPass and earn bigger, faster.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Choose a task class that matches your ambition. Higher classes
            unlock premium tasks, priority payouts and exclusive rewards.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TASK_CLASSES.map((taskClass) => {
          const Icon = taskClass.icon;

          return (
            <div
              key={taskClass.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]">
                  <Icon className="text-xl" />
                </div>

                <div className="mt-4 text-sm font-semibold text-white">
                  {taskClass.name}
                </div>

                {taskClass.amount !== null ? (
                  <>
                    <div className="mt-2 text-2xl font-semibold text-[var(--brand-gold)]">
                      {CURRENCY_SYMBOL}
                      {taskClass.amount.toLocaleString()}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-white/60">
                      {taskClass.description}
                    </p>
                  </>
                ) : (
                  <div className="mt-2 text-sm font-medium text-white/50">
                    {taskClass.description}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!taskClass.available}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-smoky-white)] px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {taskClass.available && <MdTrendingUp className="text-base" />}
                {taskClass.available ? "Get" : "Unavailable"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
