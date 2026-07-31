import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdAccountBalanceWallet } from "react-icons/md";

export default function WalletPage() {
  return (
    <ComingSoon
      title="Wallet"
      description="View your balance and transaction history."
      icon={MdAccountBalanceWallet}
    />
  );
}
