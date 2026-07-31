import ComingSoon from "@/components/dashboard/ComingSoon";
import { FaBitcoin } from "react-icons/fa6";

export default function CryptoPayoutPage() {
  return (
    <ComingSoon
      title="Crypto Payout"
      description="Withdraw your earnings directly to your crypto wallet."
      icon={FaBitcoin}
    />
  );
}
