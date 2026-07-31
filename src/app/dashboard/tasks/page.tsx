import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdChecklist } from "react-icons/md";

export default function TasksPage() {
  return (
    <ComingSoon
      title="EarnXact Tasks"
      description="Complete simple tasks and earn cash rewards."
      icon={MdChecklist}
    />
  );
}
