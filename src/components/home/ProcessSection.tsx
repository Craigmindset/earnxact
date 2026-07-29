import {
  MdAccountBalanceWallet,
  MdChecklist,
  MdPersonAddAlt,
} from "react-icons/md";

const steps = [
  {
    n: 1,
    title: "Sign up for free",
    desc: "Create your account in under a minute. No credit card, no commitment - just your email and you're in.",
    Icon: MdPersonAddAlt,
    color: "#5BD147",
    borderColor: "rgba(91, 209, 71, 0.85)",
  },
  {
    n: 2,
    title: "Complete tasks",
    desc: "Browse hundreds of offers - play games, fill surveys, test apps. Pick what fits your time and interests.",
    Icon: MdChecklist,
    color: "#FF9900",
    borderColor: "rgba(255, 153, 0, 0.9)",
  },
  {
    n: 3,
    title: "Cash out",
    desc: "Withdraw to PayPal, crypto, or gift cards the moment you're ready. No waiting periods, no minimums.",
    Icon: MdAccountBalanceWallet,
    color: "#A5A9FF",
    borderColor: "rgba(165, 169, 255, 0.9)",
  },
];

export default function ProcessSection() {
  return (
    <section className="border-t border-white/10 bg-[var(--brand-black)]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        {/* Section Heading */}
        <div className="text-left">
          <div className="text-sm font-bold text-center tracking-[0.12em] text-[var(--brand-gold)]">
            SIMPLE PROCESS
          </div>

          <h2 className="mt-3 text-2xl font-bold text-center tracking-tight text-white md:text-5xl">
            Earn in{" "}
            <span className="text-[var(--brand-gold)]">3 simple steps</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative mt-16 md:mt-20">
          {/* Desktop connecting lines */}
          <div className="pointer-events-none absolute left-[16.5%] right-[16.5%] top-[25px] hidden h-[2px] md:block">
            <div className="h-full w-full bg-gradient-to-r from-[#5BD147] via-[#FF9900] to-[#A5A9FF]" />
          </div>

          <div className="relative grid gap-12 md:grid-cols-3 md:gap-10">
            {steps.map(({ n, title, desc, Icon, color, borderColor }) => (
              <div
                key={n}
                className="relative flex items-start gap-4 md:flex-col md:items-center md:text-center"
              >
                {/* Icon */}
                <div
                  className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-black)] md:h-[56px] md:w-[56px]"
                  style={{
                    border: `3px solid ${borderColor}`,
                    boxShadow: `0 0 20px ${color}12`,
                  }}
                >
                  <Icon
                    className="text-[28px] md:text-[30px]"
                    style={{ color }}
                  />
                </div>

                {/* Number */}
                <div
                  className="relative z-10 mt-4 hidden h-10 w-10 items-center justify-center rounded-full text-sm font-semibold md:flex"
                  style={{
                    color,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: `${color}12`,
                  }}
                >
                  {n}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 text-left md:mt-4 md:max-w-[320px] md:pt-0 md:text-center">
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    {title}
                  </h3>

                  <p className="mt-3 text-base leading-7 text-white/55">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
