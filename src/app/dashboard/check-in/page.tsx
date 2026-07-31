import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdEventAvailable } from "react-icons/md";

export default function CheckInPage() {
  return (
    <ComingSoon
      title="Check in"
      description="Check in daily to build your streak and earn bonuses."
      icon={MdEventAvailable}
    />
  );
}
