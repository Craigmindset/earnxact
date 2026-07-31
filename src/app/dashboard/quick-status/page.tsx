import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdSpeed } from "react-icons/md";

export default function QuickStatusPage() {
  return (
    <ComingSoon
      title="Quick Status"
      description="Get a quick snapshot of your earning activity."
      icon={MdSpeed}
    />
  );
}
