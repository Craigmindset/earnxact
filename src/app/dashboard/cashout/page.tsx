import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdOutlinePayments } from "react-icons/md";

export default function CashoutPage() {
  return (
    <ComingSoon
      title="Cash out"
      description="Withdraw your earnings to your preferred payout method."
      icon={MdOutlinePayments}
    />
  );
}
