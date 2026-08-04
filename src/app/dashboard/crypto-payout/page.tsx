import type { IconType } from "react-icons";
import { SiBitcoin, SiDogecoin, SiEthereum, SiLitecoin } from "react-icons/si";

type CryptoOption = {
  id: string;
  name: string;
  ticker: string;
  icon: IconType;
  gradient: string;
  priceRange: string;
  available: boolean;
};

const CRYPTO_OPTIONS: CryptoOption[] = [
  {
    id: "litecoin",
    name: "Litecoin",
    ticker: "LTC",
    icon: SiLitecoin,
    gradient: "from-slate-700 via-slate-800 to-black",
    priceRange: "$ 3.00-25.00",
    available: true
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    ticker: "BTC",
    icon: SiBitcoin,
    gradient: "from-amber-700 via-amber-900 to-black",
    priceRange: "$ 5.00-25.00",
    available: false
  },
  {
    id: "ethereum",
    name: "Ethereum",
    ticker: "ETH",
    icon: SiEthereum,
    gradient: "from-slate-500 via-slate-700 to-black",
    priceRange: "$ 5.00-25.00",
    available: false
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    ticker: "DOGE",
    icon: SiDogecoin,
    gradient: "from-yellow-600 via-yellow-800 to-black",
    priceRange: "$ 5.00-25.00",
    available: false
  }
];

export default function CryptoPayoutPage() {
  // Backend integration point:
  // - Wire each available package into your crypto payout/withdrawal flow.
  // - Unlock the "SOON" options once those providers go live.
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div id="crypto-payouts">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-gold)]">
          CRYPTO PAYOUT
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
          Crypto Payout Packages
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Choose from available crypto payout packages.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CRYPTO_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <div
                key={option.id}
                className={`overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition ${
                  option.available
                    ? "cursor-pointer hover:border-[var(--brand-gold)]/40"
                    : "cursor-not-allowed opacity-70"
                }`}
              >
                <div
                  className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${option.gradient}`}
                >
                  {!option.available && (
                    <div className="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                      🔒 Soon
                    </div>
                  )}
                  <Icon className="text-5xl text-white" />
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white">
                    {option.name}
                  </h3>
                  <span className="mt-1 block text-sm font-semibold text-[var(--brand-gold)]">
                    {option.priceRange}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs leading-relaxed text-white/40">
          The merchants represented are not sponsors of the rewards. The
          logos and other identifying marks attached are trademarks of and
          owned by each represented company and/or its affiliates. Please
          visit each company&apos;s website for additional terms and
          conditions.
        </p>
      </div>
    </div>
  );
}
