import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdSupportAgent } from "react-icons/md";

export default function SupportPage() {
  return (
    <ComingSoon
      title="Support"
      description="Reach out to our support team for help."
      icon={MdSupportAgent}
    />
  );
}
