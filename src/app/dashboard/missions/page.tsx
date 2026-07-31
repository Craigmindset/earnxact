import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdFlag } from "react-icons/md";

export default function MissionsPage() {
  return (
    <ComingSoon
      title="Missions"
      description="Finish missions to unlock bonus rewards."
      icon={MdFlag}
    />
  );
}
